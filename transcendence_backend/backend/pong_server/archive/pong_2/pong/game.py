import time
import logging
import random
import asyncio
from threading import Event, Lock, Timer
from asgiref.sync import async_to_sync
from .pong_objs import PongBall, PongPaddle
from .pong_settings import PongSettings, InitialServe, ServeMode
from .messages import PongMessage, MessageType


logger = logging.getLogger(__name__)

class PongGame:
    def __init__(self, settings: PongSettings, channel_layer, group_name):
        self.settings = settings
        self.ball = PongBall(settings)
        self.paddle_left = PongPaddle(PongPaddle.PaddlePos.LEFT, settings)
        self.paddle_right = PongPaddle(PongPaddle.PaddlePos.RIGHT, settings)
        self.stop_event = Event()
        self.pause_event = Event()
        self.lock = Lock()
        self.channel_layer = channel_layer
        self.group_name = group_name
        self.players_connected = 0
        self.score_left = 0
        self.score_right = 0
        self.pong_message = PongMessage(channel_layer, group_name)
        self.inactivity_timer = None
        self.inactivity_timeout = 10  # Sekunden

    def update_game(self):
        while not self.stop_event.is_set():
            if self.pause_event.is_set():
                time.sleep(0.1)
                continue
            start_time = time.time()
            try:
                with self.lock:
                    tick_duration = self.settings.tick_duration
                    self.paddle_left.update_pos_by_dir(tick_duration)
                    self.paddle_right.update_pos_by_dir(tick_duration)
                    score = self.ball.update_pos(tick_duration, self.paddle_left, self.paddle_right, self.settings)
                    if score != PongBall.Scored.SCORE_NONE:
                        self.handle_score(score)
                    self.publish_game_state()
                    self.reset_inactivity_timer() 
                elapsed_time = time.time() - start_time
                sleep_duration = max(0, tick_duration - elapsed_time)
                time.sleep(sleep_duration)
            except Exception as e:
                logger.error(f"Error during game update: {e}")
                self.handle_error(error=e)

    def handle_score(self, score):
        if score == PongBall.Scored.SCORE_PLAYER_LEFT:
            self.score_left += 1
        elif score == PongBall.Scored.SCORE_PLAYER_RIGHT:
            self.score_right += 1

        if self.score_left >= self.settings.max_score:
            self.end_game("left")
        elif self.score_right >= self.settings.max_score:
            self.end_game("right")
        else:
            serve_to = self.determine_serve(score)
            self.reset_ball(serve_to)

    def determine_serve(self, score) -> InitialServe:
        if self.settings.serve_mode == ServeMode.WINNER:
            return InitialServe.LEFT if score == PongBall.Scored.SCORE_PLAYER_LEFT else InitialServe.RIGHT
        elif self.settings.serve_mode == ServeMode.LOSER:
            return InitialServe.RIGHT if score == PongBall.Scored.SCORE_PLAYER_LEFT else InitialServe.LEFT
        elif self.settings.serve_mode == ServeMode.RANDOM:
            return random.choice([InitialServe.LEFT, InitialServe.RIGHT])

    def reset_ball(self, serve_to: InitialServe):
        try:
            async_to_sync(self.pong_message.send_to_channel_layer)(
                MessageType.HIDE_BALL,
            )
            time.sleep(self.settings.point_wait_time)
            self.ball.reset_position(self.settings, serve_to)
            async_to_sync(self.pong_message.send_to_channel_layer)(
                MessageType.SHOW_BALL,
                self.get_game_state()
            )
        except Exception as e:
            logger.error(f"Error resetting ball: {e}")
            self.handle_error(error=e)

    def end_game(self, winner: str):
        try:
            async_to_sync(self.pong_message.send_to_channel_layer)(
                MessageType.GAME_END,
                {"winner": winner}
            )
            self.stop_game()
        except Exception as e:
            logger.error(f"Error ending game: {e}")
            self.handle_error(error=e)

    def start_game(self):
        logger.error("start the game!")
        self.stop_event.clear()
        self.pause_event.clear()
        self.start_inactivity_timer()
        self.update_game()

    def stop_game(self):
        self.stop_event.set()

    def pause_game(self):
        self.pause_event.set()

    def resume_game(self):
        self.pause_event.clear()

    def set_paddle_direction(self, paddle, direction, release):
        with self.lock:
            if paddle == 'left':
                self.paddle_left.set_direction(direction, release)
            elif paddle == 'right':
                self.paddle_right.set_direction(direction, release)


    def process_player_input(self, data: dict):
        try:
            player_id = data.get('player_id')
            action = data.get('action')
            new_y = data.get('new_y')
            # logger.error(f"input: player_id: ", player_id)
            # logger.error(f"input: action: ", action)
            # logger.error(f"input: new_y: ", new_y)
            paddle = 'left' if player_id == 'player_one' else 'right'

            if new_y is not None:
                if paddle == 'left':
                    self.paddle_left.update_pos_direct(new_y * self.settings.height)
                else:
                    self.paddle_right.update_pos_direct(new_y * self.settings.height)
            elif action == 'up':
                logger.error("action up")
                self.set_paddle_direction(paddle, PongPaddle.Dir.UP, False)
            elif action == 'down':
                logger.error("action down")
                self.set_paddle_direction(paddle, PongPaddle.Dir.DOWN, False)
            elif action == 'release_up':
                logger.error("action release up")
                self.set_paddle_direction(paddle, PongPaddle.Dir.UP, True)
            elif action == 'release_down':
                logger.error("action release down")
                self.set_paddle_direction(paddle, PongPaddle.Dir.DOWN, True)

            self.publish_game_state()
        except Exception as e:
            logger.error(f"Error processing player input: {e}")
            self.handle_error(error=e)
            

    def get_game_state(self):
        return {
            'ball': {
                'x': self.ball.x / self.settings.width,
                'y': self.ball.y / self.settings.height,
                'dx': self.ball.dx,
                'dy': self.ball.dy,
            },
            'paddle_left': {
                'x': self.paddle_left.x / self.settings.width,
                'y': self.paddle_left.y / self.settings.height,
                'dx': self.paddle_left.dx,
                'dy': self.paddle_left.dy,
                'direction': self.paddle_left.direction,
            },
            'paddle_right': {
                'x': self.paddle_right.x / self.settings.width,
                'y': self.paddle_right.y / self.settings.height,
                'dx': self.paddle_right.dx,
                'dy': self.paddle_right.dy,
                'direction': self.paddle_right.direction,
            },
            'score': {
                'left': self.score_left,
                'right': self.score_right
            }
        }
    
    # async def publish_game_state(self):
    #     try:
    #         if self.players_connected == 2:  # Check if both players are connected
    #             await self.pong_message.send_to_channel_layer(
    #                 MessageType.GAME_UPDATE,
    #                 self.get_game_state()
    #             )
    #             self.reset_inactivity_timer()  # Reset timer after activity
    #     except Exception as e:
    #         error_message = str(e)
    #         logger.error(f"Error publishing game state: {error_message}")
    #         self.handle_error(f"Error publishing game state: {error_message}")

    def publish_game_state(self):
        try:
            async_to_sync(self.pong_message.send_to_channel_layer)(
                MessageType.GAME_UPDATE,
                {'state': self.get_game_state()}
            )
        except Exception as e:
            logger.error(f"Error publishing game state: {e}")
            self.handle_error(error=e)


    def handle_error(self, error_message: str = None, error: Exception = None):
        if (error):
            errstr = f"{error}"
        elif (error_message):
            errstr = error_message
        else:
            errstr = "undefined error"
        try:
            async_to_sync(self.pong_message.send_to_channel_layer)(
                MessageType.GAME_ERROR,
                {"error": errstr}
            )
        except Exception as e:
            logger.error(f"Error sending error message: {e}")
        self.stop_game()

    def start_inactivity_timer(self):
        self.reset_inactivity_timer()

    def reset_inactivity_timer(self):
        if self.inactivity_timer:
            self.inactivity_timer.cancel()
        self.inactivity_timer = Timer(self.inactivity_timeout, self.handle_inactivity)
        self.inactivity_timer.start()

    def handle_inactivity(self):
        self.handle_error(error_message="Inactivity timeout")