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

from .game_timer import GameTimer
from .neeew.GameState import GameState, ClientMoveItem
from channels_redis.core import RedisChannelLayer

logger = logging.getLogger(__name__)
logger.setLevel(logging.CRITICAL)

from dataclasses import dataclass, field
from typing import Any




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
        # self.paddle_left_actions: list[ClientMoveItem] = []
        # self.paddle_right_actions: list[ClientMoveItem] = []
        self.background_msg_send_tasks: set[asyncio.Task] = set()
        self.game_loop_task: asyncio.Task | None = None
        
        self.game_state = GameState(self.ball, self.paddle_left, self.paddle_right)
        self.game_timer = GameTimer(settings.tick_rate)
        self.move_items: list[ClientMoveItem] = []


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


    def process_command(self, cmd: msg_client.GameEngineMessage):    
        # print(f"command: {cmd}") 
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
                self.__start_cmd_coro(cmd, True, "Game paused", msg_server.WebsocketErrorCode.OK)
                self.__start_msg_coro(msg_server.GamePaused(), group_name=self.group_name)
            elif CMD_NAME == "client-resume":
                if not self.paused:
                    raise msg_server.CommandError("game already running", msg_server.WebsocketErrorCode.OK)
                self.paused = False
                self.__start_cmd_coro(cmd, True, "Game resumed", msg_server.WebsocketErrorCode.OK)
                self.__start_msg_coro(msg_server.GameResumed(), group_name=self.group_name)
            elif CMD_NAME == "client-move":
                self.handle_player_action(
                    user_id=command.get("user_id"),
                    new_y=command.get("new_y"),
                    action=command.get("action"),
                    timestamp_sec=command.get("timestamp_sec"),
                    tickno=command.get("tickno"),
                    tick_diff=command.get("tick_diff")
                    )
                
            elif CMD_NAME == "client-leave-game":
                self.handle_player_leave(command.get("user_id"))

        except msg_server.CommandError as e:
            logger.error(f"Error processing command: CommandResponse {e}, status_code: {e.error_code}")
            self.__start_cmd_coro(cmd, False, str(e), e.error_code)
        except Exception as e:
            logger.error(f"Error processing command: {e}")
            self.__start_cmd_coro(cmd, False, str(e), msg_server.WebsocketErrorCode.DEFAULT_ERROR)


    
    def handle_player_disconnect(self, command: msg_client.InternalDisconnectedCommand):
        self.user_disconnected = True

    def handle_player_reconnect(self, command: msg_client.InternalReconnectedCommand):
        self.user_disconnected = False

    def handle_pause(self, command: msg_client.ClientPauseCommand):
        if self.paused:
            raise msg_server.CommandError("game already paused", msg_server.WebsocketErrorCode.OK)
        self.paused = True
        # self.__start_cmd_coro(cmd, True, "Game paused", msg_server.WebsocketErrorCode.OK)
        self.__start_msg_coro(msg_server.GamePaused(), group_name=self.group_name)

    def handle_resume(self, command: msg_client.ClientResumeCommand):
        if not self.paused:
            raise msg_server.CommandError("game already running", msg_server.WebsocketErrorCode.OK)
        self.paused = False
        # self.__start_cmd_coro(cmd, True, "Game resumed", msg_server.WebsocketErrorCode.OK)
        self.__start_msg_coro(msg_server.GameResumed(), group_name=self.group_name)

    def handle_player_leave(self, user_id: int | None):
        if not user_id or not isinstance(user_id, int):
            raise msg_server.CommandError("invalid user_id", msg_server.WebsocketErrorCode.INVALID_COMMAND)
        self.__end_game(user_id, "surrender")
        # self.__start_cmd_coro(cmd, True, f"client {user_id} left", msg_server.WebsocketErrorCode.OK)       



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

    def __check_scores(self, score):
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



    def handle_player_action(self, user_id: int | None, new_y: float | None, action: msg_client.ClientMoveDirection | None, timestamp_sec: float | None, tickno: int | None, tick_diff: float | None):
        if not user_id or not isinstance(user_id, int):
            raise msg_server.CommandError("invalid user_id", msg_server.WebsocketErrorCode.INVALID_COMMAND)

        paddle: PongPaddle | None = None
        # lis: list[ClientMoveItem]
        if user_id == self.gameResults["player_one_pk"]:
            paddle = self.paddle_left
            # lis = self.paddle_left_actions
        elif user_id == self.gameResults["player_two_pk"]:
            paddle = self.paddle_right
            # lis = self.paddle_right_actions
        else:
            raise msg_server.CommandError("invalid user_id", msg_server.WebsocketErrorCode.INVALID_COMMAND)

        if not timestamp_sec:
            raise msg_server.CommandError("invalid timestamp_sec", msg_server.WebsocketErrorCode.INVALID_COMMAND)

        # print(f"\nclient: {timestamp_sec*1000}, server: {self.game_timer.get_tick_time_since_start('ms')}")
        # print(f"tickno client: {tickno}, tickdiff: {tick_diff}")
        # print(f"current tick: {self.game_timer.get_current_tick()}")
        # print(f"diff client to server: {self.game_timer.get_tick_time_since_start('ms')-timestamp_sec*1000}")
        
        # if isinstance(new_y, float):
        #     # paddle.set_y_position(new_y)
        #     pass
        # elif (isinstance(action, str)):
        #     # paddle.set_direction(action)
        #     pass
        # else:
        #     raise msg_server.CommandError("invalid action", msg_server.WebsocketErrorCode.INVALID_COMMAND)
        if (tickno is None
            or tick_diff is None
            or tick_diff > self.game_timer.get_tick_duration("ms")
            or self.game_timer.get_current_tick() - tickno > 3
            or tickno > self.game_timer.get_current_tick()
            or (not isinstance(new_y, float) and not isinstance(action, str))):
            print(f"INVALIDDD?!")
            return
            raise msg_server.CommandError("invalid action", msg_server.WebsocketErrorCode.INVALID_COMMAND)
        
        # self.move_items.append(ClientMoveItem(action=action, new_y=new_y, tick=tickno, timediff_ms=tick_diff, paddle=paddle))
        try:
            score = self.game_state.reconcile(self.game_timer, ClientMoveItem(action=action, new_y=new_y, tick=tickno, timediff_ms=tick_diff, paddle=paddle))
        except Exception as e:
            print(f"error reconcile: {e}")
        
    async def __game_loop(self) -> None:
        self.running = True
        
        # a = msg_server.GameObjPositionDataclass(x=0.1, y=0.2, dx=0.3, dy=0.4)
        # b = msg_server.GameObjPositionDataclass(x=0.11, y=0.22, dx=0.33, dy=0.44)
        # c = msg_server.GameObjPositionDataclass(x=0.111, y=0.222, dx=0.333, dy=0.444)
        # d = msg_server.GameSnapshotDataclass(tickno=1, ball=a, paddle_left=b, paddle_right=c)
        # aa = msg_server.GameObjPositionDataclass(x=1.1, y=1.2, dx=1.3, dy=1.4)
        # bb = msg_server.GameObjPositionDataclass(x=1.11, y=1.22, dx=1.33, dy=1.44)
        # cc = msg_server.GameObjPositionDataclass(x=1.111, y=1.222, dx=1.333, dy=1.444)
        # dd = msg_server.GameSnapshotDataclass(tickno=2, ball=aa, paddle_left=bb, paddle_right=cc)
        # e = msg_server.GameSnapshotListDataclass(list=[d, dd])
        # self.__start_msg_coro(e, group_name=self.group_name)
        self.game_timer.start_game()
        self.__start_msg_coro(msg_server.GameStart(timestamp_ms=self.game_timer.get_start_time("ms")), group_name=self.group_name)
        await asyncio.sleep(self.game_timer.get_initial_sleep_time())
        while self.running:
            try:
                self.game_timer.stopwatch_start()
                
                if len(self.game_state.recalculated_snapshots) > 0:
                    print(f"recalculated snapshots: {self.game_state.recalculated_snapshots}")
                    
                # try:
                #     score = self.game_state.reconcile_list(self.game_timer, self.move_items)
                # except Exception as e:
                #     print(f"error reconcile: {e}")
                # self.move_items.clear()
                    
                    
                score, state = self.game_state.update_and_safe_state(self.game_timer)
                # print(f"new state data: {state}")
                if score == PongBall.Scored.SCORE_NONE:
                    # print(f"ok, state: {state}")
                    self.__start_msg_coro(msg_server.GameSnapshotListDataclass(list=state), group_name=self.group_name)
                    # self.__start_msg_coro(state, group_name=self.group_name)
                self.__check_scores(score)
                sleep_time = self.game_timer.stopwatch_end()
                # a = sleep_time
                # b = self.game_timer.get_current_tick()
                # c = self.game_timer.get_tick_time_since_start('ms')
                # d = time.time()*1000
                # e = self.game_timer.get_tick_time_unix('ms')
                # print(f"time to sleep: {a}, current tick: {b}, ticktime: {c}, curr time ms: {d}, game time ms: {e}, diff:{d-e}")
                # print(f"diff:{time.time()*1000-self.game_timer.get_tick_time_unix('ms')}")
                await asyncio.sleep(sleep_time)


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
        

        
    def __start_msg_coro(self, server_broadcast: msg_server.BaseBroadcast | msg_server.BaseBroadcastBin, channel_name: str | None = None, group_name: str | None = None):
        task = asyncio.get_running_loop().create_task(msg_server.async_send_to_consumer(server_broadcast, channel_name, group_name))
        self.background_msg_send_tasks.add(task)
        # print("push message")
        def on_msg_done(task: asyncio.Task[bool]) -> object:
            e = task.exception()
            if e is not None:
                logger.error(f"Error: PongGame: unable to push to consumer: {e}")
            self.background_msg_send_tasks.discard(task)
            
        task.add_done_callback(on_msg_done)

    def __start_cmd_coro(self, event: msg_client.GameEngineMessage, success: bool, message: str,
    status_code: msg_server.WebsocketErrorCode = msg_server.WebsocketErrorCode.OK, payload: Any = None):
        task = asyncio.get_running_loop().create_task(msg_client.async_send_command_response(event, success, message, status_code, payload))
        self.background_msg_send_tasks.add(task)
        # print("push message")
        def on_msg_done(task: asyncio.Task[None]) -> object:
            e = task.exception()
            if e is not None:
                logger.error(f"Error: PongGame: unable to push to consumer: {e}")
            self.background_msg_send_tasks.discard(task)
            
        task.add_done_callback(on_msg_done)
        
