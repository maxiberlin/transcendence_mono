import random
import math
import time
# from .pong_objs import PongObj, Collision
from .game_base_class import GameObjDataClass, Collision
from .pong_settings import PongSettings
from .messages_server import ServeSide, ServeMode
from .pong_paddle import PongPaddle
from enum import Enum
from typing import Literal


def calculate_random_direction(serve_to: ServeSide) -> tuple[float, float]:
    angle = random.uniform(-math.pi / 4, math.pi / 4)
    dx = math.cos(angle)
    dy = math.sin(angle)
    if serve_to == "serve-left" and dx > 0:
        dx = -dx
    elif serve_to == "serve-right" and dx < 0:
        dx = -dx

    return dx, dy


class PongBall(GameObjDataClass):
    class Scored(Enum):
        SCORE_NONE = 0
        SCORE_PLAYER_LEFT = 1
        SCORE_PLAYER_RIGHT = 2

    def __init__(self, settings: PongSettings, court: GameObjDataClass) -> None:
        dx, dy = calculate_random_direction(settings.initial_serve_to)

        self.initial_x = (settings.width // 2 - settings.ball_width // 2)
        self.initial_y = (settings.height // 2 - settings.ball_height // 2)
        self.initial_x_unscaled = self.initial_x / settings.width
        self.initial_y_unscaled = self.initial_y / settings.height
        super().__init__(
            scaleX=settings.width,
            scaleY=settings.height,
            xU=self.initial_x,
            yU=self.initial_y,
            wU=settings.ball_width,
            hU=settings.ball_height,
            dx=dx,
            dy=dy,
            speedU=settings.ball_speed,
            boundObj=court
        )
        self.settings = settings
        self.ball_timeout: float | None = None
        self.serve_to: ServeSide = "serve-left"
        self.slow_serve = True
        self.extra_speedup = False
        self.maxPaddleBallDiff = (settings.ball_height/settings.height + settings.paddle_height/settings.height) / 2

    def __reset_pos(self):
        self.ball_timeout = None
        self.x = self.initial_x_unscaled
        self.y = self.initial_y_unscaled
        self.dx, self.dy = calculate_random_direction(self.serve_to)


    def __set_serve_dir(self, score: "PongBall.Scored"):
        if self.settings.serve_mode == "serve-winner":
            self.serve_to = "serve-left" if score == PongBall.Scored.SCORE_PLAYER_LEFT else "serve-right"
        elif self.settings.serve_mode == "serve-loser":
            self.serve_to =  "serve-right" if score == PongBall.Scored.SCORE_PLAYER_LEFT else "serve-left"
        elif self.settings.serve_mode == "serve-random":
            self.serve_to = random.choice(["serve-left", "serve-right"])
        self.ball_timeout = self.settings.point_wait_time_sec
        self.slow_serve = True


    def __calc_x(self, tick: float):
        spd = self.speed_x * 0.75 if self.slow_serve else self.speed_x
        spd = spd * 1.1 if self.extra_speedup else spd
        self.x = self.x + tick * self.dx * spd

    def __calc_y(self, tick: float):
        spd = self.speed_y * 0.75 if self.slow_serve else self.speed_y
        # spd = spd * 1.5 if self.extra_speedup else spd
        self.y = self.y + tick * self.dy * spd

    def __redo_dir_y(self, tick: float, time_while_collision: float):
        self.__calc_y(tick - time_while_collision)
        self.dy = self.dy*-1
        self.__calc_y(time_while_collision)

    def __redo_dir_x(self, tick: float, time_while_collision: float):
        self.__calc_x(tick - time_while_collision)
        self.dx = self.dx*-1
        self.__calc_x(time_while_collision)

    def update_pos(self, tick: float, paddle_left: "PongPaddle", paddle_right: "PongPaddle"):
        if self.ball_timeout is not None:
            if self.ball_timeout > 0:
                self.ball_timeout -= tick
                return PongBall.Scored.SCORE_NONE
            else:
                self.__reset_pos()

        self.__calc_x(tick)
        self.__calc_y(tick)
        
        diff_y = self.bottom - self.bound_bottom if self.dy > 0 else self.bound_top - self.top if self.dy < 0 else 0
        if diff_y > 0:
            self.__redo_dir_y(tick, diff_y / abs(self.dy * self.speed_y))


        if self.right <= self.bound_left:
            self.__set_serve_dir(PongBall.Scored.SCORE_PLAYER_RIGHT)
            return PongBall.Scored.SCORE_PLAYER_RIGHT
        elif self.left >= self.bound_right:
            self.__set_serve_dir(PongBall.Scored.SCORE_PLAYER_LEFT)
            return PongBall.Scored.SCORE_PLAYER_LEFT

        if self.left < paddle_left.right:
            paddle = paddle_left
            collision, time_while_collision = self.check_collision(paddle_left)
        elif self.right > paddle_right.left:
            paddle = paddle_right
            collision, time_while_collision = self.check_collision(paddle_right)
        else:
            return PongBall.Scored.SCORE_NONE

        if collision == Collision.COLL_BOTTOM or collision == Collision.COLL_TOP:
            self.__redo_dir_y(tick, time_while_collision)
            self.slow_serve = False
        elif collision == Collision.COLL_LEFT or collision == Collision.COLL_RIGHT:
            self.__redo_dir_x(tick, time_while_collision)
            self.slow_serve = False

            ball_center_y = self.top + self.h/2
            paddle_center_y = paddle.top + paddle.h/2
            diff_y_abs = abs(ball_center_y - paddle_center_y)
            rel_diff_y = diff_y_abs / self.maxPaddleBallDiff
            new_angle_rad = math.radians(rel_diff_y * 75)
            self.dx = math.cos(new_angle_rad) if collision == Collision.COLL_LEFT else math.cos(new_angle_rad)*-1
            self.dy = math.sin(new_angle_rad) if ball_center_y > paddle_center_y else math.sin(new_angle_rad)*-1
            


        # diffY = abs((self.top + self.h/2) - (paddle.top + paddle.h/2))
        # maxDiff = (paddle.h + self.h) / 2
        # rel = diffY / maxDiff

        # reduceDy = 0.5
        # increaseDy = 1.5
        # if ((collision == Collision.COLL_LEFT or collision == Collision.COLL_RIGHT) and paddle.dy == -1):
        #     self.dy = self.dy * reduceDy if self.dy < 0 else self.dy * increaseDy
        # if ((collision == Collision.COLL_LEFT or collision == Collision.COLL_RIGHT) and paddle.dy == 1):
        #     self.dy = self.dy * increaseDy if self.dy < 0 else self.dy * reduceDy
        

       
        # if collision != Collision.COLL_NONE:
        #     # if rel > 0.9 and not self.extra_speedup:
        #     if abs(relative_intersect_y) > 0.9 and not self.extra_speedup:
        #         self.extra_speedup = True
        #     else:
        #         self.extra_speedup = False

        
        return PongBall.Scored.SCORE_NONE

# def calculate_random_direction(serve_to: ServeSide) -> tuple[float, float]:
#     # Zufälliger Winkel im Bereich von -45 bis 45 Grad
#     angle = random.uniform(-math.pi / 4, math.pi / 4)
#     dx = math.cos(angle)
#     dy = math.sin(angle)

#     # if serve_to == ServeSide.LEFT and dx > 0:
#     #     dx = -dx
#     # elif serve_to == ServeSide.RIGHT and dx < 0:
#     #     dx = -dx
#     if serve_to == "serve-left" and dx > 0:
#         dx = -dx
#     elif serve_to == "serve-right" and dx < 0:
#         dx = -dx

#     return dx, dy


# class PongBall(GameObjDataClass):
#     class Scored:
#         SCORE_NONE = 0
#         SCORE_PLAYER_LEFT = 1
#         SCORE_PLAYER_RIGHT = 2

#     def __init__(self, settings: PongSettings, court: GameObjDataClass) -> None:
#         dx, dy = calculate_random_direction(settings.initial_serve_to)

#         self.initial_x = (settings.width // 2 - settings.ball_width // 2)
#         self.initial_y = (settings.height // 2 - settings.ball_height // 2)
#         self.initial_x_unscaled = self.initial_x / settings.width
#         self.initial_y_unscaled = self.initial_y / settings.height
#         super().__init__(
#             scaleX=settings.width,
#             scaleY=settings.height,
#             xU=self.initial_x,
#             yU=self.initial_y,
#             wU=settings.ball_width,
#             hU=settings.ball_height,
#             dx=dx,
#             dy=dy,
#             speedU=settings.ball_speed,
#             boundObj=court
#         )


#     def _reset_position(self, score: int, serve_mode: ServeMode):
#         serve_to: ServeSide
#         if serve_mode == "serve-winner":
#             serve_to = "serve-left" if score == PongBall.Scored.SCORE_PLAYER_LEFT else "serve-right"
#         elif serve_mode == "serve-loser":
#             serve_to =  "serve-right" if score == PongBall.Scored.SCORE_PLAYER_LEFT else "serve-left"
#         elif serve_mode == "serve-random":
#             serve_to = random.choice(["serve-left", "serve-right"])
#         serve_to = "serve-left"
#         self.x = self.initial_x_unscaled
#         self.y = self.initial_y_unscaled
#         self.dx, self.dy = calculate_random_direction(serve_to)

#     def update_pos(self, tick: float, paddle_left: "PongPaddle", paddle_right: "PongPaddle", serveMode: ServeMode):
#         self.x = self.x + tick * self.dx * self.speed_x

#         self.y = self.y + tick * self.dy * self.speed_y

#         # print("ball speed x: ", self.dx * self.speed_x)
#         # print("ball speed y: ", self.dy * self.speed_y)

#         if self.dy > 0 and self.y > self.bound_bottom - self.h:
#             self.y = self.bound_bottom - self.h
#             self.dy = self.dy * -1
#         elif self.dy < 0 and self.y < self.bound_top:
#             self.y = self.bound_top
#             self.dy = self.dy * -1

#         if self.x > paddle_left.x and self.x + self.w < paddle_right.x:
#             return PongBall.Scored.SCORE_NONE

#         if self.x <= 0:
#             self._reset_position(PongBall.Scored.SCORE_PLAYER_RIGHT, serveMode)
#             return PongBall.Scored.SCORE_PLAYER_RIGHT
#         elif self.x + self.w >= self.bound_right:
#             self._reset_position(PongBall.Scored.SCORE_PLAYER_LEFT, serveMode)
#             return PongBall.Scored.SCORE_PLAYER_LEFT

#         paddle = paddle_left if self.x <= paddle_left.x else paddle_right
#         collision = self.check_collision(paddle)

#         print(f"PONG BALL COLLISION: {collision}")

#         if collision == Collision.COLL_LEFT:
#             self.x = paddle_left.x + paddle_left.w
#             self.dx = self.dx * -1
#             print("COLL_LEFT")
#         if collision == Collision.COLL_RIGHT:
#             self.x = paddle.x - self.w
#             self.dx = self.dx * -1
#             print("COLL_RIGHT")
#         if collision == Collision.COLL_TOP:
#             self.y = paddle.y - self.h
#             self.dy = self.dy * -1
#             print("COLL_TOP")
#         if collision == Collision.COLL_BOTTOM:
#             self.y = paddle.y
#             self.dy = self.dy * -1
#             print("COLL_BOTTOM")

#         reduceDy = 0.5
#         increaseDy = 1.5
#         if ((collision == Collision.COLL_LEFT or collision == Collision.COLL_RIGHT)
#                 and paddle.dy == PongPaddle.Dir.UP):
#             self.dy = self.dy * reduceDy if self.dy < 0 else increaseDy
#         if ((collision == Collision.COLL_LEFT or collision == Collision.COLL_RIGHT)
#                 and paddle.dy == PongPaddle.Dir.DOWN):
#             self.dy = self.dy * increaseDy if self.dy < 0 else reduceDy
#         return PongBall.Scored.SCORE_NONE
