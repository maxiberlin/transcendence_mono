import time
import random
from threading import Event, Lock
from asgiref.sync import async_to_sync
from .pong_objs import PongBall, PongPaddle
from .pong_settings import PongSettings, InitialServe, ServeMode
from .messages import PongMessage, MessageType



class PongGame:
    def __init__(self, settings: PongSettings, channel_layer, group_name):
        self.settings = settings
        self.ball = PongBall(settings)
        self.paddle_left = PongPaddle(PongPaddle.PaddlePos.LEFT, settings)
        self.paddle_right = PongPaddle(PongPaddle.PaddlePos.RIGHT, settings)
        self.stop_event = Event()
        self.lock = Lock()
        self.channel_layer = channel_layer
        self.group_name = group_name
        self.players_connected = 0
        self.score_left = 0
        self.score_right = 0



    def update_game(self):
        while not self.stop_event.is_set():
            start_time = time.time()
            with self.lock:
                self.paddle_left.update_pos_by_dir(self.settings.tick_duration)
                self.paddle_right.update_pos_by_dir(self.settings.tick_duration)
                score = self.ball.update_pos(self.settings.tick_duration, self.paddle_left, self.paddle_right, self.settings)
                if score != PongBall.Scored.SCORE_NONE:
                    self.handle_score(score)
                # Hier den Zustand des Spiels an die Clients senden
                self.publish_game_state()
            elapsed_time = time.time() - start_time
            sleep_duration = max(0, self.settings.tick_duration - elapsed_time)
            time.sleep(sleep_duration)



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
        async_to_sync(PongMessage.send_to_channel_layer)(
            self.channel_layer,
            self.group_name,
            MessageType.HIDE_BALL,
            {}
        )
        time.sleep(self.settings.point_wait_time)
        self.ball.reset_position(self.settings, serve_to)
        async_to_sync(PongMessage.send_to_channel_layer)(
            self.channel_layer,
            self.group_name,
            MessageType.SHOW_BALL,
            self.get_state()
        )



    def end_game(self, winner: str):
        async_to_sync(PongMessage.send_to_channel_layer)(
            self.channel_layer,
            self.group_name,
            MessageType.GAME_END,
            {"winner": winner}
        )
        self.stop_game()



    def start_game(self):
        self.stop_event.clear()
        self.update_game()



    def stop_game(self):
        self.stop_event.set()



    def set_paddle_direction(self, paddle, direction, release):
        with self.lock:
            if paddle == 'left':
                self.paddle_left.set_direction(direction, release)
            elif paddle == 'right':
                self.paddle_right.set_direction(direction, release)



    def process_player_input(self, player_id: str, input_data: dict):
        paddle = 'left' if player_id == 'player_one' else 'right'
        action = input_data.get('action')
        new_y = input_data.get('new_y')

        if new_y is not None:
            if paddle == 'left':
                self.paddle_left.update_pos_direct(new_y)
            else:
                self.paddle_right.update_pos_direct(new_y)
        elif action == 'up':
            self.set_paddle_direction(paddle, PongPaddle.Dir.UP, False)
        elif action == 'down':
            self.set_paddle_direction(paddle, PongPaddle.Dir.DOWN, False)
        elif action == 'release_up':
            self.set_paddle_direction(paddle, PongPaddle.Dir.UP, True)
        elif action == 'release_down':
            self.set_paddle_direction(paddle, PongPaddle.Dir.DOWN, True)

        self.publish_game_state()



    def get_state(self):
        return {
            'ball': {
                'x': self.ball.x,
                'y': self.ball.y,
                'dx': self.ball.dx,
                'dy': self.ball.dy,
            },
            'paddle_left': {
                'x': self.paddle_left.x,
                'y': self.paddle_left.y,
                'dx': self.paddle_left.dx,
                'dy': self.paddle_left.dy,
                'direction': self.paddle_left.direction,
            },
            'paddle_right': {
                'x': self.paddle_right.x,
                'y': self.paddle_right.y,
                'dx': self.paddle_right.dx,
                'dy': self.paddle_right.dy,
                'direction': self.paddle_right.direction,
            },
            'score': {
                'left': self.score_left,
                'right': self.score_right
            }
        }
    
    def publish_game_state(self):
        async_to_sync(PongMessage.send_to_channel_layer)(
            self.channel_layer,
            self.group_name,
            MessageType.GAME_UPDATE,
            self.get_state()
        )
