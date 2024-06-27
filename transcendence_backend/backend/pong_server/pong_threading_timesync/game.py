
import time
import queue
import threading
import logging
import random
from asgiref.sync import async_to_sync
from .pong_objs import PongBall, PongPaddle
from .pong_settings import PongSettings, InitialServe, ServeMode
from .messages import PongMessage, MessageType


logger = logging.getLogger(__name__)


class PongGame(threading.Thread):
    def __init__(self, settings: PongSettings, channel_layer, group_name, q: queue.Queue):
        super().__init__()
        self.settings = settings
        self.ball = PongBall(settings)
        self.paddle_left = PongPaddle(PongPaddle.PaddlePos.LEFT, settings)
        self.paddle_right = PongPaddle(PongPaddle.PaddlePos.RIGHT, settings)
        self.lock = threading.Lock()
        self.channel_layer = channel_layer
        self.group_name = group_name
        self.players_connected = 0
        self.score_left = 0
        self.score_right = 0
        self.pong_message = PongMessage(channel_layer, group_name)
        # self.inactivity_timer = None
        # self.inactivity_timeout = 10  # Sekunden
        self.running = False
        self.paused = False
        self.actions = q
        self.ball_reset = 0

    def run(self):
        logger.error("start the game!")
        self.running = True
        self.prev_ts = time.perf_counter()
        self.start_time = time.perf_counter()
        # self.start_inactivity_timer()
        self.sleep_duration = self.settings.tick_duration
        while self.running:
            try:
                self.update_game_loop()
            except Exception as e:
                logger.error(f"Error during game update: {e}")
                self.handle_error(error=e)

    def update_game_loop(self):
        self.handle_actions()
        if not self.paused:
            with self.lock:
                self.start_time = time.time()
                self.update_game(self.start_time -
                                 self.prev_ts, self.start_time)
        self.prev_ts = time.time()
        self.elapsed_time = self.prev_ts - self.start_time
        self.sleep_duration = max(
            0.0, self.settings.tick_duration - self.elapsed_time)
        time.sleep(self.sleep_duration)

    def handle_actions(self):
        while not self.actions.empty():
            action = self.actions.get()
            if not self.paused:
                self.process_player_input(action)
            self.actions.task_done()

    def update_game(self, tick_duration, curr_time):
        self.paddle_left.update_pos_by_dir(tick_duration)
        self.paddle_right.update_pos_by_dir(tick_duration)
        # if (self.ball_reset + self.settings.point_wait_time) > curr_time:
        #     self.ball_reset = 0
        # if (self.ball_reset == 0):
        #     score = self.ball.update_pos(tick_duration, self.paddle_left, self.paddle_right)
        #     if score != PongBall.Scored.SCORE_NONE:
        #         self.handle_score(score)

        score = self.ball.update_pos(
            tick_duration, self.paddle_left, self.paddle_right)
        if score != PongBall.Scored.SCORE_NONE:
            self.handle_score(score)
        self.publish_game_state({"real server diff": tick_duration})
        # self.reset_inactivity_timer()

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
        return random.choice([InitialServe.LEFT, InitialServe.RIGHT])

    def reset_ball(self, serve_to: InitialServe):
        try:
            async_to_sync(self.pong_message.send_to_channel_layer)(
                MessageType.HIDE_BALL,
            )
            # time.sleep(self.settings.point_wait_time)
            self.ball_reset = time.time()
            self.ball.reset_position(serve_to)
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

    def stop_game(self):
        with self.lock:
            self.running = False

    def pause_game(self):
        with self.lock:
            self.paused = True

    def resume_game(self):
        with self.lock:
            self.paused = False

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
            paddle = 'left' if player_id == 'player_one' else 'right'

            if new_y is not None:
                if paddle == 'left':
                    self.paddle_left.update_pos_direct(
                        new_y * self.settings.height)
                else:
                    self.paddle_right.update_pos_direct(
                        new_y * self.settings.height)
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

    def get_game_state(self, debug=None):
        return {
            'ball': {
                'x': self.ball.x,
                'y': self.ball.y,
                'dx': self.ball.dx * self.ball.speed_x,
                'dy': self.ball.dy * self.ball.speed_y,
            },
            'paddle_left': {
                'x': self.paddle_left.x,
                'y': self.paddle_left.y,
                'dx': 0,
                'dy': self.paddle_left.dy * self.paddle_left.speed_y,
            },
            'paddle_right': {
                'x': self.paddle_right.x,
                'y': self.paddle_right.y,
                'dx': 0,
                'dy': self.paddle_right.dy * self.paddle_right.speed_y,
            },
        }

    def publish_game_state(self, debug=None):
        try:
            async_to_sync(self.pong_message.send_to_channel_layer)(
                MessageType.GAME_UPDATE,
                self.get_game_state(debug=debug)
            )
        except Exception as e:
            logger.error(f"Error publishing game state: {e}")
            self.handle_error(error=e)

    def handle_error(self, error: Exception | str):
        errstr = f"{error}" if isinstance(error, Exception) else error
        try:
            async_to_sync(self.pong_message.send_to_channel_layer)(
                MessageType.GAME_ERROR,
                {"error": errstr}
            )
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
