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

from .pong_ball import PongBall
from .pong_paddle import PongPaddle
from .pong_settings import ServeMode, PongSettings
from .game_base_class import GameObjDataClass

from . import messages_server as msg_server
from . import messages_client as msg_client



logger = logging.getLogger(__name__)
logger.setLevel(logging.CRITICAL)

from dataclasses import dataclass, field
from typing import Any

@dataclass(slots=True)
class ClientMoveItem:
    action: msg_client.ClientMoveDirection | None
    new_y: float | None
    timestamp_sec: float
    timediff_curr_sec: float


class GameResultDict(TypedDict):
    schedule_id: int
    player_one_pk: int
    player_two_pk: int
    player_one_score: int
    player_two_score: int
    winner: int | None
    loser: int | None


class PongGame:

    def get_time_ms(self):
        return time.time_ns() // 1_000_000

    def sec_to_ms(self, sec) -> int:
        return int(sec*1000)

    def __init__(self,
                 settings: PongSettings,
                 group_name: str,
                 gameSchedule: GameSchedule | None,
                 channel_alias = None):
        super().__init__()
        self.settings = settings
        self.court = GameObjDataClass(
            scaleX=settings.width,
            scaleY=settings.height,
            xU=0,
            yU=settings.border_size,
            wU=settings.width,
            hU=settings.height - 2 * settings.border_size
        )
        self.ball = PongBall(settings, self.court)
        self.paddle_left = PongPaddle(PongPaddle.PaddlePos.LEFT, settings, self.court)
        self.paddle_right = PongPaddle(PongPaddle.PaddlePos.RIGHT, settings, self.court)

        self.channel_layer = get_channel_layer() if not channel_alias else get_channel_layer(alias=channel_alias)
        if not self.channel_layer:
            raise RuntimeError("Channel layer not found")
        self.group_name = group_name

        self.gameResults : GameResultDict = {
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
        self.paddle_left_actions: list[ClientMoveItem] = []
        self.paddle_right_actions: list[ClientMoveItem] = []
        self.tick_frame: int = 0
        self.background_msg_send_tasks: set[asyncio.Task] = set()
        self.game_loop_task: asyncio.Task | None = None

        self.game_start_time_unix_sec = time.time()*1000
        self.game_start_time_perf_sec: float = time.perf_counter()
        self.last_game_update_perf_sec = self.game_start_time_perf_sec

    def is_running(self):
        return self.running
    
    def get_initial_game_data(self, timeout_time_sec: int, reconnect_timeout_sec:int) -> msg_server.BaseBroadcast:
        return msg_server.GameReady(
            timestamp_ms=self.get_time_ms(),
            court=self.court.getDataAsDict(),
            ball=self.ball.getDataAsDict(),
            paddle_left=self.paddle_left.getDataAsDict(),
            paddle_right=self.paddle_right.getDataAsDict(),
            start_timeout_sec=timeout_time_sec,
            reconnect_timeout_sec=reconnect_timeout_sec,
            user_id_left=self.gameResults["player_one_pk"],
            user_id_right=self.gameResults["player_two_pk"],
            settings= {
                "border_height": self.settings.border_size,
                "border_width": self.settings.border_size,
                "initial_serve_to": self.settings.initial_serve_to,
                "max_score": self.settings.max_score,
                "point_wait_time_ms": self.sec_to_ms(self.settings.point_wait_time_sec),
                "serve_mode": self.settings.serve_mode,
                "tick_rate": self.settings.tick_rate,
                "tick_duration_ms": int((1/self.settings.tick_rate)*1000)
            },
        )
        
    def start_game_loop(self, on_done_cb: Callable | None = None):
        if self.running == True:
            return False
        self.game_loop_task = asyncio.get_running_loop().create_task(self.__game_loop())
        print("start game loop task")
        if on_done_cb is not None:
            self.game_loop_task.add_done_callback(on_done_cb)
            self.game_loop_task.remove_done_callback
        return True
    
    def set_new_done_callback(self, on_done_cb: Callable):
        if self.game_loop_task:
            self.game_loop_task.remove_done_callback(on_done_cb)
            self.game_loop_task.add_done_callback(on_done_cb)
            return True
        return False

    def stop_game_loop(self):
        self.running = False

    def terminate_game_loop(self):
        if self.game_loop_task is not None:
            self.game_loop_task.cancel()
            
    def handle_player_action(self, user_id: int | None, new_y: float | None, action: msg_client.ClientMoveDirection | None, timestamp_sec: float | None):
        if not user_id or not isinstance(user_id, int):
            raise msg_server.CommandError("invalid user_id", msg_server.WebsocketErrorCode.INVALID_COMMAND)

        paddle: PongPaddle | None = None
        lis: list[ClientMoveItem]
        if user_id == self.gameResults["player_one_pk"]:
            paddle = self.paddle_left
            lis = self.paddle_left_actions
        elif user_id == self.gameResults["player_two_pk"]:
            paddle = self.paddle_right
            lis = self.paddle_right_actions
        else:
            raise msg_server.CommandError("invalid user_id", msg_server.WebsocketErrorCode.INVALID_COMMAND)

        if not timestamp_sec:
            raise msg_server.CommandError("invalid timestamp_sec", msg_server.WebsocketErrorCode.INVALID_COMMAND)

        # client_time_since_start = timestamp_sec - self.game_start_time_unix_sec
        # elaps = client_time_since_start
        elaps = time.perf_counter() - self.game_start_time_perf_sec
        duration = elaps - self.last_game_update_perf_sec
        
        m = elaps*1000
        c = (timestamp_sec - self.game_start_time_unix_sec)*1000
        l = (self.last_game_update_perf_sec) * 1000
        
        self.last_game_update_perf_sec = elaps
        

        # print(f"my time: {m}, client: {c}, diff: {m-c}, diff since last: {m-l}")
        # self.__update_game(self.game_start_time_unix_sec + elaps, duration, False)

        self.paddle_left.update_pos(duration)
        self.paddle_right.update_pos(duration)
        if isinstance(new_y, float):
            paddle.set_y_position(new_y)
            # lis.append(ClientMoveItem(action=action, new_y=new_y, timestamp_sec=timestamp_sec, timediff_curr_sec=m-c))
        elif (isinstance(action, str)):
            paddle.set_direction(action)
            # lis.append(ClientMoveItem(action=action, new_y=new_y, timestamp_sec=c, timediff_curr_sec=m-c))
        else:
            raise msg_server.CommandError("invalid action", msg_server.WebsocketErrorCode.INVALID_COMMAND)


    
    
    def handle_player_disconnect(self, command: msg_client.InternalDisconnectedCommand):
        self.user_disconnected = True

    def handle_player_reconnect(self, command: msg_client.InternalReconnectedCommand):
        self.user_disconnected = False

    def handle_pause(self, command: msg_client.ClientPauseCommand):
        if self.paused:
            raise msg_server.CommandError("game already paused", msg_server.WebsocketErrorCode.OK)
        self.paused = True
        # msg_client.sync_send_command_response(cmd, True, "Game paused", msg_server.WebsocketErrorCode.OK)
        self.__start_msg_coro(msg_server.GamePaused(), group_name=self.group_name)

    def handle_resume(self, command: msg_client.ClientResumeCommand):
        if not self.paused:
            raise msg_server.CommandError("game already running", msg_server.WebsocketErrorCode.OK)
        self.paused = False
        # msg_client.sync_send_command_response(cmd, True, "Game resumed", msg_server.WebsocketErrorCode.OK)
        self.__start_msg_coro(msg_server.GameResumed(), group_name=self.group_name)

    def handle_player_leave(self, user_id: int | None):
        if not user_id or not isinstance(user_id, int):
            raise msg_server.CommandError("invalid user_id", msg_server.WebsocketErrorCode.INVALID_COMMAND)
        self.__end_game(user_id, "surrender")
        # msg_client.sync_send_command_response(cmd, True, f"client {user_id} left", msg_server.WebsocketErrorCode.OK)       

    def process_command(self, cmd: msg_client.GameEngineMessage):            
            try:
                command: Final = cmd["client_command"]
                CMD_NAME: Final = command["cmd"]
                if CMD_NAME == "client-timeout":
                    pass
                elif CMD_NAME == "client-disconnected":
                    self.user_disconnected = True
                elif CMD_NAME == "client-reconnected":
                    self.user_disconnected = False
                elif CMD_NAME == "client-pause":
                    if self.paused:
                        raise msg_server.CommandError("game already paused", msg_server.WebsocketErrorCode.OK)
                    self.paused = True
                    msg_client.sync_send_command_response(cmd, True, "Game paused", msg_server.WebsocketErrorCode.OK)
                    self.__start_msg_coro(msg_server.GamePaused(), group_name=self.group_name)
                elif CMD_NAME == "client-resume":
                    if not self.paused:
                        raise msg_server.CommandError("game already running", msg_server.WebsocketErrorCode.OK)
                    self.paused = False
                    msg_client.sync_send_command_response(cmd, True, "Game resumed", msg_server.WebsocketErrorCode.OK)
                    self.__start_msg_coro(msg_server.GameResumed(), group_name=self.group_name)
                elif CMD_NAME == "client-move":
                    self.handle_player_action(command.get("user_id"), command.get("new_y"), command.get("action"), command.get("timestamp_sec"))
                    
                elif CMD_NAME == "client-leave-game":
                    self.handle_player_leave(command.get("user_id"))

            except msg_server.CommandError as e:
                logger.error(f"Error processing command: CommandResponse {e}, status_code: {e.error_code}")
                msg_client.sync_send_command_response(cmd, False, str(e), e.error_code)
            except Exception as e:
                logger.error(f"Error processing command: {e}")
                msg_client.sync_send_command_response(cmd, False, str(e), msg_server.WebsocketErrorCode.DEFAULT_ERROR)

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

    def __update_game(self, curr_time_sec: float, duration_sec: float, send_data: bool):
        if self.paused or self.user_disconnected:
            return
        self.paddle_left.update_pos(duration_sec)
        self.paddle_right.update_pos(duration_sec)
        score = self.ball.update_pos(duration_sec, self.paddle_left, self.paddle_right)
        if score == PongBall.Scored.SCORE_NONE:
            if send_data == True:
                self.__start_msg_coro(msg_server.GameUpdate(
                    timestamp_ms=curr_time_sec*1000,
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
            print(f"scored player one: {self.gameResults['player_one_score']}, max score: {self.settings.max_score}")
            if self.gameResults["player_one_score"] == self.settings.max_score:
                self.__end_game(self.gameResults["player_two_pk"], "win")
        elif score == PongBall.Scored.SCORE_PLAYER_RIGHT:
            self.gameResults["player_two_score"] += 1
            self.__send_score("right", self.gameResults["player_two_score"])
            print(f"scored player one: {self.gameResults['player_two_score']}, max score: {self.settings.max_score}")
            if self.gameResults["player_two_score"] == self.settings.max_score:
                self.__end_game(self.gameResults["player_one_pk"], "win")

    async def __game_loop(self) -> None:
        self.running = True
        time_processing_inputs_sec: float = 0
        tick_duration_sec: float = 1 / self.settings.tick_rate
        sleep_duration_sec: float = tick_duration_sec
        start_time_sec = self.last_game_update_perf_sec = self.game_start_time_perf_sec = time.perf_counter()
        self.game_start_time_unix_sec = time.time()
        game_start_time_unix_ms: int = int(self.game_start_time_unix_sec*1000)

        self.__start_msg_coro(msg_server.GameStart(timestamp_ms=game_start_time_unix_ms), group_name=self.group_name)
        
        while self.running:
            try:
                # print("game loop ...")
                await asyncio.sleep(sleep_duration_sec)
                print("\n")
                print(f"time slept: {sleep_duration_sec}")
                end_time_sec = time.perf_counter()
                self.tick_frame += 1

                elaps = end_time_sec - self.game_start_time_perf_sec
                # print(f"diff curr - last: {elaps - self.last_game_update_perf_sec}")
                duration = elaps - self.last_game_update_perf_sec
              
                
                # print(f"curr: {elaps*1000}, last: {self.last_game_update_perf_sec*1000}")
                
                # for i in self.paddle_left_actions:
                #     print(f"left action: client: {i.timestamp_sec}, diff received to client: {i.timediff_curr_sec}, diff now to client: {elaps*1000 - i.timestamp_sec}, diff client to last: {i.timestamp_sec - self.last_game_update_perf_sec*1000}")
                # print("")
                # for i in self.paddle_right_actions:
                #     print(f"right action: client: {i.timestamp_sec}, diff received to client: {i.timediff_curr_sec}, diff now to client: {elaps*1000 - i.timestamp_sec}, diff client to last: {i.timestamp_sec - self.last_game_update_perf_sec*1000}")
                    
                self.last_game_update_perf_sec = elaps
                # print(f"right action: {self.paddle_right_actions}")
                # self.paddle_left_actions.clear()
                # self.paddle_right_actions.clear()
                self.__update_game(self.game_start_time_unix_sec + elaps, duration, True)

                start_time_sec = time.perf_counter()
                time_processing_inputs_sec = start_time_sec - end_time_sec
                sleep_duration_sec = max(0.0, tick_duration_sec - time_processing_inputs_sec)

            except Exception as e:
                logger.error(f"Error during game update: {e}")
                self.__handle_error(error=e)
        print("GAME LOOP END -> thread done")



        

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
        # print("push message")
        def on_msg_done(task: asyncio.Task[bool]) -> object:
            e = task.exception()
            if e is not None:
                logger.error(f"Error: PongGame: unable to push to consumer: {e}")
            self.background_msg_send_tasks.discard(task)
            
        task.add_done_callback(on_msg_done)
        
