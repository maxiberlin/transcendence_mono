import math
import random
from enum import Enum
from .pong_settings import PongSettings, InitialServe

class Collision(Enum):
    COLL_NONE = 0
    COLL_TOP = 1
    COLL_RIGHT = 2
    COLL_BOTTOM = 3
    COLL_LEFT = 4

class PongObj:
    def __init__(self, x, y, w, h, dx, dy, bound_top, bound_bottom) -> None:
        self.x: int = x
        self.y: int = y
        self.w: int = w
        self.h: int = h
        self.dx: int = dx
        self.dy: int = dy
        self.bound_top: int = bound_top
        self.bound_bottom: int = bound_bottom

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

        super().__init__(
            settings.width // 2 - settings.ball_width // 2,
            settings.height // 2 - settings.ball_height // 2,
            settings.ball_width,
            settings.ball_height,
            dx, dy, settings.border_height, settings.height - settings.border_height
        )
        self.speed: int = settings.ball_speed

    def reset_position(self, sett: PongSettings, serve_to: InitialServe):
        self.x = sett.width // 2
        self.y = sett.height // 2
        self.dx, self.dy = calculate_random_direction(serve_to)

    def update_pos(self, tick: float, paddle_left: "PongPaddle", paddle_right: "PongPaddle", sett: PongSettings):
        self.x = self.x + tick * self.dx * self.speed

        self.y = self.y + tick * self.dy * self.speed

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
        elif self.x + self.w >= sett.width:
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
                and paddle.direction == PongPaddle.Dir.UP):
            self.dy = self.dy * 0.5 if self.dy < 0 else 1.5
        if ((collision == Collision.COLL_LEFT or collision == Collision.COLL_RIGHT)
                and paddle.direction == PongPaddle.Dir.DOWN):
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
            x, settings.height // 2 - settings.paddle_height // 2, settings.paddle_width, settings.paddle_height, 0,
            settings.paddle_speed, settings.border_height, settings.height - settings.border_height
        )
        self.speed: int = settings.paddle_speed
        self.direction: int = PongPaddle.Dir.NONE

    def update_pos_direct(self, y: int = None):
        self.y = max(self.bound_top, min(y, self.bound_bottom - self.h))

    def update_pos_by_dir(self, tick: int):
        new_y = self.y + math.floor(self.dy * tick * self.direction)
        self.update_pos_direct(y=new_y)

    def set_direction(self, dir: Dir, release: bool):
        if release and self.direction == dir:
            self.direction = PongPaddle.Dir.NONE
        elif not release:
            self.direction = dir