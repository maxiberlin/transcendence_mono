import math
import random
import decimal
from enum import Enum
from .pong_settings import PongSettings, InitialServe

class Collision(Enum):
    COLL_NONE = 0
    COLL_TOP = 1
    COLL_RIGHT = 2
    COLL_BOTTOM = 3
    COLL_LEFT = 4

class PongObj:
    def __init__(self, x: decimal, y: decimal,
                 w: decimal, h: decimal,
                 dx: decimal, dy: decimal,
                 bound_top: decimal, bound_bottom: decimal,
                 bound_left: decimal, bound_right: decimal) -> None:
        self.x: decimal = x
        self.y: decimal = y
        self.w: decimal = w
        self.h: decimal = h
        self.dx: decimal = dx
        self.dy: decimal = dy
        self.bound_top: decimal = bound_top
        self.bound_bottom: decimal = bound_bottom
        self.bound_left: decimal = bound_left
        self.bound_right: decimal = bound_right

    def check_collision(self, obj: "PongObj"):
        diffL = 0
        diffR = 0
        diffT = 0
        diffB = 0
        t: bool = (self.y + self.h) > obj.y and (self.y + self.h) < obj.y + obj.h
        if t == True: diffT = (self.y + self.h) - obj.y
        b: bool = self.y < (obj.y + obj.h) and self.y > obj.y
        if b == True: diffB = (obj.y + obj.h) - self.y
        l: bool = self.x < (obj.x + obj.w) and self.x > obj.x
        if l == True: diffL = (obj.x + obj.w) - self.x
        r: bool = (self.x + self.w) > obj.x and (self.x + self.w) < (obj.x + obj.w)
        if r == True: diffR = (self.x + self.w) - obj.x

        if (diffT > 0 and diffR > 0):
            return Collision.COLL_TOP if diffT < diffR else Collision.COLL_RIGHT
        if (diffT > 0 and diffL > 0):
            return Collision.COLL_TOP if diffT < diffL else Collision.COLL_LEFT
        if (diffB > 0 and diffR > 0):
            return Collision.COLL_BOTTOM if diffB < diffR else Collision.COLL_RIGHT
        if (diffB > 0 and diffL > 0):
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

        self.inital_x = (settings.width // 2 - settings.ball_width // 2) / settings.width
        self.initial_y = (settings.height // 2 - settings.ball_height // 2) / settings.height
        super().__init__(
            (settings.width // 2 - settings.ball_width // 2) / settings.width,
            (settings.height // 2 - settings.ball_height // 2) / settings.height,
            settings.ball_width / settings.width,
            settings.ball_height / settings.height,
            dx,
            dy,
            settings.border_height / settings.height,
            (settings.height - settings.border_height) / settings.height,
            0,
            1
        )
        self.speed_x: decimal = settings.ball_speed / settings.width
        self.speed_y: decimal = settings.ball_speed / settings.height

    def reset_position(self, serve_to: InitialServe):
        self.x = self.inital_x
        self.y = self.initial_y
        self.dx, self.dy = calculate_random_direction(serve_to)

    def update_pos(self, tick: float, paddle_left: "PongPaddle", paddle_right: "PongPaddle"):
        self.x = self.x + tick * self.dx * self.speed_x

        self.y = self.y + tick * self.dy * self.speed_y

        if self.dy > 0 and self.y > self.bound_bottom - self.h:
            self.y = self.bound_bottom - self.h
            self.dy = self.dy * -1
        elif self.dy < 0 and self.y < self.bound_top:
            self.y = self.bound_top
            self.dy = self.dy * -1

        if self.x > paddle_left.x and self.x + self.w < paddle_right.x:
            return PongBall.Scored.SCORE_NONE

        if self.x <= 0:
            return PongBall.Scored.SCORE_PLAYER_RIGHT
        elif self.x + self.w >= self.bound_right:
            return PongBall.Scored.SCORE_PLAYER_LEFT

        paddle = paddle_left if self.x <= paddle_left.x else paddle_right
        collision = self.check_collision(paddle)

        if collision == Collision.COLL_LEFT:
            self.x = paddle.x + paddle.w
            self.dx = self.dx * -1
        if collision == Collision.COLL_RIGHT:
            self.x = paddle.x - self.w
            self.dx = self.dx * -1
        if collision == Collision.COLL_TOP:
            self.y = paddle.y - self.h
            self.dy = self.dy * -1
        if collision == Collision.COLL_BOTTOM:
            self.y = paddle.y
            self.dy = self.dy * -1

        if ((collision == Collision.COLL_LEFT or collision == Collision.COLL_RIGHT)
                and paddle.dy == PongPaddle.Dir.UP):
            self.dy = self.dy * 0.5 if self.dy < 0 else 1.5
        if ((collision == Collision.COLL_LEFT or collision == Collision.COLL_RIGHT)
                and paddle.dy == PongPaddle.Dir.DOWN):
            self.dy = self.dy * 1.5 if self.dy < 0 else 0.5
        return PongBall.Scored.SCORE_NONE



class PongPaddle(PongObj):
    class PaddlePos:
        LEFT = 10
        RIGHT = 20

    class Dir:
        NONE = 0
        UP = -1
        DOWN = 1

    def __init__(self, pos: PaddlePos, settings: PongSettings) -> None:
        x = settings.wall_dist if pos == PongPaddle.PaddlePos.LEFT else settings.width - (settings.paddle_width + settings.wall_dist)
        super().__init__(
            x / settings.width,
            (settings.height // 2 - settings.paddle_height // 2) / settings.height,
            settings.paddle_width / settings.width,
            settings.paddle_height / settings.height,
            PongPaddle.Dir.NONE,
            PongPaddle.Dir.NONE,
            settings.border_height / settings.height,
            (settings.height - settings.border_height) / settings.height,
            0,
            1
        )
        self.speed_y: decimal = settings.paddle_speed / settings.height

    def update_pos_direct(self, y: int = None):
        self.y = max(self.bound_top, min(y, self.bound_bottom - self.h))

    def update_pos_by_dir(self, tick: int):
        new_y = self.y + tick * self.dy * self.speed_y
        self.update_pos_direct(y=new_y)

    def set_direction(self, dir: Dir, release: bool):
        if release and self.dy == dir:
            self.dy = PongPaddle.Dir.NONE
        elif not release:
            self.dy = dir