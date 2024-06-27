import time
import queue
import threading
import logging

from typing import TypedDict

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

    # def __init__(self, settings: PongSettings, group_name: str, q: queue.Queue[msg_client.ClientCommand], channel_alias = None):
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
        self.ball_reset = 0
        self.user_disconnected = False


    def get_payload_user_id(self, command: msg_client.ClientCommand | msg_client.InternalCommand):
        pl = command.get("payload", None)
        if not pl:
            raise msg_server.CommandError("no payload provided", msg_server.WebsocketErrorCode.INVALID_COMMAND)
        user_id = pl.get("user_id", None)
        if not user_id or not isinstance(user_id, int):
            raise msg_server.CommandError("invalid user_id", msg_server.WebsocketErrorCode.INVALID_COMMAND)
        return pl, user_id

    def process_commands(self, cmd: msg_client.GameEngineMessage):
        try:
            command = cmd["client_command"]
            match command["cmd"]:
                
                #internal commands
                case "client-timeout":
                    pl, user_id = self.get_payload_user_id(command)
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
                    if self.paused:
                        raise msg_server.CommandError("game already running", msg_server.WebsocketErrorCode.OK)
                    self.paused = False
                    msg_client.sync_send_command_response(cmd, True, "Game resumed", msg_server.WebsocketErrorCode.OK)
                    msg_server.sync_send_to_consumer(msg_server.GameResumed(), group_name=self.group_name)
                        
                case "client-move":

                    pl, user_id = self.get_payload_user_id(command)

                    paddle: PongPaddle | None = None
                    if user_id == self.gameResults["player_one_pk"]:
                        paddle = self.paddle_left
                    elif user_id == self.gameResults["player_two_pk"]:
                        paddle = self.paddle_right
                    else:
                        raise msg_server.CommandError("invalid user_id", msg_server.WebsocketErrorCode.INVALID_COMMAND)
                    action = pl.get("action", None)
                    if not action or not isinstance(action, str):
                        raise msg_server.CommandError("invalid action", msg_server.WebsocketErrorCode.INVALID_COMMAND)
                    try:
                        paddle.set_direction2(command["action"])
                    except ValueError as e:
                        msg_client.sync_send_command_response(cmd, False, str(e), msg_server.WebsocketErrorCode.INVALID_COMMAND)
                    msg_client.sync_send_command_response(cmd, True, f"client moved {action}", msg_server.WebsocketErrorCode.OK)

                case "client-leave-game":
                    pl, user_id = self.get_payload_user_id(command)
                    self.end_game(user_id, "surrender")
                    msg_client.sync_send_command_response(cmd, True, f"client {user_id} left", msg_server.WebsocketErrorCode.OK)

                

            

        except msg_server.CommandError as e:
            logger.error(f"Error processing command: CommandResponse {e}, status_code: {e.error_code}")
            msg_client.sync_send_command_response(cmd, False, str(e), e.error_code)
        except Exception as e:
            logger.error(f"Error processing command: {e}")
            msg_client.sync_send_command_response(cmd, False, str(e), msg_server.WebsocketErrorCode.DEFAULT_ERROR)




    def update_game(self, simulation_time, curr_time):
        self.paddle_left.update_pos_by_dir(simulation_time)
        self.paddle_right.update_pos_by_dir(simulation_time)
        score = PongBall.Scored.SCORE_NONE
        if (self.ball_reset > 0 and self.ball_reset < curr_time):
            self.ball_reset = 0
        if (self.ball_reset == 0):
            score = self.ball.update_pos(
                simulation_time,
                self.paddle_left,
                self.paddle_right,
                self.settings.serve_mode
            )
        if score != PongBall.Scored.SCORE_NONE:
            if score == PongBall.Scored.SCORE_PLAYER_LEFT:
                self.gameResults["player_one_score"] += 1
            elif score == PongBall.Scored.SCORE_PLAYER_RIGHT:
                self.gameResults["player_two_score"] += 1
            if self.gameResults["player_one_score"] >= self.settings.max_score:
                self.end_game(self.gameResults["player_two_pk"], "win")
            elif self.gameResults["player_two_score"] >= self.settings.max_score:
                self.end_game(self.gameResults["player_one_pk"], "win")
            else:
                 self.ball_reset = time.time() + self.settings.point_wait_time
        try:
            msg_server.sync_send_to_consumer(msg_server.GameUpdate(
                timestamp=curr_time,
                ball=self.ball.getPositionalDataAsDict(),
                paddle_left=self.paddle_left.getPositionalDataAsDict(),
                paddle_right=self.paddle_right.getPositionalDataAsDict(),
                ), group_name=self.group_name)
        except Exception as e:
            logger.error(f"Error publishing game state: {e}")
            self.handle_error(error=e)


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
                "point_wait_time": self.settings.point_wait_time,
                "serve_mode": self.settings.serve_mode,
                "tick_duration": self.settings.tick_duration,
            },
        )

    def run(self):

        def calc_last_sim_timestamp(curr_time):
            return self.game_start_time + (curr_time - self.game_start_time_perf) * 1000

        self.running = True
        self.sleep_duration = self.settings.tick_duration
        self.end_time = time.perf_counter()
        self.start_time = self.end_time
        self.simulation_time = self.end_time - self.start_time
        self.game_start_time = self.get_time_ms()
        self.game_start_time_perf = self.end_time
        msg_server.sync_send_to_consumer(msg_server.GameStart(timestamp=self.game_start_time), group_name=self.group_name)
        while self.running:
            try:
                self.start_time = time.perf_counter()
                while not self.commandQueue.empty():
                    action = self.commandQueue.get()
                    self.process_commands(action)
                    self.commandQueue.task_done()
                if not self.running:
                    print("break game loop")
                    break
                if not self.paused and not self.user_disconnected:
                    self.update_game(self.simulation_time, calc_last_sim_timestamp(self.end_time))
                self.end_time = time.perf_counter()
                self.simulation_time = self.end_time - self.start_time
                self.sleep_duration = max(0.0, self.settings.tick_duration - self.simulation_time)
                time.sleep(self.sleep_duration)
            except Exception as e:
                logger.error(f"Error during game update: {e}")
                self.handle_error(error=e)
        print("game got stopped -> return from run()")



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

    # def push_to_consumer(self, message: msg_server.BaseBroadcast):
    #     if self.channel_layer:
    #         async_to_sync(self.channel_layer.group_send)(self.group_name, message.to_consumer_msg())

