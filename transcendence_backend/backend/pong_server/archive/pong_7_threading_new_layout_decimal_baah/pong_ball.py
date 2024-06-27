import random
import math
from decimal import Decimal
# from .pong_objs import PongObj, Collision
from .game_base_class import GameObjDataClass, Collision
from .pong_settings import ServeSide, PongSettings
from .pong_paddle import PongPaddle


def calculate_random_direction(serve_to: ServeSide) -> tuple[Decimal, Decimal]:
    # Zufälliger Winkel im Bereich von -45 bis 45 Grad
    angle = random.uniform(-math.pi / 4, math.pi / 4)
    dx = math.cos(angle)
    dy = math.sin(angle)

    if serve_to == ServeSide.LEFT and dx > 0:
        dx = -dx
    elif serve_to == ServeSide.RIGHT and dx < 0:
        dx = -dx

    return Decimal(str(dx)), Decimal(str(dy))


class PongBall(GameObjDataClass):
    class Scored:
        SCORE_NONE = 0
        SCORE_PLAYER_LEFT = 1
        SCORE_PLAYER_RIGHT = 2

    def __init__(self, settings: PongSettings) -> None:
        dx, dy = calculate_random_direction(
            ServeSide.LEFT if settings.initial_serve_to == ServeSide.LEFT else ServeSide.RIGHT)

        self.inital_x = (settings.width // 2 - settings.ball_width // 2)
        self.initial_y = (settings.height // 2 -
                          settings.ball_height // 2)
        super().__init__(
            scaleX=settings.width,
            scaleY=settings.height,
            xU=(settings.width // 2 - settings.ball_width // 2),
            yU=(settings.height // 2 - settings.ball_height // 2),
            wU=settings.width,
            hU=settings.height,
            dx=dx,
            dy=dy,
            speedU=settings.ball_speed,

        )

    def reset_position(self, serve_to: ServeSide):
        self.x = Decimal(self.inital_x)
        self.y = Decimal(self.initial_y)
        self.dx, self.dy = calculate_random_direction(serve_to)

    def update_pos(self, tick: float, paddle_left: "PongPaddle", paddle_right: "PongPaddle"):
        self.x = self.x + Decimal(tick) * self.dx * self.speed_x

        self.y = self.y + Decimal(tick) * self.dy * self.speed_y

        # print("ball speed x: ", self.dx * self.speed_x)
        # print("ball speed y: ", self.dy * self.speed_y)

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
            self.x = paddle_left.x + paddle_left.w
            self.dx = self.dx * -1
            print("COLL_LEFT")
        if collision == Collision.COLL_RIGHT:
            self.x = paddle.x - self.w
            self.dx = self.dx * -1
            print("COLL_RIGHT")
        if collision == Collision.COLL_TOP:
            self.y = paddle.y - self.h
            self.dy = self.dy * -1
            print("COLL_TOP")
        if collision == Collision.COLL_BOTTOM:
            self.y = paddle.y
            self.dy = self.dy * -1
            print("COLL_BOTTOM")

        reduceDy = Decimal(0.5)
        increaseDy = Decimal(1.5)
        if ((collision == Collision.COLL_LEFT or collision == Collision.COLL_RIGHT)
                and paddle.dy == PongPaddle.Dir.UP):
            self.dy = self.dy * reduceDy if self.dy < 0 else increaseDy
        if ((collision == Collision.COLL_LEFT or collision == Collision.COLL_RIGHT)
                and paddle.dy == PongPaddle.Dir.DOWN):
            self.dy = self.dy * increaseDy if self.dy < 0 else reduceDy
        return PongBall.Scored.SCORE_NONE
