import random
import math
from multiprocessing.pool import ThreadPool
import time
from threading import Event, Lock
from enum import Enum
from asgiref.sync import async_to_sync

class ServeMode(Enum):
    WINNER = 1
    LOSER = 2
    RANDOM = 3

class InitialServe(Enum):
    LEFT = 1
    RIGHT = 2

class PongSettings:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PongSettings, cls).__new__(cls)
            cls._instance.init()
        return cls._instance

    def init(self) -> None:
        self.width : int = 30000
        self.height : int = 20000

        self.border_size: int = 600

        self.paddle_width: int = 600
        self.paddle_height: int = 2600
        self.paddle_speed: int = 2000
        self.wall_dist: int = 600

        self.ball_width: int = 600
        self.ball_height: int = 600
        self.ball_speed: int = 2000

        self.point_wait_time: float = 1
        self.serve_mode: ServeMode = ServeMode.WINNER
        self.initial_serve_to: InitialServe = InitialServe.LEFT
        self.max_score: int = 10  

class Collision(Enum):
    COLL_NONE = 0
    COLL_TOP = 1
    COLL_RIGHT = 2
    COLL_BOTTOM = 3
    COLL_LEFT = 4

class PongObj:
    def __init__(self, x, y, w, h, dx, dy, settings: PongSettings) -> None:
        self.x : int = x
        self.y : int = y
        self.w : int = w
        self.h : int = h
        self.dx : int = dx
        self.dy : int = dy
        self.bound_top : int = settings.border_size
        self.bound_bottom : int = settings.height - (h - settings.border_size)
        self.bound_left : int = 0
        self.bound_right : int = settings.width
        self.sett = settings

    def check_collision(self, obj: "PongObj"):
        diffL = 0
        diffR = 0
        diffT = 0
        diffB = 0
        t = self.y + self.h > obj.y and self.y + self.h < obj.y + obj.h
        if t: diffT = (self.y + self.h) - obj.y
        b = self.y < obj.y + obj.h and self.y > obj.y
        if b: diffB = obj.y + obj.h - self.y
        l = self.x < obj.x + obj.w and self.x > obj.x
        if l: diffL = obj.x + obj.w - self.x
        r = self.x + self.w > obj.x and self.x + self.w < obj.x + obj.w
        if r: diffR = self.x + self.w - obj.x

        if diffT > 0 and diffR > 0:
            return Collision.COLL_TOP if diffT < diffR else Collision.COLL_RIGHT
        if diffT > 0 and diffL > 0:
            return Collision.COLL_TOP if diffT < diffL else Collision.COLL_LEFT
        if diffB > 0 and diffR > 0:
            return Collision.COLL_BOTTOM if diffB < diffR else Collision.COLL_RIGHT
        if diffB > 0 and diffL > 0:
            return Collision.COLL_BOTTOM if diffB < diffL else Collision.COLL_LEFT
        return Collision.COLL_NONE
    

def calculate_random_direction(serve_to: InitialServe) -> tuple:
    angle = random.uniform(-math.pi / 4, math.pi / 4)  # Zufälliger Winkel im Bereich von -45 bis 45 Grad
    dx = math.cos(angle)
    dy = math.sin(angle)

    if serve_to == InitialServe.LEFT and dx > 0:
        dx = -dx
    elif serve_to == InitialServe.RIGHT and dx < 0:
        dx = -dx

    return dx, dy

class PongBall(PongObj):
    class Scored:
        SCORE_NONE = 0
        SCORE_PLAYER_LEFT = 1
        SCORE_PLAYER_RIGHT = 2

    def __init__(self, settings: PongSettings) -> None:
        dx, dy = calculate_random_direction(settings.initial_serve_to)
        super().__init__(settings.width // 2 - settings.ball_width // 2,
                         settings.height // 2 - settings.ball_height // 2,
                         settings.ball_width, settings.ball_height, dx, dy, settings)
        

    def update_pos(self, tick: int, paddle_left: "PongPaddle", paddle_right: "PongPaddle"):
        self.x = self.x + tick * self.dx
        self.y = self.y + tick * self.dy

        if self.dy > 0 and self.y > self.bound_bottom - self.h:
            self.y = self.bound_bottom - self.h
            self.dy = -self.dy
        elif self.dy < 0 and self.y < self.bound_top:
            self.y = self.bound_top
            self.dy = -self.dy

        if self.x > paddle_left.x and self.x + self.w < paddle_right.x:
            return PongBall.Scored.SCORE_NONE
        
        if (self.x <= 0):
            return PongBall.Scored.SCORE_PLAYER_RIGHT
        elif self.x >= self.sett.width:
            return PongBall.Scored.SCORE_PLAYER_LEFT

        paddle = paddle_left if self.x <= paddle_left.x else paddle_right
        collision = self.check_collision(paddle)

        if collision == Collision.COLL_LEFT:
            self.x = paddle.x + paddle.w
            self.dx = -self.dx
        if collision == Collision.COLL_RIGHT:
            self.x = paddle.x - self.w
            self.dx = -self.dx
        if collision == Collision.COLL_TOP:
            self.y = paddle.y - self.h
        if collision == Collision.COLL_BOTTOM:
            self.y = paddle.y

        if ((collision == Collision.COLL_LEFT or collision == Collision.COLL_RIGHT)
            and paddle.direction == PongPaddle.Dir.UP):
            self.dy = self.dy * 0.5 if self.dy < 0 else 1.5
        if ((collision == Collision.COLL_LEFT or collision == Collision.COLL_RIGHT)
            and paddle.direction == PongPaddle.Dir.DOWN):
            self.dy = self.dy * 1.5 if self.dy < 0 else 0.5
        return PongBall.Scored.SCORE_NONE
    

    def reset_position(self, sett: PongSettings, serve_to: str):
        self.x = sett.width // 2
        self.y = sett.height // 2
        self.dx, self.dy = calculate_random_direction(serve_to)


class PongPaddle(PongObj):
    class Dir:
        NONE = 0
        UP = -1
        DOWN = 1

    def __init__(self, side: str, settings: PongSettings) -> None:
        
        if side == 'left':
            x = settings.wall_dist
        elif side == 'right':
            x = settings.width - (settings.paddle_width + settings.wall_dist)
        else: return
        super().__init__(x,
                         settings.height // 2 - settings.paddle_height // 2,
                         settings.paddle_width,
                         settings.paddle_height,
                         0,
                         settings.paddle_speed,
                         settings)
        self.direction : int = PongPaddle.Dir.NONE

    def update_pos_direct(self, y : int = None):
        self.y = max(self.bound_top, min(y, self.bound_bottom))

    def update_pos_by_dir(self, tick : int):
        new_y = self.y + math.floor(self.dy * tick * self.direction)
        self.update_pos_direct(y=new_y)

    def set_direction(self, dir: Dir, release: bool):
        if release and self.direction == dir:
            self.direction = PongPaddle.Dir.NONE
        elif not release:
            self.direction = dir


class PongGame:
    def __init__(self, width, height, channel_layer, group_name):
        self.settings = PongSettings()
        self.ball = PongBall(400, 300, 10, 10, 1, 1, 0, height, 1)  # Beispielwerte
        self.paddle_left = PongPaddle(PongPaddle.PaddlePos.LEFT, 10, 100, 10, 100, 0, 0, 0, height, 1, 0)  # Beispielwerte
        self.paddle_right = PongPaddle(PongPaddle.PaddlePos.RIGHT, 790, 100, 10, 100, 0, 0, 0, height, 1, 0)  # Beispielwerte
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
                # Hier wird das Spiel aktualisiert
                tick_duration = time.time() - start_time
                self.paddle_left.update_pos_by_dir(tick_duration)
                self.paddle_right.update_pos_by_dir(tick_duration)
                score = self.ball.update_pos(tick_duration, self.paddle_left, self.paddle_right, self.settings)
                if score != PongBall.Scored.SCORE_NONE:
                    self.handle_score(score)
                
                # Send game state update to clients
                async_to_sync(self.channel_layer.group_send)(
                    self.group_name,
                    {
                        'type': 'game_update',
                        'message': self.get_state()
                    }
                )

            # Adjust sleep duration to maintain a target frame rate of 50ms
            elapsed_time = time.time() - start_time
            sleep_duration = max(0, 0.05 - elapsed_time)  # Ensure we wait at least 50ms
            time.sleep(sleep_duration)



    def handle_score(self, score):
        if score == PongBall.Scored.SCORE_PLAYER_LEFT:
            self.score_left += 1
        elif score == PongBall.Scored.SCORE_PLAYER_RIGHT:
            self.score_right += 1
        
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
        async_to_sync(self.channel_layer.group_send)(
            self.group_name,
            {
                'type': 'hide_ball'
            }
        )
        time.sleep(self.settings.point_wait_time)
        self.ball.reset_position(self.settings, serve_to)
        async_to_sync(self.channel_layer.group_send)(
            self.group_name,
            {
                'type': 'show_ball',
                'message': self.get_state()
            }
        )
        

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

    def get_state(self):
        return {
            'b': {
                'x': self.ball.x // self.settings.width,
                'y': self.ball.y // self.settings.height,
                'dx': self.ball.dx // self.settings.width,
                'dy': self.ball.dy // self.settings.height,
            },
            'pl': {
                'x': self.paddle_left.x // self.settings.width,
                'y': self.paddle_left.y // self.settings.height,
                'dx': self.paddle_left.dx // self.settings.width,
                'dy': self.paddle_left.dy // self.settings.height,
                'dir': self.paddle_left.direction,
                's': self.score_left,
            },
            'pr': {
                'x': self.paddle_right.x // self.settings.width,
                'y': self.paddle_right.y // self.settings.height,
                'dx': self.paddle_right.dx // self.settings.width,
                'dy': self.paddle_right.dy // self.settings.height,
                'dir': self.paddle_right.direction,
                's': self.score_right
            }
        }















# class PongGame:
#     def __init__(self, *args, **kwargs):

#         self.tick = 50

#         self.width = 300
#         self.height = 200

#         self.border_width = 6
#         self.border_height = 6

#         self.bound_top = 6
#         self.bound_bottom = self.height - 6

#         upperBound = (225 * math.pi) / 180
#         lowerBound = (135 * math.pi) / 180
#         angle = random.random() * (upperBound - lowerBound) + lowerBound
    
#         self.ball = {
#             'x': self.width // 2 - 6 // 2,
#             'y': self.height // 2 - 6 // 2,
#             'width': 6,
#             'height': 6,
#             'dx': math.cos(angle),
#             'dy': math.sin(angle),
#             'speed': 200
#         }
#         self.paddle = {
#             'width': 6,
#             'height': 26,
#             'speed': 200
#         }
#         self.paddle_left = {
#             'x': 6,
#             'y': self.height // 2 - 26 // 2,
#             'dir': 0
#         }
#         self.paddle_right = {
#             'x': self.width - 12,
#             'y': self.height // 2 - 26 // 2,
#             'dir': 0
#         }

#     def check_collision(self, side):
#         diffL = 0
#         diffR = 0
#         diffT = 0
#         diffB = 0
#         paddle = self.paddle_left if side == 'left' else self.paddle_right
#         t = self.ball['y'] + self.ball['height']   > paddle['y'] and self.ball['y'] + self.ball['height'] < paddle['y'] + paddle['height']
#         if t: diffT = (self.ball['y'] + self.ball['height']) - paddle['y']
#         b = self.ball['y'] < paddle['y'] + paddle['height']   and self.ball['y'] > paddle['y']
#         if b: diffB = paddle['y'] + paddle['height'] - self.ball['y']
#         l = self.ball['x'] < paddle['x'] + paddle['width']   and self.ball['x'] > paddle['x']
#         if l: diffL = paddle['x'] + paddle['width'] - self.ball['x']
#         r = self.ball['x'] + self.ball['width'] > paddle['x']   and self.ball['x'] + self.ball['width'] < paddle['x'] + paddle['width']
#         if r: diffR = self.ball['x'] + self.ball['width'] - paddle['x']


#         if diffT > 0 and diffR > 0:
#             return 'coll_top' if diffT < diffR else 'coll_right'
#         if diffT > 0 and diffL > 0:
#             return 'coll_top' if diffT < diffL else 'coll_left'
#         if diffB > 0 and diffR > 0:
#             return 'coll_bottom' if diffB < diffR else 'coll_right'
#         if diffB > 0 and diffL > 0:
#             return 'coll_bottom' if diffB < diffL else 'coll_left'
#         return 'coll_none'

#     def update_paddle(self, side):
#         if side == 'left':
#             new_y = self.paddle_left['y'] + self.paddle['speed'] * self.tick * self.paddle_left['dir']
#             self.paddle_left['y'] = max(self.bound_top, min(new_y, self.bound_top))
#         elif side == 'right':
#             new_y = self.paddle_right['y'] + self.paddle['speed'] * self.tick * self.paddle_right['dir']
#             self.paddle_right['y'] = max(self.bound_top, min(new_y, self.bound_top))

#     def update_ball(self):
#         self.ball['x'] = self.ball['x'] + self.tick * self.ball['dx'] * self.ball['speed']
#         self.ball['y'] = self.ball['y'] + self.tick * self.ball['dy'] * self.ball['speed']

#         if self.ball['dx'] > 0 and self.ball['x'] + self.ball['width'] > self.width:
#             self.ball['x'] = self.bound_bottom - self.ball['width']
#             self.ball['dx'] = -self.ball['dx']
#         elif self.ball['dx'] < 0 and self.ball['x'] < 0:
#             self.ball['x'] = 0
#             self.ball['dx'] = -self.ball['dx']
#         if self.ball['dy'] > 0 and self.ball['y'] > self.bound_bottom - self.ball['height']:
#             self.ball['y'] = self.bound_bottom - self.ball['height']
#             self.ball['dy'] = -self.ball['dy']
#         elif self.ball['dy'] < 0 and self.ball['y'] < self.bound_top:
#             self.ball['y'] = self.bound_top
#             self.ball['dy'] = -self.ball['dy']


