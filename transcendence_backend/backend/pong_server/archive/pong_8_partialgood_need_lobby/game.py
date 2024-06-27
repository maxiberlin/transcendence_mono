import time
import queue
import threading
import logging
import random
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
# from .pong_objs import PongBall, PongPaddle
from .pong_ball import PongBall
from .pong_paddle import PongPaddle
from .pong_settings import ServeMode, PongSettings
# from .messages import PongMessage, MessageType
from .game_base import ChannelMessenger
from . import messages_server as msgServer
from .messages_server import ServeSide
from .messages_client import ClientCommand
from game.models import GameSchedule, GameResults
from channels.db import database_sync_to_async
from user.models import UserAccount
from typing import TypedDict

@database_sync_to_async
def get_game_schedule(self, schedule_id):
    try:
        return GameSchedule.objects.get(pk=schedule_id)
    except GameSchedule.DoesNotExist:
        return None


logger = logging.getLogger(__name__)


class GameResultDict(TypedDict):
    game_id: str
    game_mode: str | None
    tournament_pk: int | None
    player_one_pk: int
    player_two_pk: int
    player_one_score: int
    player_two_score: int
    winner: int | None
    loser: int | None

# class GameResults(models.Model):
# 	game_id = models.CharField(max_length=10, null=False)
# 	game_mode = models.CharField(max_length=20, null=False)
# 	tournament = models.ForeignKey(Tournament, related_name='tournament_name', on_delete=models.SET_NULL, null=True, blank=True)
# 	player_one = models.ForeignKey(UserAccount, related_name='player_one', on_delete=models.SET_NULL, null=True)
# 	player_two = models.ForeignKey(UserAccount, related_name='player_two', on_delete=models.SET_NULL, null=True)
# 	player_one_score = models.IntegerField()
# 	player_two_score = models.IntegerField()
# 	winner = models.ForeignKey(UserAccount, related_name='winner', on_delete=models.SET_NULL, null=True)
# 	loser = models.ForeignKey(UserAccount, related_name='loser', on_delete=models.SET_NULL, null=True)
# 	timestamp = models.DateTimeField(auto_now_add=True)

# 	def save(self, *args, **kwargs):
# 		if not self.winner or not self.loser:
# 			if self.player_one_score > self.player_two_score:
# 				self.winner = self.player_one
# 				self.loser = self.player_two
# 			elif self.player_two_score > self.player_one_score:
# 				self.winner = self.player_two
# 				self.loser = self.player_one
# 		super().save(*args, **kwargs)



class PongGame(threading.Thread):

    def __init__(self, settings: PongSettings, group_name: str, q: queue.Queue[ClientCommand], gameSchedule: GameSchedule, channel_alias = None):
        super().__init__()
        self.settings = settings
        self.ball = PongBall(settings)
        self.paddle_left = PongPaddle(PongPaddle.PaddlePos.LEFT, settings)
        self.paddle_right = PongPaddle(PongPaddle.PaddlePos.RIGHT, settings)
        self.channel_layer = get_channel_layer() if not channel_alias else get_channel_layer(alias=channel_alias)
        if not self.channel_layer:
            raise RuntimeError("Channel layer not found")
        self.group_name = group_name
        # self.players_connected = 0
        # self.score_left = 0
        # self.score_right = 0

        self.gameResults : GameResultDict = {
            "game_id": gameSchedule.pk,
            "game_mode": gameSchedule.game_mode,
            "tournament_pk": gameSchedule.tournament.pk if gameSchedule.tournament else None,
            "player_one_pk": gameSchedule.player_one.pk,
            "player_two_pk": gameSchedule.player_two.pk,
            "player_one_score": 0,
            "player_two_score": 0,
            "winner": None,
            "loser": None
        }

        # self.pong_message = PongMessage(channel_layer, group_name)
        self.channelMessenger = ChannelMessenger(
            room_group_name=group_name, handler_name="on_channel_message")
        # self.inactivity_timer = None
        # self.inactivity_timeout = 10  # Sekunden
        self.running = False
        self.paused = False
        self.commandQueue = q
        self.ball_reset = 0



    def process_commands(self, cmd: ClientCommand):
        try:
            match cmd["cmd"]:
                case "client-pause":
                    self.paused = True
                case "client-resume":
                    self.paused = False
                case "client-move":
                    user_id = cmd["payload"]["user_id"]
                    paddle: PongPaddle | None = None
                    if user_id == self.gameResults["player_one_pk"]:
                        paddle = self.paddle_left
                    elif user_id == self.gameResults["player_two_pk"]:
                        paddle = self.paddle_right
                    else:
                        raise ValueError("Invalid user_id")
                    paddle.set_direction2(cmd["payload"]["action"])
                case "client-leave-game-surrender":
                    self.end_game("left")
                            
        except Exception as e:
            logger.error(f"Error processing command: {e}")
            self.handle_error(error=e)




    def update_game(self, tick_duration, curr_time):
        print("updateee")
        self.paddle_left.update_pos_by_dir(tick_duration)
        self.paddle_right.update_pos_by_dir(tick_duration)
        score = PongBall.Scored.SCORE_NONE
        if (self.ball_reset > 0 and self.ball_reset < curr_time):
            self.ball_reset = 0
        if (self.ball_reset == 0):
            score = self.ball.update_pos(
                tick_duration,
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
                self.end_game("left")
            elif self.gameResults["player_two_score"] >= self.settings.max_score:
                self.end_game("right")
            else:
                 self.ball_reset = time.time() + self.settings.point_wait_time
        self.publish_game_state({"real server diff": tick_duration})



    def run(self):
        logger.error("start the game!")
        self.running = True
        self.end_time = time.perf_counter()
        self.sleep_duration = self.settings.tick_duration
        while self.running:
            try:
                self.start_time = time.time()
                while not self.commandQueue.empty():
                    action = self.commandQueue.get()
                    self.process_commands(action)
                    self.commandQueue.task_done()
                if not self.paused:
                    self.update_game(self.start_time - self.end_time, self.start_time)
                self.end_time = time.time()
                self.elapsed_time = self.end_time - self.start_time
                self.sleep_duration = max(0.0, self.settings.tick_duration - self.elapsed_time)
                time.sleep(self.sleep_duration)
            except Exception as e:
                logger.error(f"Error during game update: {e}")
                self.handle_error(error=e)



    def end_game(self, winner: str):
        try:
            self.channelMessenger.push_to_channel(
                msgServer.GameEnd("left", "right"))
            self.stop_game()
        except Exception as e:
            logger.error(f"Error ending game: {e}")
            self.handle_error(error=e)

    def stop_game(self):
        self.running = False

    def pause_game(self):
        self.paused = True

    def resume_game(self):
        self.paused = False

    def publish_game_state(self, debug=None):
        try:
            self.channelMessenger.push_to_channel(msgServer.GameUpdate(
                timestamp=time.time_ns() // 1_000_000,
                ball=self.ball.getPositionalDataAsDict(),
                paddle_left=self.paddle_left.getPositionalDataAsDict(),
                paddle_right=self.paddle_right.getPositionalDataAsDict(),
            ))
        except Exception as e:
            logger.error(f"Error publishing game state: {e}")
            self.handle_error(error=e)










    def handle_error(self, error: Exception | str):
        errstr = f"{error}" if isinstance(error, Exception) else error
        try:
            self.channelMessenger.push_to_channel(msgServer.Error(errstr))
        except Exception as e:
            logger.error(f"Error sending error message: {e}")
        self.stop_game()







    # def start_inactivity_timer(self):
    #     self.reset_inactivity_timer()

    # def reset_inactivity_timer(self):
    #     if self.inactivity_timer:
    #         self.inactivity_timer.cancel()
    #     self.inactivity_timer = threading.Timer(self.inactivity_timeout, self.handle_inactivity)
    #     self.inactivity_timer.start()

    # def handle_inactivity(self):
    #     self.handle_error(error_message="Inactivity timeout")

 # def process_player_input(self, data: dict):
    #     try:
    #         player_id = data.get('player_id')
    #         action = data.get('action')
    #         new_y = data.get('new_y')
    #         paddle = 'left' if player_id == 'player_one' else 'right'

    #         if new_y is not None:
    #             if paddle == 'left':
    #                 self.paddle_left.update_pos_direct(
    #                     new_y * self.settings.height)
    #             else:
    #                 self.paddle_right.update_pos_direct(
    #                     new_y * self.settings.height)
    #         elif action == 'up':
    #             logger.error("action up")
    #             self.set_paddle_direction(paddle, PongPaddle.Dir.UP, False)
    #         elif action == 'down':
    #             logger.error("action down")
    #             self.set_paddle_direction(paddle, PongPaddle.Dir.DOWN, False)
    #         elif action == 'release_up':
    #             logger.error("action release up")
    #             self.set_paddle_direction(paddle, PongPaddle.Dir.UP, True)
    #         elif action == 'release_down':
    #             logger.error("action release down")
    #             self.set_paddle_direction(paddle, PongPaddle.Dir.DOWN, True)

    #         self.publish_game_state()
    #     except Exception as e:
    #         logger.error(f"Error processing player input: {e}")
    #         self.handle_error(error=e)
