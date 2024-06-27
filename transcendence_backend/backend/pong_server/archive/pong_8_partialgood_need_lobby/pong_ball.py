import random
import math
# from .pong_objs import PongObj, Collision
from .game_base_class import GameObjDataClass, Collision
from .pong_settings import PongSettings
from .messages_server import ServeSide, ServeMode
from .pong_paddle import PongPaddle


def calculate_random_direction(serve_to: ServeSide) -> tuple[float, float]:
    # Zufälliger Winkel im Bereich von -45 bis 45 Grad
    angle = random.uniform(-math.pi / 4, math.pi / 4)
    dx = math.cos(angle)
    dy = math.sin(angle)

    # if serve_to == ServeSide.LEFT and dx > 0:
    #     dx = -dx
    # elif serve_to == ServeSide.RIGHT and dx < 0:
    #     dx = -dx
    if serve_to == "serve-left" and dx > 0:
        dx = -dx
    elif serve_to == "serve-right" and dx < 0:
        dx = -dx

    return dx, dy


class PongBall(GameObjDataClass):
    class Scored:
        SCORE_NONE = 0
        SCORE_PLAYER_LEFT = 1
        SCORE_PLAYER_RIGHT = 2

    def __init__(self, settings: PongSettings) -> None:
        dx, dy = calculate_random_direction(settings.initial_serve_to)

        self.initial_x = (settings.width // 2 - settings.ball_width // 2)
        self.initial_y = (settings.height // 2 - settings.ball_height // 2)
        super().__init__(
            scaleX=settings.width,
            scaleY=settings.height,
            xU=self.initial_x,
            yU=self.initial_y,
            wU=settings.width,
            hU=settings.height,
            dx=dx,
            dy=dy,
            speedU=settings.ball_speed,

        )

    def _reset_position(self, score: int, serve_mode: ServeMode):
        serve_to: ServeSide
        if serve_mode == "serve-winner":
            serve_to = "serve-left" if score == PongBall.Scored.SCORE_PLAYER_LEFT else "serve-right"
        elif serve_mode == "serve-loser":
            serve_to =  "serve-right" if score == PongBall.Scored.SCORE_PLAYER_LEFT else "serve-left"
        elif serve_mode == "serve-random":
            serve_to = random.choice(["serve-left", "serve-right"])
        serve_to = "serve-left"
        self.x = self.initial_x
        self.y = self.initial_y
        self.dx, self.dy = calculate_random_direction(serve_to)

    def update_pos(self, tick: float, paddle_left: "PongPaddle", paddle_right: "PongPaddle", serveMode: ServeMode):
        self.x = self.x + tick * self.dx * self.speed_x

        self.y = self.y + tick * self.dy * self.speed_y

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
            self._reset_position(PongBall.Scored.SCORE_PLAYER_RIGHT, serveMode)
            return PongBall.Scored.SCORE_PLAYER_RIGHT
        elif self.x + self.w >= self.bound_right:
            self._reset_position(PongBall.Scored.SCORE_PLAYER_LEFT, serveMode)
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

        reduceDy = 0.5
        increaseDy = 1.5
        if ((collision == Collision.COLL_LEFT or collision == Collision.COLL_RIGHT)
                and paddle.dy == PongPaddle.Dir.UP):
            self.dy = self.dy * reduceDy if self.dy < 0 else increaseDy
        if ((collision == Collision.COLL_LEFT or collision == Collision.COLL_RIGHT)
                and paddle.dy == PongPaddle.Dir.DOWN):
            self.dy = self.dy * increaseDy if self.dy < 0 else reduceDy
        return PongBall.Scored.SCORE_NONE
