import time
import queue
import threading
import logging
import math

from typing import TypedDict, LiteralString, Literal

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
    cmd: msg_client.ClientMoveCommand
    paddle: PongPaddle
    timestamp_sec: float = field(default=0)
    timestamp_ms: int = field(default=0)


class GameResultDict(TypedDict):
    schedule_id: int
    player_one_pk: int
    player_two_pk: int
    player_one_score: int
    player_two_score: int
    winner: int | None
    loser: int | None


class PongGame(threading.Thread):

    def get_time_ms(self):
        return time.time_ns() // 1_000_000

    def sec_to_ms(self, sec) -> int:
        return int(sec*1000)

    def __init__(self, settings: PongSettings, group_name: str, q: queue.Queue[msg_client.GameEngineMessage], gameSchedule: GameSchedule | None, channel_alias = None):
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
        self.commandQueue = q
        self.user_disconnected = False
        self.lastone_ms = 0
        self.player_move_queue: list[ClientMoveItem] = []
        self.tick_frame: int = 0


    def process_commands_sec(self, cmd: msg_client.GameEngineMessage, current_time_sec: float, max_past_timestamp_sec: float):            
            try:
                command = cmd["client_command"]
                match command["cmd"]:
                    case "client-timeout":
                        self.running = False
                    case "client-disconnected":
                        self.user_disconnected = True
                    case "client-reconnected":
                        self.user_disconnected = False
                    case "client-pause":
                        if self.paused:
                            raise msg_server.CommandError("game already paused", msg_server.WebsocketErrorCode.OK)
                        self.paused = True
                        msg_client.sync_send_command_response(cmd, True, "Game paused", msg_server.WebsocketErrorCode.OK)
                        msg_server.sync_send_to_consumer(msg_server.GamePaused(), group_name=self.group_name)
                    case "client-resume":
                        if not self.paused:
                            raise msg_server.CommandError("game already running", msg_server.WebsocketErrorCode.OK)
                        self.paused = False
                        msg_client.sync_send_command_response(cmd, True, "Game resumed", msg_server.WebsocketErrorCode.OK)
                        msg_server.sync_send_to_consumer(msg_server.GameResumed(), group_name=self.group_name)
                    case "client-move":
                        user_id: int = command.get("user_id", None)
                        if not user_id or not isinstance(user_id, int):
                            raise msg_server.CommandError("invalid user_id", msg_server.WebsocketErrorCode.INVALID_COMMAND)
 
                        timestamp_sec: float = command.get("timestamp_sec", None)
                        print(f"new move command!: current_time_sec: {current_time_sec}, timestamp: {timestamp_sec}, diff: {(current_time_sec - timestamp_sec) *1000}")
                        if not timestamp_sec or not isinstance(timestamp_sec, float):
                            raise msg_server.CommandError("invalid timestamp_sec", msg_server.WebsocketErrorCode.INVALID_COMMAND)
                        if timestamp_sec > current_time_sec or timestamp_sec < max_past_timestamp_sec:
                            raise msg_server.CommandError("timestamp_ms out of bounds", msg_server.WebsocketErrorCode.INVALID_COMMAND)
                    
                        paddle: PongPaddle | None = None
                        if user_id == self.gameResults["player_one_pk"]:
                            paddle = self.paddle_left
                        elif user_id == self.gameResults["player_two_pk"]:
                            paddle = self.paddle_right
                        else:
                            raise msg_server.CommandError("invalid user_id", msg_server.WebsocketErrorCode.INVALID_COMMAND)

                        
                        new_y: float | None = command.get("new_y", None)
                        action: str | None = command.get("action", None)
                        if isinstance(new_y, float) or (isinstance(action, str) and (action == "down" or action == "release_down" or action == "release_up" or action == "up")):
                            # if new_y:
                            #     paddle.set_y_position(new_y)
                            # if action:
                            #     paddle.set_direction(action)
                            self.player_move_queue.append(ClientMoveItem(timestamp_sec=timestamp_sec, paddle=paddle, cmd=command))
                        raise msg_server.CommandError("invalid action", msg_server.WebsocketErrorCode.INVALID_COMMAND)
                    
                    case "client-leave-game":
                        user_id = command.get("user_id", None)
                        if not user_id or not isinstance(user_id, int):
                            raise msg_server.CommandError("invalid user_id", msg_server.WebsocketErrorCode.INVALID_COMMAND)
                        self.end_game(user_id, "surrender")
                        msg_client.sync_send_command_response(cmd, True, f"client {user_id} left", msg_server.WebsocketErrorCode.OK)            

            except msg_server.CommandError as e:
                logger.error(f"Error processing command: CommandResponse {e}, status_code: {e.error_code}")
                msg_client.sync_send_command_response(cmd, False, str(e), e.error_code)
            except Exception as e:
                logger.error(f"Error processing command: {e}")
                msg_client.sync_send_command_response(cmd, False, str(e), msg_server.WebsocketErrorCode.DEFAULT_ERROR)

    def process_player_move(self, curr_time_sec: float, tick_duration_sec: float):
        if self.paused or self.user_disconnected:
            self.player_move_queue.clear()
            return
        self.player_move_queue.sort(key=lambda x: x.timestamp_sec, reverse=True)
        # print("\n!PLAYER MOVE QUEUE")
        # print(self.player_move_queue)
        invalid_tick_frames: int = 0
        last_update_time = curr_time_sec - tick_duration_sec
        last_timestamp: float = last_update_time
       
        # if len(self.player_move_queue) > 0:
        #     item = self.player_move_queue[-1]
        #     invalid_tick_frames = max(0, math.ceil((last_update_time - item.timestamp_sec) / tick_duration_sec))
        #     revert_time = invalid_tick_frames * tick_duration_sec
        #     if ((math.isclose(item.paddle.top, item.paddle.bound_top) and item.cmd.get('action') == "release_up") or (math.isclose(item.paddle.bottom, item.paddle.bound_bottom) and item.cmd.get("action") == "release_down")):
        #         last_timestamp = item.timestamp_sec
        #         self.player_move_queue.pop()
        #     else:
        #         last_timestamp = last_update_time - revert_time
        #         self.update_game_objects(revert_time*-1)
        #     while len(self.player_move_queue) > 0:
        #         item = self.player_move_queue.pop()
        #         score = self.update_game_objects(item.timestamp_sec - last_timestamp)
        #         if score != PongBall.Scored.SCORE_NONE:
        #             break
        #         action = item.cmd.get('action', None)
        #         new_y = item.cmd.get('new_y', None)
        #         if action:
        #             item.paddle.set_direction(item.cmd["action"])
        #         elif new_y:
        #             item.paddle.set_y_position(new_y)
        #         last_timestamp = item.timestamp_sec
        #         if score != PongBall.Scored.SCORE_NONE:
        #             break

        # self.update_game_objects(curr_time_sec - last_timestamp)

        update_ball = True
        if len(self.player_move_queue) > 0:
            item = self.player_move_queue[-1]
            first_move_time = item.timestamp_sec

            print(f"first_move: {first_move_time}, last_update: {last_update_time}, current: {curr_time_sec}, invalid: {invalid_tick_frames}")
            if (last_update_time > first_move_time):
                invalid_tick_frames = max(0, math.ceil((last_update_time - first_move_time) / tick_duration_sec))
                revert_time = invalid_tick_frames * tick_duration_sec
                last_timestamp = last_update_time - revert_time
                self.update_game_objects(revert_time*-1)
            while len(self.player_move_queue) > 0:
                item = self.player_move_queue.pop()
                paddle = item.paddle
                paddle_other = self.paddle_right if item.paddle == self.paddle_left else self.paddle_left
                duration = item.timestamp_sec - last_timestamp
                last_timestamp = item.timestamp_sec
                action = item.cmd.get('action', None)
                new_y = item.cmd.get('new_y', None)
                paddle_other.update_pos(duration)
                if action:
                    paddle.update_pos(duration)
                    paddle.set_direction(action)
                elif new_y:
                    paddle.set_y_position(new_y)
                score = self.update_ball(duration)
                if score != PongBall.Scored.SCORE_NONE:
                    break
        
        self.update_game_objects(curr_time_sec - last_timestamp)
        try:
            msg_server.sync_send_to_consumer(msg_server.GameUpdate(
                timestamp=curr_time_sec*1000,
                ball=self.ball.getPositionalDataAsDict(),
                paddle_left=self.paddle_left.getPositionalDataAsDict(),
                paddle_right=self.paddle_right.getPositionalDataAsDict(),
                tickno=self.tick_frame,
                invalid_ticks=invalid_tick_frames
                ), group_name=self.group_name)
        except Exception as e:
            logger.error(f"Error publishing game state: {e}")
            self.handle_error(error=e)

    def update_game_objects(self, duration_sec: float):
        self.paddle_left.update_pos(duration_sec)
        self.paddle_right.update_pos(duration_sec)
        return self.update_ball(duration_sec)

    # def update_game_objects_new(self, update_ball: bool, duration_sec: float, update_paddle: PongPaddle | None = None, data: float | msg_client.ClientMoveDirection | None = None):
        
    #     if isinstance(data, float) and update_paddle:
    #         paddle_other = self.paddle_left if update_paddle == self.paddle_right else self.paddle_left
    #         update_paddle.update_pos_direct(data)
    #         paddle_other.update_pos_by_dir(duration_sec)
    #     elif isinstance(data, str) and update_paddle:
    #         paddle_other = self.paddle_left if update_paddle == self.paddle_right else self.paddle_left
    #         update_paddle.set_direction(data)
    #         update_paddle.update_pos_by_dir(duration_sec)
    #         paddle_other.update_pos_by_dir(duration_sec)
    #     else:
    #         self.paddle_left.update_pos_by_dir(duration_sec)
    #         self.paddle_right.update_pos_by_dir(duration_sec)

    #     # if (update_ball):
    #     return self.update_ball(duration_sec)
    #     # return PongBall.Scored.SCORE_NONE

    def update_ball(self, simulation_time_sec) -> PongBall.Scored:
        score = self.ball.update_pos(simulation_time_sec, self.paddle_left, self.paddle_right)
        if score != PongBall.Scored.SCORE_NONE:
            if score == PongBall.Scored.SCORE_PLAYER_LEFT:
                self.gameResults["player_one_score"] += 1
            elif score == PongBall.Scored.SCORE_PLAYER_RIGHT:
                self.gameResults["player_two_score"] += 1
            if self.gameResults["player_one_score"] >= self.settings.max_score:
                self.end_game(self.gameResults["player_two_pk"], "win")
            elif self.gameResults["player_two_score"] >= self.settings.max_score:
                self.end_game(self.gameResults["player_one_pk"], "win")
        return score

    def run(self):
        self.running = True
        
        time_processing_inputs_sec: float = 0
        tick_duration_sec: float = 1 / self.settings.tick_rate
        sleep_duration_sec: float = tick_duration_sec
        start_time_sec = end_time_sec = game_start_time_perf_sec = time.perf_counter()
        game_start_time_unix_sec: float = time.time()
        game_start_time_unix_ms: int = int(game_start_time_unix_sec*1000)
        time_slept_sec: float = 0
        simulation_time_sec: float = 0
        max_input_timediff_sec: float = 5 * tick_duration_sec
        current_time_sec = game_start_time_unix_sec

        msg_server.sync_send_to_consumer(msg_server.GameStart(timestamp=game_start_time_unix_ms), group_name=self.group_name)
        
        while self.running:
            try:
                time.sleep(sleep_duration_sec)
                end_time_sec = time.perf_counter()
                time_slept_sec = end_time_sec - start_time_sec
                
                self.tick_frame += 1
                current_time_sec = game_start_time_unix_sec + (end_time_sec - game_start_time_perf_sec)
                simulation_time_sec = time_slept_sec + time_processing_inputs_sec
                max_past_timestamp_sec = current_time_sec - max_input_timediff_sec
               
                
                while not self.commandQueue.empty():
                    cmd = self.commandQueue.get()
                    self.process_commands_sec(cmd,current_time_sec, max_past_timestamp_sec)
                    self.commandQueue.task_done()
                if not self.running:
                    # print("break game loop")
                    break

                self.process_player_move(current_time_sec, simulation_time_sec)
                # if not self.paused and not self.user_disconnected:
                #     self.update_game_objects(tick_duration_sec)


                start_time_sec = time.perf_counter()
                time_processing_inputs_sec = start_time_sec - end_time_sec
                sleep_duration_sec = max(0.0, tick_duration_sec - time_processing_inputs_sec)
                # print(f"sleep duration: {sleep_duration_sec*1000}")

            except Exception as e:
                logger.error(f"Error during game update: {e}")
                self.handle_error(error=e)



    # def update_game(self, simulation_time_sec, curr_time_ms):
    #     self.paddle_left.update_pos(simulation_time_sec)
    #     self.paddle_right.update_pos(simulation_time_sec)
    #     self.update_ball(simulation_time_sec)
    #     try:
    #         msg_server.sync_send_to_consumer(msg_server.GameUpdate(
    #             timestamp=curr_time_ms,
    #             ball=self.ball.getPositionalDataAsDict(),
    #             paddle_left=self.paddle_left.getPositionalDataAsDict(),
    #             paddle_right=self.paddle_right.getPositionalDataAsDict(),
    #             tickno=self.tick_frame,
    #             invalid_ticks=0
    #             ), group_name=self.group_name)
    #     except Exception as e:
    #         logger.error(f"Error publishing game state: {e}")
    #         self.handle_error(error=e)

    def get_initial_game_data(self, timeout_time_sec: int) -> msg_server.BaseBroadcast:
        return msg_server.GameReady(
            timestamp=self.get_time_ms(),
            court=self.court.getDataAsDict(),
            ball=self.ball.getDataAsDict(),
            paddle_left=self.paddle_left.getDataAsDict(),
            paddle_right=self.paddle_right.getDataAsDict(),
            timeout_time_sec=timeout_time_sec,
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

    def end_game(self, loser_user_id: int, reason: msg_server.GameEndReason):
        if self.gameResults["player_one_pk"] == loser_user_id:
            winner_user_id = self.gameResults["player_two_pk"]
        elif self.gameResults["player_two_pk"] == loser_user_id:
            winner_user_id = self.gameResults["player_one_pk"]
        else:
            raise ValueError("invalid user_id")
        if reason == "surrender" or reason == "timeout" or reason == "win":
            msg_server.sync_send_to_consumer(msg_server.GameEnd(
                    user_id_loser=loser_user_id,
                    user_id_winner=winner_user_id,
                    reason=reason
                ), group_name=self.group_name)
            self.running = False
        else:
            raise ValueError("invalid reason")


        

    def handle_error(self, error: Exception | str):
        errstr = f"{error}" if isinstance(error, Exception) else error
        logger.error(f"Error: PongGame: {errstr}")
        if not msg_server.sync_send_to_consumer(
                msg_server.Error(errstr, close_code=msg_server.WebsocketErrorCode.INTERNAL_ERROR),
                group_name=self.group_name
            ):
            logger.error("Error: PongGame: unable to push to consumer")
        self.running = False

# import time
# import queue
# import threading
# import logging
# import math

# from typing import TypedDict, LiteralString, Literal

# from asgiref.sync import async_to_sync
# from channels.layers import get_channel_layer

# from game.models import GameSchedule, GameResults
# from user.models import UserAccount

# from .pong_ball import PongBall
# from .pong_paddle import PongPaddle
# from .pong_settings import ServeMode, PongSettings
# from .game_base_class import GameObjDataClass

# from . import messages_server as msg_server
# from . import messages_client as msg_client



# logger = logging.getLogger(__name__)
# logger.setLevel(logging.CRITICAL)

# from dataclasses import dataclass, field
# from typing import Any

# @dataclass(slots=True)
# class ClientMoveItem:
#     cmd: msg_client.ClientMoveCommand
#     paddle: PongPaddle
#     timestamp_sec: float = field(default=0)
#     timestamp_ms: int = field(default=0)


# class GameResultDict(TypedDict):
#     schedule_id: int
#     player_one_pk: int
#     player_two_pk: int
#     player_one_score: int
#     player_two_score: int
#     winner: int | None
#     loser: int | None


# class PongGame(threading.Thread):

#     def get_time_ms(self):
#         return time.time_ns() // 1_000_000

#     def sec_to_ms(self, sec) -> int:
#         return int(sec*1000)

#     def __init__(self, settings: PongSettings, group_name: str, q: queue.Queue[msg_client.GameEngineMessage], gameSchedule: GameSchedule | None, channel_alias = None):
#         super().__init__()
#         self.settings = settings
#         self.court = GameObjDataClass(
#             scaleX=settings.width,
#             scaleY=settings.height,
#             xU=0,
#             yU=settings.border_size,
#             wU=settings.width,
#             hU=settings.height - 2 * settings.border_size
#         )
#         self.ball = PongBall(settings, self.court)
#         self.paddle_left = PongPaddle(PongPaddle.PaddlePos.LEFT, settings, self.court)
#         self.paddle_right = PongPaddle(PongPaddle.PaddlePos.RIGHT, settings, self.court)

#         self.channel_layer = get_channel_layer() if not channel_alias else get_channel_layer(alias=channel_alias)
#         if not self.channel_layer:
#             raise RuntimeError("Channel layer not found")
#         self.group_name = group_name

#         self.gameResults : GameResultDict = {
#             "schedule_id": gameSchedule.pk if gameSchedule else 0,
#             "player_one_pk": gameSchedule.player_one.pk if gameSchedule else 0,
#             "player_two_pk": gameSchedule.player_two.pk if gameSchedule else 0,
#             "player_one_score": 0,
#             "player_two_score": 0,
#             "winner": None,
#             "loser": None
#         }

#         self.running = False
#         self.paused = False
#         self.commandQueue = q
#         self.user_disconnected = False
#         self.lastone_ms = 0
#         self.player_move_queue: list[ClientMoveItem] = []
#         self.tick_frame: int = 0


#     def process_commands_sec(self, cmd: msg_client.GameEngineMessage, current_time_sec: float, max_past_timestamp_sec: float):            
#             try:
#                 command = cmd["client_command"]
#                 match command["cmd"]:
#                     case "client-timeout":
#                         self.running = False
#                     case "client-disconnected":
#                         self.user_disconnected = True
#                     case "client-reconnected":
#                         self.user_disconnected = False
#                     case "client-pause":
#                         if self.paused:
#                             raise msg_server.CommandError("game already paused", msg_server.WebsocketErrorCode.OK)
#                         self.paused = True
#                         msg_client.sync_send_command_response(cmd, True, "Game paused", msg_server.WebsocketErrorCode.OK)
#                         msg_server.sync_send_to_consumer(msg_server.GamePaused(), group_name=self.group_name)
#                     case "client-resume":
#                         if not self.paused:
#                             raise msg_server.CommandError("game already running", msg_server.WebsocketErrorCode.OK)
#                         self.paused = False
#                         msg_client.sync_send_command_response(cmd, True, "Game resumed", msg_server.WebsocketErrorCode.OK)
#                         msg_server.sync_send_to_consumer(msg_server.GameResumed(), group_name=self.group_name)
#                     case "client-move":
#                         user_id: int = command.get("user_id", None)
#                         if not user_id or not isinstance(user_id, int):
#                             raise msg_server.CommandError("invalid user_id", msg_server.WebsocketErrorCode.INVALID_COMMAND)
 
#                         timestamp_sec: float = command.get("timestamp_sec", None)
#                         print(f"new move command!: current_time_sec: {current_time_sec}, timestamp: {timestamp_sec}, diff: {(current_time_sec - timestamp_sec) *1000}")
#                         if not timestamp_sec or not isinstance(timestamp_sec, float):
#                             raise msg_server.CommandError("invalid timestamp_sec", msg_server.WebsocketErrorCode.INVALID_COMMAND)
#                         if timestamp_sec > current_time_sec or timestamp_sec < max_past_timestamp_sec:
#                             raise msg_server.CommandError("timestamp_ms out of bounds", msg_server.WebsocketErrorCode.INVALID_COMMAND)
                    
#                         paddle: PongPaddle | None = None
#                         if user_id == self.gameResults["player_one_pk"]:
#                             paddle = self.paddle_left
#                         elif user_id == self.gameResults["player_two_pk"]:
#                             paddle = self.paddle_right
#                         else:
#                             raise msg_server.CommandError("invalid user_id", msg_server.WebsocketErrorCode.INVALID_COMMAND)

                        
#                         new_y: float | None = command.get("new_y", None)
#                         action: str | None = command.get("action", None)
#                         if isinstance(new_y, float) or (isinstance(action, str) and (action == "down" or action == "release_down" or action == "release_up" or action == "up")):
#                             # if new_y:
#                             #     self.player_move_queue.append(ClientMoveItem(timestamp_sec=timestamp_sec, paddle=paddle, cmd=command))
#                             #     # paddle.set_y_position(new_y)
#                             # if action:
#                             #     paddle.set_direction(action)
#                             self.player_move_queue.append(ClientMoveItem(timestamp_sec=timestamp_sec, paddle=paddle, cmd=command))
#                         else:
#                             raise msg_server.CommandError("invalid action", msg_server.WebsocketErrorCode.INVALID_COMMAND)
                    
#                     case "client-leave-game":
#                         user_id = command.get("user_id", None)
#                         if not user_id or not isinstance(user_id, int):
#                             raise msg_server.CommandError("invalid user_id", msg_server.WebsocketErrorCode.INVALID_COMMAND)
#                         self.end_game(user_id, "surrender")
#                         msg_client.sync_send_command_response(cmd, True, f"client {user_id} left", msg_server.WebsocketErrorCode.OK)            

#             except msg_server.CommandError as e:
#                 logger.error(f"Error processing command: CommandResponse {e}, status_code: {e.error_code}")
#                 msg_client.sync_send_command_response(cmd, False, str(e), e.error_code)
#             except Exception as e:
#                 logger.error(f"Error processing command: {e}")
#                 msg_client.sync_send_command_response(cmd, False, str(e), msg_server.WebsocketErrorCode.DEFAULT_ERROR)
            
#     def process_commands_ms(self, cmd: msg_client.GameEngineMessage, current_time_ms: int, max_past_timestamp_ms: int):            
#             try:
#                 command = cmd["client_command"]
#                 match command["cmd"]:
#                     case "client-timeout":
#                         self.running = False
#                     case "client-disconnected":
#                         self.user_disconnected = True
#                     case "client-reconnected":
#                         self.user_disconnected = False
#                     case "client-pause":
#                         if self.paused:
#                             raise msg_server.CommandError("game already paused", msg_server.WebsocketErrorCode.OK)
#                         self.paused = True
#                         msg_client.sync_send_command_response(cmd, True, "Game paused", msg_server.WebsocketErrorCode.OK)
#                         msg_server.sync_send_to_consumer(msg_server.GamePaused(), group_name=self.group_name)
#                     case "client-resume":
#                         if not self.paused:
#                             raise msg_server.CommandError("game already running", msg_server.WebsocketErrorCode.OK)
#                         self.paused = False
#                         msg_client.sync_send_command_response(cmd, True, "Game resumed", msg_server.WebsocketErrorCode.OK)
#                         msg_server.sync_send_to_consumer(msg_server.GameResumed(), group_name=self.group_name)
#                     case "client-move":
#                         user_id: int = command.get("user_id", None)
#                         if not user_id or not isinstance(user_id, int):
#                             raise msg_server.CommandError("invalid user_id", msg_server.WebsocketErrorCode.INVALID_COMMAND)
                        
#                         timestamp_ms: float = command.get("timestamp_ms", None)
#                         # print(f"new move command!: current_time_ms: {current_time_ms}, timestamp: {timestamp_ms}, diff: {(current_time_ms - timestamp_ms)}")
#                         if not timestamp_ms or not isinstance(timestamp_ms, int):
#                             raise msg_server.CommandError("invalid timestamp_ns", msg_server.WebsocketErrorCode.INVALID_COMMAND)
#                         if timestamp_ms > current_time_ms or timestamp_ms < max_past_timestamp_ms:
#                             raise msg_server.CommandError("timestamp_ms out of bounds", msg_server.WebsocketErrorCode.INVALID_COMMAND)
                        
#                         paddle: PongPaddle | None = None
#                         if user_id == self.gameResults["player_one_pk"]:
#                             paddle = self.paddle_left
#                         elif user_id == self.gameResults["player_two_pk"]:
#                             paddle = self.paddle_right
#                         else:
#                             raise msg_server.CommandError("invalid user_id", msg_server.WebsocketErrorCode.INVALID_COMMAND)
                        
#                         new_y: float | None = command.get("new_y", None)
#                         action: str | None = command.get("action", None)
#                         if new_y is not None and isinstance(new_y, float):
#                             paddle.set_y_position(new_y)
#                         else:
#                             if not isinstance(action, str):
#                                 raise msg_server.CommandError("invalid action", msg_server.WebsocketErrorCode.INVALID_COMMAND)
#                             if not (action == "down" or action == "release_down" or action == "release_up" or action == "up"):
#                                 raise msg_server.CommandError("invalid action", msg_server.WebsocketErrorCode.INVALID_COMMAND)
#                             # paddle.set_direction(action)
#                         self.player_move_queue.append(ClientMoveItem(timestamp_ms=timestamp_ms, paddle=paddle, cmd=command))
                    
#                     case "client-leave-game":
#                         user_id = command.get("user_id", None)
#                         if not user_id or not isinstance(user_id, int):
#                             raise msg_server.CommandError("invalid user_id", msg_server.WebsocketErrorCode.INVALID_COMMAND)
#                         self.end_game(user_id, "surrender")
#                         msg_client.sync_send_command_response(cmd, True, f"client {user_id} left", msg_server.WebsocketErrorCode.OK)            

#             except msg_server.CommandError as e:
#                 logger.error(f"Error processing command: CommandResponse {e}, status_code: {e.error_code}")
#                 msg_client.sync_send_command_response(cmd, False, str(e), e.error_code)
#             except Exception as e:
#                 logger.error(f"Error processing command: {e}")
#                 msg_client.sync_send_command_response(cmd, False, str(e), msg_server.WebsocketErrorCode.DEFAULT_ERROR)

#     def process_player_move(self, curr_time_sec: float, tick_duration_sec: float):
#         if self.paused or self.user_disconnected:
#             self.player_move_queue.clear()
#             return
#         self.player_move_queue.sort(key=lambda x: x.timestamp_sec, reverse=True)
#         invalid_tick_frames: int = 0
#         last_time_sec = curr_time_sec - tick_duration_sec
#         last_timestamp: float = last_time_sec
#         if len(self.player_move_queue) > 0:
#             item = self.player_move_queue[-1]
#             invalid_tick_frames = max(0, math.ceil((last_time_sec - item.timestamp_sec) / tick_duration_sec))
#             revert_time = invalid_tick_frames * tick_duration_sec
#             if ((math.isclose(item.paddle.top, item.paddle.bound_top) and item.cmd.get('action') == "release_up") or (math.isclose(item.paddle.bottom, item.paddle.bound_bottom) and item.cmd.get("action") == "release_down")):
#                 last_timestamp = item.timestamp_sec
#                 self.player_move_queue.pop()
#             else:
#                 last_timestamp = last_time_sec - revert_time
#                 self.update_game_objects(revert_time*-1)
#             while len(self.player_move_queue) > 0:
#                 item = self.player_move_queue.pop()
#                 paddle = item.paddle
#                 paddle_other = self.paddle_right if item.paddle == self.paddle_left else self.paddle_left
#                 duration = item.timestamp_sec - last_timestamp
#                 last_timestamp = item.timestamp_sec
#                 action = item.cmd.get('action', None)
#                 new_y = item.cmd.get('new_y', None)
#                 score = PongBall.Scored.SCORE_NONE
#                 if action:
#                     paddle.update_pos(duration)
#                     paddle.set_direction(action)
#                 elif new_y:
#                     paddle.set_y_position(new_y)
#                 paddle_other.update_pos(duration)
#                 score = self.update_ball(duration)
#                 if score != PongBall.Scored.SCORE_NONE:
#                     break
#             # while len(self.player_move_queue) > 0:
#             #     item = self.player_move_queue.pop()
#             #     score = self.update_game_objects(item.timestamp_sec - last_timestamp)
#             #     action = item.cmd.get('action', None)
#             #     new_y = item.cmd.get('new_y', None)
#             #     if action:
#             #         item.paddle.set_direction(item.cmd["action"])
#             #     elif new_y:
#             #         item.paddle.set_y_position(new_y)
#             #     last_timestamp = item.timestamp_sec
#             #     if score != PongBall.Scored.SCORE_NONE:
#             #         break
#         self.update_game_objects(curr_time_sec - last_timestamp)
#         try:
#             msg_server.sync_send_to_consumer(msg_server.GameUpdate(
#                 timestamp=curr_time_sec*1000,
#                 ball=self.ball.getPositionalDataAsDict(),
#                 paddle_left=self.paddle_left.getPositionalDataAsDict(),
#                 paddle_right=self.paddle_right.getPositionalDataAsDict(),
#                 tickno=self.tick_frame,
#                 invalid_ticks=invalid_tick_frames
#                 ), group_name=self.group_name)
#         except Exception as e:
#             logger.error(f"Error publishing game state: {e}")
#             self.handle_error(error=e)

#     def process_player_move_ms(self, curr_time_ms: int, tick_duration_ms: int):
#         if self.paused or self.user_disconnected:
#             self.player_move_queue.clear()
#             return
#         self.player_move_queue.sort(key=lambda x: x.timestamp_ms, reverse=True)
        

#         invalid_tick_frames: int = 0

#         last_time_ms = curr_time_ms - tick_duration_ms
#         last_timestamp: float = last_time_ms

#         paddle_left_timestamp: float = 0
#         paddle_right_timestamp: float = 0
#         if len(self.player_move_queue) > 0:
#             # print(f"\n\nmoves array: { [x.timestamp_ms for x in self.player_move_queue] }")
#             item = self.player_move_queue[-1]
#             invalid_tick_frames = max(0, math.ceil((last_time_ms - item.timestamp_ms) / tick_duration_ms))
#             # print(f"current time: {curr_time_ms}, last time: {last_time_ms}, item time: {item.timestamp_ms}")
#             revert_time = invalid_tick_frames * tick_duration_ms
#             # if (math.isclose(item.paddle.top, item.paddle.bound_top) or math.isclose(item.paddle.bottom, item.paddle.bound_bottom)) and (item.cmd["action"] == "release_down" or item.cmd["action"] == "release_up"):
#             if ((math.isclose(item.paddle.top, item.paddle.bound_top) and item.cmd["action"] == "release_up") or (math.isclose(item.paddle.bottom, item.paddle.bound_bottom) and item.cmd["action"] == "release_down")):
#                 last_timestamp = item.timestamp_ms
#                 self.player_move_queue.pop()
#             else:
#                 last_timestamp = last_time_ms - revert_time
#                 # print(f"invalid frames: {invalid_tick_frames}, revert_time: {revert_time}, start now at: {last_timestamp}")
#                 self.update_game_objects_ms(revert_time*-1)
#             # self.update_game_objects(item.timestamp_sec - last_timestamp)
#             # # print(f"first move items with same dir, time: {item.timestamp_sec - last_timestamp}, left: {self.paddle_left.dy}, right: {self.paddle_right.dy}")
#             # last_timestamp = item.timestamp_sec

#             while len(self.player_move_queue) > 0:
#                 item = self.player_move_queue.pop()
#                 score = self.update_game_objects_ms(item.timestamp_ms - last_timestamp)
#                 # # print(f"first move items with same dir, time: {item.timestamp_sec - last_timestamp}, left: {self.paddle_left.dy}, right: {self.paddle_right.dy}")
                
#                 # print(f"while ... item.timestamp_sec: {item.timestamp_ms}, last_timestamp: {last_timestamp}")
#                 item.paddle.set_direction(item.cmd["action"])
#                 # score = self.update_game_objects(item.timestamp_sec - last_timestamp)
#                 # print(f"move items time: {item.timestamp_ms - last_timestamp}, action: {item.cmd['action']}, new left: {self.paddle_left.dy}, right: {self.paddle_right.dy}")
#                 last_timestamp = item.timestamp_ms
#                 if score != PongBall.Scored.SCORE_NONE:
#                     break
        
#         self.update_game_objects_ms(curr_time_ms - last_timestamp)
#         try:
#             msg_server.sync_send_to_consumer(msg_server.GameUpdate(
#                 timestamp=curr_time_ms,
#                 ball=self.ball.getPositionalDataAsDict(),
#                 paddle_left=self.paddle_left.getPositionalDataAsDict(),
#                 paddle_right=self.paddle_right.getPositionalDataAsDict(),
#                 tickno=self.tick_frame,
#                 invalid_ticks=invalid_tick_frames
#                 ), group_name=self.group_name)
#         except Exception as e:
#             logger.error(f"Error publishing game state: {e}")
#             self.handle_error(error=e)

#     def update_game_objects(self, duration_sec: float):
#         self.paddle_left.update_pos(duration_sec)
#         self.paddle_right.update_pos(duration_sec)
#         return self.update_ball(duration_sec)

#     def update_game_objects_ms(self, duration_ms: int):
#         t:float = round(duration_ms/1000, 3)
#         self.paddle_left.update_pos(t)
#         self.paddle_right.update_pos(t)
#         return self.update_ball(t)

#     def update_ball(self, simulation_time_sec) -> PongBall.Scored:
#         score = self.ball.update_pos(simulation_time_sec, self.paddle_left, self.paddle_right)
#         if score != PongBall.Scored.SCORE_NONE:
#             if score == PongBall.Scored.SCORE_PLAYER_LEFT:
#                 self.gameResults["player_one_score"] += 1
#             elif score == PongBall.Scored.SCORE_PLAYER_RIGHT:
#                 self.gameResults["player_two_score"] += 1
#             if self.gameResults["player_one_score"] >= self.settings.max_score:
#                 self.end_game(self.gameResults["player_two_pk"], "win")
#             elif self.gameResults["player_two_score"] >= self.settings.max_score:
#                 self.end_game(self.gameResults["player_one_pk"], "win")
#         return score


#     # def run(self):
#     #     self.running = True
        
#     #     time_processing_inputs_sec: float = 0
#     #     tick_duration_sec: float = 1 / self.settings.tick_rate
#     #     tick_duration_ms: int = self.sec_to_ms(tick_duration_sec)
#     #     sleep_duration_sec: float = tick_duration_sec
#     #     game_start_time_unix_ms: int = self.get_time_ms()
#     #     self.tick_frame: int = 0
#     #     current_tick_time_ms: int = 0
#     #     max_input_timediff_ms: int = 5 * tick_duration_ms
#     #     msg_server.sync_send_to_consumer(msg_server.GameStart(timestamp=game_start_time_unix_ms), group_name=self.group_name)
#     #     start_time_sec = end_time_sec = game_start_time_perf_sec = time.perf_counter()
#     #     while self.running:
#     #         try:
#     #             time.sleep(sleep_duration_sec)
#     #             end_time_sec = time.perf_counter()
#     #             end_time_to_tick_time_diff_sec = (end_time_sec - game_start_time_perf_sec) - self.tick_frame*tick_duration_sec

#     #             self.tick_frame += 1
#     #             current_tick_time_ms = game_start_time_unix_ms + self.tick_frame*tick_duration_ms
#     #             max_past_timestamp_ms = current_tick_time_ms - max_input_timediff_ms
#     # #             print(f"current_tick_time_ms: {current_tick_time_ms}, tick_duration_ms: {tick_duration_ms}")
               
                
#     #                 # self.process_commands(cmd, current_tick_time_ms/1000, max_past_timestamp_ms/1000)
#     #             while not self.commandQueue.empty():
#     #                 cmd = self.commandQueue.get()
#     #                 self.process_commands_ms(cmd, current_tick_time_ms, max_past_timestamp_ms)
#     #                 self.commandQueue.task_done()
#     #             if not self.running:
#     # #                 # print("break game loop")
#     #                 break

#     #             # self.process_player_move(current_tick_time_ms/1000, tick_duration_sec)
#     #             self.process_player_move_ms(current_tick_time_ms, tick_duration_ms)
                
#     #             start_time_sec = time.perf_counter()
#     #             time_processing_inputs_sec = start_time_sec - end_time_sec
#     #             sleep_duration_sec = max(0.0, tick_duration_sec - (end_time_to_tick_time_diff_sec + time_processing_inputs_sec))
#     # #             # print(f"sleep duration: {sleep_duration_sec*1000}")

#     #         except Exception as e:
#     #             logger.error(f"Error during game update: {e}")
#     #             self.handle_error(error=e)

#     def run(self):
#         self.running = True
        
#         time_processing_inputs_sec: float = 0
#         tick_duration_sec: float = 1 / self.settings.tick_rate
#         sleep_duration_sec: float = tick_duration_sec
#         start_time_sec = end_time_sec = game_start_time_perf_sec = time.perf_counter()
#         game_start_time_unix_sec: float = time.time()
#         game_start_time_unix_ms: int = int(game_start_time_unix_sec*1000)
#         time_slept_sec: float = 0
#         simulation_time_sec: float = 0
#         max_input_timediff_sec: float = 5 * tick_duration_sec
#         current_time_sec = game_start_time_unix_sec

#         msg_server.sync_send_to_consumer(msg_server.GameStart(timestamp=game_start_time_unix_ms), group_name=self.group_name)
        
#         while self.running:
#             try:
#                 time.sleep(sleep_duration_sec)
#                 end_time_sec = time.perf_counter()
#                 time_slept_sec = end_time_sec - start_time_sec
                
#                 current_time_sec = game_start_time_unix_sec + (end_time_sec - game_start_time_perf_sec)
#                 simulation_time_sec = time_slept_sec + time_processing_inputs_sec
#                 max_past_timestamp_sec = current_time_sec - max_input_timediff_sec
               
                
#                 while not self.commandQueue.empty():
#                     cmd = self.commandQueue.get()
#                     self.process_commands_sec(cmd,current_time_sec, max_past_timestamp_sec)
#                     self.commandQueue.task_done()
#                 if not self.running:
#                     # print("break game loop")
#                     break

#                 self.process_player_move(current_time_sec, simulation_time_sec)
#                 # if not self.paused and not self.user_disconnected:
#                 #     self.update_game_objects(tick_duration_sec)


#                 start_time_sec = time.perf_counter()
#                 time_processing_inputs_sec = start_time_sec - end_time_sec
#                 sleep_duration_sec = max(0.0, tick_duration_sec - time_processing_inputs_sec)
#                 # print(f"sleep duration: {sleep_duration_sec*1000}")

#             except Exception as e:
#                 logger.error(f"Error during game update: {e}")
#                 self.handle_error(error=e)


#     def update_game(self, simulation_time_sec, curr_time_ms):
#         self.paddle_left.update_pos(simulation_time_sec)
#         self.paddle_right.update_pos(simulation_time_sec)
#         self.update_ball(simulation_time_sec)
#         try:
#             msg_server.sync_send_to_consumer(msg_server.GameUpdate(
#                 timestamp=curr_time_ms,
#                 ball=self.ball.getPositionalDataAsDict(),
#                 paddle_left=self.paddle_left.getPositionalDataAsDict(),
#                 paddle_right=self.paddle_right.getPositionalDataAsDict(),
#                 tickno=self.tick_frame,
#                 invalid_ticks=0
#                 ), group_name=self.group_name)
#         except Exception as e:
#             logger.error(f"Error publishing game state: {e}")
#             self.handle_error(error=e)

#     def get_initial_game_data(self, timeout_time_sec: int) -> msg_server.BaseBroadcast:
#         return msg_server.GameReady(
#             timestamp=self.get_time_ms(),
#             court=self.court.getDataAsDict(),
#             ball=self.ball.getDataAsDict(),
#             paddle_left=self.paddle_left.getDataAsDict(),
#             paddle_right=self.paddle_right.getDataAsDict(),
#             timeout_time_sec=timeout_time_sec,
#             user_id_left=self.gameResults["player_one_pk"],
#             user_id_right=self.gameResults["player_two_pk"],
#             settings= {
#                 "border_height": self.settings.border_size,
#                 "border_width": self.settings.border_size,
#                 "initial_serve_to": self.settings.initial_serve_to,
#                 "max_score": self.settings.max_score,
#                 "point_wait_time_ms": self.sec_to_ms(self.settings.point_wait_time_sec),
#                 "serve_mode": self.settings.serve_mode,
#                 "tick_rate": self.settings.tick_rate,
#                 "tick_duration_ms": int((1/self.settings.tick_rate)*1000)
#             },
#         )

#     def end_game(self, loser_user_id: int, reason: msg_server.GameEndReason):
#         if self.gameResults["player_one_pk"] == loser_user_id:
#             winner_user_id = self.gameResults["player_two_pk"]
#         elif self.gameResults["player_two_pk"] == loser_user_id:
#             winner_user_id = self.gameResults["player_one_pk"]
#         else:
#             raise ValueError("invalid user_id")
#         if reason == "surrender" or reason == "timeout" or reason == "win":
#             msg_server.sync_send_to_consumer(msg_server.GameEnd(
#                     user_id_loser=loser_user_id,
#                     user_id_winner=winner_user_id,
#                     reason=reason
#                 ), group_name=self.group_name)
#             self.running = False
#         else:
#             raise ValueError("invalid reason")


        

#     def handle_error(self, error: Exception | str):
#         errstr = f"{error}" if isinstance(error, Exception) else error
#         logger.error(f"Error: PongGame: {errstr}")
#         if not msg_server.sync_send_to_consumer(
#                 msg_server.Error(errstr, close_code=msg_server.WebsocketErrorCode.INTERNAL_ERROR),
#                 group_name=self.group_name
#             ):
#             logger.error("Error: PongGame: unable to push to consumer")
#         self.running = False
