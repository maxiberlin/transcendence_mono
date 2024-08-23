import random
import math
from .dataclasses import GameObjPositionDataclass
from .GameObjDataClass import GameObjDataClass, Collision
from .PongSettings import PongSettings
from .types import ServeSide, ServeMode
from .PongPaddle import PongPaddle
from enum import Enum

class PongBallState:
    def __init__(self, initial_serve: ServeSide, serve_mode: ServeMode, timeout_time_s) -> None:
        self._serve_slow = False
        self._serve_mode = serve_mode
        self._timeout_time_s = timeout_time_s
        self._score = PongBall.Scored.SCORE_NONE
        self._serve_to: ServeSide = initial_serve
        self._timeout = 0
        self._has_timeout = False
        self._should_reset_position = False
        pass
    
    
    def get_ball_angle(self) -> tuple[float, float]:
        angle = random.uniform(-math.pi / 4, math.pi / 4)
        dx = math.cos(angle)
        dy = math.sin(angle)
        if self.serve_to == "serve-left" and dx > 0:
            dx = -dx
        elif self.serve_to == "serve-right" and dx < 0:
            dx = -dx

        return dx, dy

    def set_score(self, score: "PongBall.Scored"):
        self._score = score

    def apply_timeout(self):
        # print(f"APPLY TIMEOUT: SCORE: {self._score}")
        if self.score == PongBall.Scored.SCORE_NONE:
            return
        if self._serve_mode == "serve-winner":
            self._serve_to = "serve-left" if self._score == PongBall.Scored.SCORE_PLAYER_LEFT else "serve-right"
        elif self._serve_mode == "serve-loser":
            self._serve_to =  "serve-right" if self._score == PongBall.Scored.SCORE_PLAYER_LEFT else "serve-left"
        elif self._serve_mode == "serve-random":
            self._serve_to = random.choice(["serve-left", "serve-right"])
        self._has_timeout = True
        self._should_reset_position = True
        self._score = PongBall.Scored.SCORE_NONE
    
    @property
    def score(self):
        return self._score

    @property
    def has_timeout(self):
        return self._has_timeout

    @property
    def should_reset_position(self):
        b = self._should_reset_position
        if b == True:
            self._should_reset_position = False
        return b

    @property
    def serve_to(self):
        return self._serve_to
    
    def apply_tick(self, tick: float):
        if self._has_timeout:
            self._timeout += tick
            if self._timeout >= self._timeout_time_s:
                self._has_timeout = False
                self._timeout = 0

    



class PongBall(GameObjDataClass):
    class Scored(Enum):
        SCORE_NONE = 0
        SCORE_PLAYER_LEFT = 1
        SCORE_PLAYER_RIGHT = 2

    def __init__(self, settings: PongSettings, court: GameObjDataClass) -> None:
        self._state = PongBallState(settings.initial_serve_to, settings.serve_mode, settings.point_wait_time_sec)
        dx, dy = self.state.get_ball_angle()

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
        
        self.maxPaddleBallDiff = (settings.ball_height/settings.height + settings.paddle_height/settings.height) / 2
        self.should_reconcile = False
  

    def __calc_x(self, tick: float):
        self.x = self.x + tick * self.dx * self.speed_x

    def __calc_y(self, tick: float):
        self.y = self.y + tick * self.dy * self.speed_y

    def __redo_dir_y(self, tick: float, time_while_collision: float):
        self.__calc_y(tick - time_while_collision)
        self.dy = self.dy*-1
        self.__calc_y(time_while_collision)

    def __redo_dir_x(self, tick: float, time_while_collision: float):
        self.__calc_x(tick - time_while_collision)
        self.dx = self.dx*-1
        self.__calc_x(time_while_collision)
    
    @property
    def state(self):
        return self._state
    
    
    def reconcile_tick(self, oldState: GameObjPositionDataclass, paddle_left: "PongPaddle", paddle_right: "PongPaddle", tick_duration_s: float):
        if ( (oldState.x + self.w < paddle_left.right and self.right > self.bound_left)
            or oldState.x > paddle_right.left and self.left < self.bound_right):
            # print("PongBall reconcile_tick: True")
            super().setPositionalDataFromDataclass(oldState)
            self.__update_pos(tick_duration_s, paddle_left, paddle_right)
            self.should_reconcile = True
        # else:
        #     print("PongBall reconcile_tick: False")
    
    def update_after_reconcile(self, tick_duration_s: float, paddle_left: "PongPaddle", paddle_right: "PongPaddle"):
        if self.should_reconcile:
            # print("PongBall update_after_reconcile: True")
            self.__update_pos(tick_duration_s, paddle_left, paddle_right)
            return True
        else:
            # print("PongBall update_after_reconcile: False")
            return False
    
    def update_regular(self, tick_duration_s: float, paddle_left: "PongPaddle", paddle_right: "PongPaddle"):
        self.should_reconcile = False
        self.state.apply_tick(tick_duration_s)
        if self.state.should_reset_position:
            # print(f"PongBall update_regular: RESET POSITION: score: {self.state.score}")
            self.x = self.initial_x_unscaled
            self.y = self.initial_y_unscaled
            self.dx, self.dy = self.state.get_ball_angle()
        if not self.state.has_timeout:
            # print(f"PongBall update_regular: UPDATE: score: {self.state.score}")
            self.__update_pos(tick_duration_s, paddle_left, paddle_right)
        # else:
        #     print(f"PongBall update_regular: False: score: {self.state.score}")

    def __update_pos(self, tick: float, paddle_left: "PongPaddle", paddle_right: "PongPaddle") -> None:

        self.__calc_x(tick)
        self.__calc_y(tick)
        
        diff_y = self.bottom - self.bound_bottom if self.dy > 0 else self.bound_top - self.top if self.dy < 0 else 0
        if diff_y > 0:
            self.__redo_dir_y(tick, diff_y / abs(self.dy * self.speed_y))


        if self.right < self.bound_left and not self.should_reconcile:
            self.state.set_score(PongBall.Scored.SCORE_PLAYER_RIGHT)
        elif self.left > self.bound_right and not self.should_reconcile:
            self.state.set_score(PongBall.Scored.SCORE_PLAYER_LEFT)
        else: 
            # self.state.set_score(PongBall.Scored.SCORE_NONE)

            if self.left < paddle_left.right:
                paddle = paddle_left
                collision, time_while_collision = self.check_collision(paddle_left)
                # print(f"check collision left side: {collision}")
            elif self.right > paddle_right.left:
                paddle = paddle_right
                collision, time_while_collision = self.check_collision(paddle_right)
                # print(f"check collision right side: {collision}")
            else: return

            if collision == Collision.COLL_BOTTOM or collision == Collision.COLL_TOP:
                self.__redo_dir_y(tick, time_while_collision)
            elif collision == Collision.COLL_LEFT or collision == Collision.COLL_RIGHT:
                # print(f"COLLISION ON ONE SIDE!!!  {'left' if collision == Collision.COLL_LEFT else 'right'}")
                self.__redo_dir_x(tick, time_while_collision)

                ball_center_y = self.top + self.h/2
                paddle_center_y = paddle.top + paddle.h/2
                diff_y_abs = abs(ball_center_y - paddle_center_y)
                rel_diff_y = diff_y_abs / self.maxPaddleBallDiff
                new_angle_rad = math.radians(rel_diff_y * 60)
                self.dx = math.cos(new_angle_rad) if collision == Collision.COLL_LEFT else math.cos(new_angle_rad)*-1
                self.dy = math.sin(new_angle_rad) if ball_center_y > paddle_center_y else math.sin(new_angle_rad)*-1
        
