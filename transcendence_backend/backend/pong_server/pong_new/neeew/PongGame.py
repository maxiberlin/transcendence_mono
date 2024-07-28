import time
import queue
import logging
import math
import asyncio

from typing import TypedDict, LiteralString, Literal, Final, get_origin, Callable

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from game.models import GameSchedule, GameResults
from user.models import UserAccount

from ..pong_ball import PongBall
from ..pong_paddle import PongPaddle
from ..pong_settings import ServeMode, PongSettings
from ..game_base_class import GameObjDataClass

from .. import messages_server as msg_server
from .. import messages_client as msg_client
from GameState import GameState
from ActionProcessor import ActionProcessor
from dataclasses import dataclass

logger = logging.getLogger(__name__)
logger.setLevel(logging.CRITICAL)



class GameResultDict(TypedDict):
    schedule_id: int
    player_one_pk: int
    player_two_pk: int
    player_one_score: int
    player_two_score: int
    winner: int | None
    loser: int | None


class PongGame:
    def __init__(self,
                 settings: PongSettings,
                 group_name: str,
                 gameSchedule: GameSchedule | None,
                 channel_alias = None):
        self.settings = settings
        self.group_name = group_name
        self.court = GameObjDataClass(
            scaleX=settings.width,
            scaleY=settings.height,
            xU=0,
            yU=settings.border_size,
            wU=settings.width,
            hU=settings.height - 2 * settings.border_size
        )
        self.ball = PongBall(settings, GameObjDataClass(
            scaleX=settings.width,
            scaleY=settings.height,
            xU=0,
            yU=settings.border_size,
            wU=settings.width,
            hU=settings.height - 2 * settings.border_size
        ))
        self.paddle_left = PongPaddle(PongPaddle.PaddlePos.LEFT, settings, self.court)
        self.paddle_right = PongPaddle(PongPaddle.PaddlePos.RIGHT, settings, self.court)

        self.game_state = GameState(self.ball, self.paddle_left, self.paddle_right)
        self.action_processor = ActionProcessor()

        self.channel_layer = get_channel_layer() if not channel_alias else get_channel_layer(alias=channel_alias)
        if not self.channel_layer:
            raise RuntimeError("Channel layer not found")

        self.gameResults: GameResultDict = {
            "schedule_id": gameSchedule.pk if gameSchedule else 0,
            "player_one_pk": gameSchedule.player_one.pk if gameSchedule else 0,
            "player_two_pk": gameSchedule.player_two.pk if gameSchedule else 0,
            "player_one_score": 0,
            "player_two_score": 0,
            "winner": None,
            "loser": None
        }

        self.running = False
        self.paused = False
        self.user_disconnected = False
        self.lastone_ms = 0
        self.tick_frame: int = 0
        self.background_msg_send_tasks: set[asyncio.Task] = set()
        self.game_loop_task: asyncio.Task | None = None

        self.game_start_time_unix_sec = time.time() * 1000
        self.game_start_time_perf_sec: float = time.perf_counter()
        self.last_game_update_perf_sec = self.game_start_time_perf_sec

    def handle_player_action(self, user_id: int | None, new_y: float | None, action: msg_client.ClientMoveDirection | None, timestamp_sec: float | None):
        if not timestamp_sec:
            raise msg_server.CommandError("invalid timestamp_sec", msg_server.WebsocketErrorCode.INVALID_COMMAND)
        
        self.action_processor.add_action(user_id, new_y, action, timestamp_sec, self.gameResults)

    async def __game_loop(self) -> None:
        self.running = True
        tick_duration_sec: float = 1 / self.settings.tick_rate
        sleep_duration_sec: float = tick_duration_sec
        start_time_sec = self.last_game_update_perf_sec = self.game_start_time_perf_sec = time.perf_counter()
        self.game_start_time_unix_sec = time.time()
        game_start_time_unix_ms: int = int(self.game_start_time_unix_sec * 1000)

        self.__start_msg_coro(msg_server.GameStart(timestamp=game_start_time_unix_ms), group_name=self.group_name)

        while self.running:
            try:
                await asyncio.sleep(sleep_duration_sec)
                end_time_sec = time.perf_counter()
                self.tick_frame += 1

                elaps = end_time_sec - self.game_start_time_perf_sec
                duration = elaps - self.last_game_update_perf_sec

                # Save the current state to history
                self.game_state.save_state(int(self.game_start_time_unix_sec + elaps * 1000))

                # Apply and process paddle actions in order of their timestamps
                self.action_processor.process_actions(self.game_state, self.game_start_time_unix_sec, self.last_game_update_perf_sec, duration, self.__update_game)

                self.last_game_update_perf_sec = elaps
                self.__update_game(self.game_start_time_unix_sec + elaps, duration, True)

                start_time_sec = time.perf_counter()
                time_processing_inputs_sec = start_time_sec - end_time_sec
                sleep_duration_sec = max(0.0, tick_duration_sec - time_processing_inputs_sec)

            except Exception as e:
                logger.error(f"Error during game update: {e}")
                self.__handle_error(error=e)
        print("GAME LOOP END -> thread done")

    def __update_game(self, curr_time_sec: float, duration_sec: float, send_data: bool):
        self.paddle_left.update_pos(duration_sec)
        self.paddle_right.update_pos(duration_sec)
        score = self.ball.update_pos(duration_sec, self.paddle_left, self.paddle_right)
        if score == PongBall.Scored.SCORE_NONE:
            if send_data:
                self.__start_msg_coro(msg_server.GameUpdate(
                    timestamp=curr_time_sec * 1000,
                    ball=self.ball.getPositionalDataAsDict(),
                    paddle_left=self.paddle_left.getPositionalDataAsDict(),
                    paddle_right=self.paddle_right.getPositionalDataAsDict(),
                    tickno=self.tick_frame,
                    invalid_ticks=0
                ), group_name=self.group_name)
            return
        if score == PongBall.Scored.SCORE_PLAYER_LEFT:
            self.gameResults["player_one_score"] += 1
            self.__send_score("left", self.gameResults["player_one_score"])
            if self.gameResults["player_one_score"] == self.settings.max_score:
                self.__end_game(self.gameResults["player_two_pk"], "win")
        elif score == PongBall.Scored.SCORE_PLAYER_RIGHT:
            self.gameResults["player_two_score"] += 1
            self.__send_score("right", self.gameResults["player_two_score"])
            if self.gameResults["player_two_score"] == self.settings.max_score:
                self.__end_game(self.gameResults["player_one_pk"], "win")
        
        

    def __send_score(self, side: msg_server.GameSide, winner_pk: int):
        self.__start_msg_coro(msg_server.GamePlayerScored(
            side=side,
            who_scored_id=winner_pk,
            player_one_id=self.gameResults["player_one_pk"],
            player_two_id=self.gameResults["player_two_pk"],
            player_one_score=self.gameResults["player_one_score"],
            player_two_score=self.gameResults["player_two_score"]
        ), group_name=self.group_name)

    def __end_game(self, loser_user_id: int, reason: msg_server.GameEndReason):
        if self.gameResults["player_one_pk"] == loser_user_id:
            winner_user_id = self.gameResults["player_two_pk"]
            winner_side: msg_server.GameSide = "right"
            loser_side: msg_server.GameSide = "left"
        elif self.gameResults["player_two_pk"] == loser_user_id:
            winner_user_id = self.gameResults["player_one_pk"]
            winner_side = "left"
            loser_side = "right"
        else:
            raise ValueError("invalid user_id")
        if not (reason == "surrender" or reason == "timeout" or reason == "win"):
            raise ValueError("invalid reason")
        self.__start_msg_coro(msg_server.GameEnd(
            loser_id=loser_user_id,
            winner_id=winner_user_id,
            loser_side=loser_side,
            winner_side=winner_side,
            player_one_id=self.gameResults["player_one_pk"],
            player_two_id=self.gameResults["player_two_pk"],
            player_one_score=self.gameResults["player_one_score"],
            player_two_score=self.gameResults["player_two_score"],
            reason=reason
        ), group_name=self.group_name)
        self.running = False
    
    def __handle_error(self, error: Exception | str):
        errstr = f"{error}" if isinstance(error, Exception) else error
        logger.error(f"Error: PongGame: {errstr}")
        self.__start_msg_coro(
            msg_server.Error(errstr, close_code=msg_server.WebsocketErrorCode.INTERNAL_ERROR),
            group_name=self.group_name
        )
        self.running = False

    def __start_msg_coro(self, server_broadcast: msg_server.BaseBroadcast, channel_name: str | None = None, group_name: str | None = None):
        task = asyncio.get_running_loop().create_task(msg_server.async_send_to_consumer(server_broadcast, channel_name, group_name))
        self.background_msg_send_tasks.add(task)
        def on_msg_done(task: asyncio.Task[bool]) -> object:
            e = task.exception()
            if e is not None:
                logger.error(f"Error: PongGame: unable to push to consumer: {e}")
            self.background_msg_send_tasks.discard(task)
        task.add_done_callback(on_msg_done)
        
