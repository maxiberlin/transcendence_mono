import math
import random
from decimal import Decimal
from enum import Enum
from .pong_settings import PongSettings, InitialServe

# def check_collision(self, obj: "PongObj"):
#     # diffL = 0
#     # diffR = 0
#     # diffT = 0
#     # diffB = 0
#     diffL: decimal; diffR: decimal; diffT: decimal; diffB: decimal
#     diffL = diffR = diffT = diffB = 0.0
#     t: bool = (self.y + self.h) > obj.y and (self.y + self.h) < obj.y + obj.h
#     if t == True: diffT = (self.y + self.h) - obj.y
#     b: bool = self.y < (obj.y + obj.h) and self.y > obj.y
#     if b == True: diffB = (obj.y + obj.h) - self.y
#     l: bool = self.x < (obj.x + obj.w) and self.x > obj.x
#     if l == True: diffL = (obj.x + obj.w) - self.x
#     r: bool = (self.x + self.w) > obj.x and (self.x + self.w) < (obj.x + obj.w)
#     if r == True: diffR = (self.x + self.w) - obj.x

#     if (diffT > 0 and diffR > 0):
#         return Collision.COLL_TOP if diffT < diffR else Collision.COLL_RIGHT
#     if (diffT > 0 and diffL > 0):
#         return Collision.COLL_TOP if diffT < diffL else Collision.COLL_LEFT
#     if (diffB > 0 and diffR > 0):
#         return Collision.COLL_BOTTOM if diffB < diffR else Collision.COLL_RIGHT
#     if (diffB > 0 and diffL > 0):
#         return Collision.COLL_BOTTOM if diffB < diffL else Collision.COLL_LEFT
#     return Collision.COLL_NONE

# def check_collision(self, obj: "PongObj"):
#     # let diffL = 0, diffR = 0, diffT = 0, diffB = 0;
#     # const t = this.y_end   > obj.y_start && this.y_end   < obj.y_end;
#     # if (t) diffT = this.y_end - obj.y_start;
#     # const b = this.y_start < obj.y_end   && this.y_start > obj.y_start;
#     # if (b) diffB = obj.y_end - this.y_start;
#     # const l = this.x_start < obj.x_end   && this.x_start > obj.x_start;
#     # if (l) diffL = obj.x_end - this.x_start;
#     # const r = this.x_end > obj.x_start   && this.x_end < obj.x_end;
#     # if (r) diffR = this.x_end - obj.x_start;

#     # # bottom and right are bigger than top and left
#     # diffBottom = obj.bottom - self.top if self.top < obj.bottom and self.top > obj.top       else 0
#     # diffRight  = self.right - obj.left if self.right > obj.left and self.right < obj.right   else 0
#     # # top and left are smaller than bottom and right
#     # diffTop    = self.bottom - obj.top if self.bottom > obj.top and self.bottom < obj.bottom else 0
#     # diffLeft   = obj.right - self.left if self.left < obj.right and self.left > obj.left     else 0

#     # bottom and right are bigger than top and left
#     diffBottom = obj.bottom - self.top if self.top < obj.bottom and self.top > obj.top       else 0
#     diffRight  = self.right - obj.left if self.right > obj.left and self.right < obj.right   else 0
#     # top and left are smaller than bottom and right
#     diffTop    = self.bottom - obj.top if self.bottom > obj.top and self.bottom < obj.bottom else 0
#     diffLeft   = obj.right - self.left if self.left < obj.right and self.left > obj.left     else 0

#     if (diffTop > 0 and diffRight > 0):
#         return Collision.COLL_TOP if diffTop < diffRight else Collision.COLL_RIGHT
#     if (diffTop > 0 and diffLeft > 0):
#         return Collision.COLL_TOP if diffTop < diffLeft else Collision.COLL_LEFT
#     if (diffBottom > 0 and diffRight > 0):
#         return Collision.COLL_BOTTOM if diffBottom < diffRight else Collision.COLL_RIGHT
#     if (diffBottom > 0 and diffLeft > 0):
#         return Collision.COLL_BOTTOM if diffBottom < diffLeft else Collision.COLL_LEFT
#     return Collision.COLL_NONE


# class Collision(Enum):
#     COLL_NONE = 0
#     COLL_TOP = 1
#     COLL_RIGHT = 2
#     COLL_BOTTOM = 3
#     COLL_LEFT = 4

#     @staticmethod
#     def get_collision_right(objA: "PongObj", objB: "PongObj", objA_dx: Decimal):
#         return abs(objA.right - objB.left) / abs(objA_dx)

#     @staticmethod
#     def get_collision_left(objA: "PongObj", objB: "PongObj", objA_dx: Decimal):
#         return abs(objB.right - objA.left) / abs(objA_dx)

#     @staticmethod
#     def get_collision_top(objA: "PongObj", objB: "PongObj", objA_dy: Decimal):
#         return abs(objA.bottom - objB.top) / abs(objA_dy)

#     @staticmethod
#     def get_collision_bottom(objA: "PongObj", objB: "PongObj", objA_dy: Decimal):
#         return abs(objB.bottom - objA.top) / abs(objA_dy)

#     @staticmethod
#     def check_collision_y(objA: "PongObj", objB: "PongObj", objA_dy: Decimal, collTypeX: "Collision", diffTimeX: Decimal):
#         if (objA_dy > 0 and objA.bottom > objB.top and objA.bottom < objB.bottom):
#             diffTimeTop = Collision.get_collision_top(objA, objB, objA_dy)
#             return Collision.COLL_TOP if diffTimeTop < diffTimeX else collTypeX
#         elif (objA_dy < 0 and objA.top < objB.bottom and objA.top > objB.top):
#             diffTimeBottom = Collision.get_collision_bottom(
#                 objA, objB, objA_dy)
#             return Collision.COLL_BOTTOM if diffTimeBottom < diffTimeX else collTypeX
#         return Collision.COLL_NONE

#     @staticmethod
#     def collision_detection(objA: "GameObjDataClass", objB: "GameObjDataClass"):

#         dx = objA.dx * objA.speed_x
#         dy = objA.dy * objA.speed_y

#         if (dx > 0 and objA.right > objB.left):
#             diffTimeRight = Collision.get_collision_right(objA, objB, dx)
#             return Collision.check_collision_y(objA, objB, dy, Collision.COLL_RIGHT, diffTimeRight)
#         elif (dx < 0 and objA.left < objB.right):
#             diffTimeLeft = Collision.get_collision_left(objA, objB, dx)
#             return Collision.check_collision_y(objA, objB, dy, Collision.COLL_LEFT, diffTimeLeft)
#         return Collision.COLL_NONE


# class PongObj:
#     def __init__(self,
#                  x: Decimal, y: Decimal,
#                  w: Decimal, h: Decimal,
#                  dx: Decimal, dy: Decimal,
#                  bound_top: Decimal, bound_bottom: Decimal,
#                  bound_left: Decimal, bound_right: Decimal) -> None:
#         self.x: Decimal = x
#         self.y: Decimal = y
#         self.w: Decimal = w
#         self.h: Decimal = h
#         self.dx: Decimal = dx
#         self.dy: Decimal = dy
#         self.bound_top: Decimal = bound_top
#         self.bound_bottom: Decimal = bound_bottom
#         self.bound_left: Decimal = bound_left
#         self.bound_right: Decimal = bound_right

#         self.speed_x: Decimal = Decimal(1)
#         self.speed_y: Decimal = Decimal(1)


# class PongObj:
#     def __init__(self,
#                  x: Decimal, y: Decimal,
#                  w: Decimal, h: Decimal,
#                  dx: Decimal, dy: Decimal,
#                  bound_top: Decimal, bound_bottom: Decimal,
#                  bound_left: Decimal, bound_right: Decimal) -> None:
#         self.x: Decimal = Decimal(x)
#         self.y: Decimal = Decimal(y)
#         self.w: Decimal = Decimal(w)
#         self.h: Decimal = Decimal(h)
#         self.dx: Decimal = Decimal(dx)
#         self.dy: Decimal = Decimal(dy)
#         self.bound_top: Decimal = Decimal(bound_top)
#         self.bound_bottom: Decimal = Decimal(bound_bottom)
#         self.bound_left: Decimal = Decimal(bound_left)
#         self.bound_right: Decimal = Decimal(bound_right)

#         self.speed_x: Decimal = Decimal(1)
#         self.speed_y: Decimal = Decimal(1)

#     @property
#     def top(self):
#         return self.y

#     @property
#     def bottom(self):
#         return self.y + self.h

#     @property
#     def left(self):
#         return self.x

#     @property
#     def right(self):
#         return self.x + self.w

#     def check_collision(self, obj: "PongObj"):
#         return Collision.collision_detection(self, obj)


# def calculate_random_direction(serve_to: InitialServe) -> tuple:
#     # Zufälliger Winkel im Bereich von -45 bis 45 Grad
#     angle = random.uniform(-math.pi / 4, math.pi / 4)
#     dx = math.cos(angle)
#     dy = math.sin(angle)

#     if serve_to == InitialServe.LEFT and dx > 0:
#         dx = -dx
#     elif serve_to == InitialServe.RIGHT and dx < 0:
#         dx = -dx

#     return dx, dy


# class PongBall(PongObj):
#     class Scored:
#         SCORE_NONE = 0
#         SCORE_PLAYER_LEFT = 1
#         SCORE_PLAYER_RIGHT = 2

#     def __init__(self, settings: PongSettings) -> None:
#         dx, dy = calculate_random_direction(settings.initial_serve_to)

#         self.inital_x = (settings.width // 2 -
#                          settings.ball_width // 2) / settings.width
#         self.initial_y = (settings.height // 2 -
#                           settings.ball_height // 2) / settings.height
#         super().__init__(
#             Decimal((settings.width // 2 -
#                     settings.ball_width // 2) / settings.width),
#             Decimal((settings.height // 2 -
#                     settings.ball_height // 2) / settings.height),
#             Decimal(settings.ball_width / settings.width),
#             Decimal(settings.ball_height / settings.height),
#             Decimal(dx),
#             Decimal(dy),
#             Decimal(settings.border_height / settings.height),
#             Decimal((settings.height - settings.border_height) / settings.height),
#             Decimal(0),
#             Decimal(1)
#         )
#         self.speed_x: Decimal = Decimal(settings.ball_speed / settings.width)
#         self.speed_y: Decimal = Decimal(settings.ball_speed / settings.height)

#     def reset_position(self, serve_to: InitialServe):
#         self.x = Decimal(self.inital_x)
#         self.y = Decimal(self.initial_y)
#         self.dx, self.dy = calculate_random_direction(serve_to)

#     def update_pos(self, tick: float, paddle_left: "PongPaddle", paddle_right: "PongPaddle"):
#         self.x = self.x + Decimal(tick) * self.dx * self.speed_x

#         self.y = self.y + Decimal(tick) * self.dy * self.speed_y

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
#             return PongBall.Scored.SCORE_PLAYER_RIGHT
#         elif self.x + self.w >= self.bound_right:
#             return PongBall.Scored.SCORE_PLAYER_LEFT

#         paddle = paddle_left if self.x <= paddle_left.x else paddle_right
#         collision = self.check_collision(paddle)

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

#         # if ((collision == Collision.COLL_LEFT or collision == Collision.COLL_RIGHT)
#         #         and paddle.dy == PongPaddle.Dir.UP):
#         #     self.dy = self.dy * 0.5 if self.dy < 0 else 1.5
#         # if ((collision == Collision.COLL_LEFT or collision == Collision.COLL_RIGHT)
#         #         and paddle.dy == PongPaddle.Dir.DOWN):
#         #     self.dy = self.dy * 1.5 if self.dy < 0 else 0.5
#         return PongBall.Scored.SCORE_NONE


# class PongPaddle(PongObj):
#     class PaddlePos:
#         LEFT = 10
#         RIGHT = 20

#     class Dir:
#         NONE = Decimal(0)
#         UP = Decimal(-1)
#         DOWN = Decimal(1)

#     def __init__(self, pos: int, settings: PongSettings) -> None:
#         x = settings.wall_dist if pos == PongPaddle.PaddlePos.LEFT else settings.width - \
#             (settings.paddle_width + settings.wall_dist)
#         super().__init__(
#             Decimal(x / settings.width),
#             Decimal((settings.height // 2 -
#                     settings.paddle_height // 2) / settings.height),
#             Decimal(settings.paddle_width / settings.width),
#             Decimal(settings.paddle_height / settings.height),
#             Decimal(PongPaddle.Dir.NONE),
#             Decimal(PongPaddle.Dir.NONE),
#             Decimal(settings.border_height / settings.height),
#             Decimal((settings.height - settings.border_height) / settings.height),
#             Decimal(0),
#             Decimal(1)
#         )
#         self.speed_y: Decimal = Decimal(
#             settings.paddle_speed / settings.height)

#     def update_pos_direct(self, y: Decimal):
#         self.y = max(self.bound_top, min(y, self.bound_bottom - self.h))

#     def update_pos_by_dir(self, tick: float):
#         new_y = self.y + Decimal(tick) * self.dy * self.speed_y
#         self.update_pos_direct(y=new_y)

#     def set_direction(self, dir: int, release: bool):
#         if release and self.dy == dir:
#             self.dy = Decimal(PongPaddle.Dir.NONE)
#         elif not release:
#             self.dy = Decimal(dir)


# import math
# import random
# import decimal
# from enum import Enum
# from .pong_settings import PongSettings, InitialServe

# class Collision(Enum):
#     COLL_NONE = 0
#     COLL_TOP = 1
#     COLL_RIGHT = 2
#     COLL_BOTTOM = 3
#     COLL_LEFT = 4

# class PongObj:
#     def __init__(self, x: decimal, y: decimal,
#                  w: decimal, h: decimal,
#                  dx: decimal, dy: decimal,
#                  bound_top: decimal, bound_bottom: decimal,
#                  bound_left: decimal, bound_right: decimal) -> None:
#         self.x: decimal = x
#         self.y: decimal = y
#         self.w: decimal = w
#         self.h: decimal = h
#         self.dx: decimal = dx
#         self.dy: decimal = dy
#         self.bound_top: decimal = bound_top
#         self.bound_bottom: decimal = bound_bottom
#         self.bound_left: decimal = bound_left
#         self.bound_right: decimal = bound_right

#         self.speed_x: decimal = 1
#         self.speed_y: decimal = 1


#     @property
#     def top(self):
#         return self.y

#     @property
#     def bottom(self):
#         return self.y + self.h

#     @property
#     def left(self):
#         return self.x

#     @property
#     def right(self):
#         return self.x + self.w

#     # def check_collision(self, obj: "PongObj"):
#     #     # diffL = 0
#     #     # diffR = 0
#     #     # diffT = 0
#     #     # diffB = 0
#     #     diffL: decimal; diffR: decimal; diffT: decimal; diffB: decimal
#     #     diffL = diffR = diffT = diffB = 0.0
#     #     t: bool = (self.y + self.h) > obj.y and (self.y + self.h) < obj.y + obj.h
#     #     if t == True: diffT = (self.y + self.h) - obj.y
#     #     b: bool = self.y < (obj.y + obj.h) and self.y > obj.y
#     #     if b == True: diffB = (obj.y + obj.h) - self.y
#     #     l: bool = self.x < (obj.x + obj.w) and self.x > obj.x
#     #     if l == True: diffL = (obj.x + obj.w) - self.x
#     #     r: bool = (self.x + self.w) > obj.x and (self.x + self.w) < (obj.x + obj.w)
#     #     if r == True: diffR = (self.x + self.w) - obj.x

#     #     if (diffT > 0 and diffR > 0):
#     #         return Collision.COLL_TOP if diffT < diffR else Collision.COLL_RIGHT
#     #     if (diffT > 0 and diffL > 0):
#     #         return Collision.COLL_TOP if diffT < diffL else Collision.COLL_LEFT
#     #     if (diffB > 0 and diffR > 0):
#     #         return Collision.COLL_BOTTOM if diffB < diffR else Collision.COLL_RIGHT
#     #     if (diffB > 0 and diffL > 0):
#     #         return Collision.COLL_BOTTOM if diffB < diffL else Collision.COLL_LEFT
#     #     return Collision.COLL_NONE


#     # def check_collision(self, obj: "PongObj"):
#     #     # let diffL = 0, diffR = 0, diffT = 0, diffB = 0;
#     #     # const t = this.y_end   > obj.y_start && this.y_end   < obj.y_end;
#     #     # if (t) diffT = this.y_end - obj.y_start;
#     #     # const b = this.y_start < obj.y_end   && this.y_start > obj.y_start;
#     #     # if (b) diffB = obj.y_end - this.y_start;
#     #     # const l = this.x_start < obj.x_end   && this.x_start > obj.x_start;
#     #     # if (l) diffL = obj.x_end - this.x_start;
#     #     # const r = this.x_end > obj.x_start   && this.x_end < obj.x_end;
#     #     # if (r) diffR = this.x_end - obj.x_start;

#     #     # # bottom and right are bigger than top and left
#     #     # diffBottom = obj.bottom - self.top if self.top < obj.bottom and self.top > obj.top       else 0
#     #     # diffRight  = self.right - obj.left if self.right > obj.left and self.right < obj.right   else 0
#     #     # # top and left are smaller than bottom and right
#     #     # diffTop    = self.bottom - obj.top if self.bottom > obj.top and self.bottom < obj.bottom else 0
#     #     # diffLeft   = obj.right - self.left if self.left < obj.right and self.left > obj.left     else 0

#     #     # bottom and right are bigger than top and left
#     #     diffBottom = obj.bottom - self.top if self.top < obj.bottom and self.top > obj.top       else 0
#     #     diffRight  = self.right - obj.left if self.right > obj.left and self.right < obj.right   else 0
#     #     # top and left are smaller than bottom and right
#     #     diffTop    = self.bottom - obj.top if self.bottom > obj.top and self.bottom < obj.bottom else 0
#     #     diffLeft   = obj.right - self.left if self.left < obj.right and self.left > obj.left     else 0

#     #     if (diffTop > 0 and diffRight > 0):
#     #         return Collision.COLL_TOP if diffTop < diffRight else Collision.COLL_RIGHT
#     #     if (diffTop > 0 and diffLeft > 0):
#     #         return Collision.COLL_TOP if diffTop < diffLeft else Collision.COLL_LEFT
#     #     if (diffBottom > 0 and diffRight > 0):
#     #         return Collision.COLL_BOTTOM if diffBottom < diffRight else Collision.COLL_RIGHT
#     #     if (diffBottom > 0 and diffLeft > 0):
#     #         return Collision.COLL_BOTTOM if diffBottom < diffLeft else Collision.COLL_LEFT
#     #     return Collision.COLL_NONE


#     def check_collision(self, obj: "PongObj"):


#         # bottom and right are bigger than top and left
#         # diffBottom = obj.bottom - self.top if self.top < obj.bottom and self.top > obj.top       else 0
#         # diffRight  = self.right - obj.left if self.right > obj.left and self.right < obj.right   else 0
#         # # top and left are smaller than bottom and right
#         # diffTop    = self.bottom - obj.top if self.bottom > obj.top and self.bottom < obj.bottom else 0
#         # diffLeft   = obj.right - self.left if self.left < obj.right and self.left > obj.left     else 0

#         # if (diffTop > 0 and diffRight > 0):
#         #     return Collision.COLL_TOP if diffTop > diffRight else Collision.COLL_RIGHT
#         # if (diffTop > 0 and diffLeft > 0):
#         #     return Collision.COLL_TOP if diffTop > diffLeft else Collision.COLL_LEFT
#         # if (diffBottom > 0 and diffRight > 0):
#         #     return Collision.COLL_BOTTOM if diffBottom > diffRight else Collision.COLL_RIGHT
#         # if (diffBottom > 0 and diffLeft > 0):
#         #     return Collision.COLL_BOTTOM if diffBottom > diffLeft else Collision.COLL_LEFT
#         # return Collision.COLL_NONE
#         # if (diffTop > 0 and diffRight > 0):
#         #     return Collision.COLL_TOP if diffTop < diffRight else Collision.COLL_RIGHT
#         # if (diffTop > 0 and diffLeft > 0):
#         #     return Collision.COLL_TOP if diffTop < diffLeft else Collision.COLL_LEFT
#         # if (diffBottom > 0 and diffRight > 0):
#         #     return Collision.COLL_BOTTOM if diffBottom < diffRight else Collision.COLL_RIGHT
#         # if (diffBottom > 0 and diffLeft > 0):
#         #     return Collision.COLL_BOTTOM if diffBottom < diffLeft else Collision.COLL_LEFT
#         # return Collision.COLL_NONE

#         dx = self.dx * self.speed_x
#         dy = self.dy * self.speed_y

#         if (dx > 0 and self.right > obj.left):
#             if (dy > 0 and self.bottom > obj.top):
#                 return Collision.COLL_TOP if (self.bottom - obj.top) < (self.right - obj.left) else Collision.COLL_LEFT
#             elif (dy < 0 and self.top < obj.bottom):
#                 return Collision.COLL_BOTTOM if (obj.bottom - self.top) < (self.right - obj.left) else Collision.COLL_LEFT
#             else:
#                 return Collision.COLL_LEFT
#         elif (dx < 0 and self.left < obj.right):
#             diffX = obj.right - self.left
#             diffTimeX = diffX / abs(dx)
#             if (dy > 0 and self.bottom > obj.top):
#                 diffY = self.bottom - obj.top
#                 diffTimeY = diffY / abs(dy)
#                 return Collision.COLL_TOP if diffTimeX  else Collision.COLL_RIGHT
#             elif (dy < 0 and self.top < obj.bottom):
#                 diffY = obj.bottom - self.top
#                 diffTimeY = diffY / abs(dy)
#                 return Collision.COLL_BOTTOM if (obj.bottom - self.top) < (obj.right - self.left) else Collision.COLL_RIGHT
#             else:
#                 return Collision.COLL_RIGHT
#         else:
#             return Collision.COLL_NONE

#         # diffRight, diffLeft, diffTop, diffBottom = 0, 0, 0, 0

#         # if (dx > 0):
#         #     diffRight = obj.left - self.right

#         # # Berechnung der Zeit bis zur Kollision basierend auf der Geschwindigkeit und Tiefe der Überschneidung
#         # time_to_collision_top = diffTop / abs(dy) if dy > 0 else float('inf')
#         # time_to_collision_bottom = diffBottom / abs(dy) if dy < 0 else float('inf')
#         # time_to_collision_left = diffLeft / abs(dx) if dx > 0 else float('inf')
#         # time_to_collision_right = diffRight / abs(dx) if dx < 0 else float('inf')

#         # # Identifikation der ersten Kollisionsseite basierend auf der kürzesten Zeit
#         # min_time = min(time_to_collision_top, time_to_collision_bottom, time_to_collision_left, time_to_collision_right)

#         # if min_time == time_to_collision_top:
#         #     return Collision.COLL_TOP
#         # elif min_time == time_to_collision_bottom:
#         #     return Collision.COLL_BOTTOM
#         # elif min_time == time_to_collision_left:
#         #     return Collision.COLL_LEFT
#         # elif min_time == time_to_collision_right:
#         #     return Collision.COLL_RIGHT
#         # else:
#         #     return Collision.COLL_NONE


# def calculate_random_direction(serve_to: InitialServe) -> tuple:
#     angle = random.uniform(-math.pi / 4, math.pi / 4)  # Zufälliger Winkel im Bereich von -45 bis 45 Grad
#     dx = math.cos(angle)
#     dy = math.sin(angle)

#     if serve_to == InitialServe.LEFT and dx > 0:
#         dx = -dx
#     elif serve_to == InitialServe.RIGHT and dx < 0:
#         dx = -dx

#     return dx, dy


# class PongBall(PongObj):
#     class Scored:
#         SCORE_NONE = 0
#         SCORE_PLAYER_LEFT = 1
#         SCORE_PLAYER_RIGHT = 2

#     def __init__(self, settings: PongSettings) -> None:
#         dx, dy = calculate_random_direction(settings.initial_serve_to)

#         self.inital_x = (settings.width // 2 - settings.ball_width // 2) / settings.width
#         self.initial_y = (settings.height // 2 - settings.ball_height // 2) / settings.height
#         super().__init__(
#             (settings.width // 2 - settings.ball_width // 2) / settings.width,
#             (settings.height // 2 - settings.ball_height // 2) / settings.height,
#             settings.ball_width / settings.width,
#             settings.ball_height / settings.height,
#             dx,
#             dy,
#             settings.border_height / settings.height,
#             (settings.height - settings.border_height) / settings.height,
#             0,
#             1
#         )
#         self.speed_x: decimal = settings.ball_speed / settings.width
#         self.speed_y: decimal = settings.ball_speed / settings.height

#     def reset_position(self, serve_to: InitialServe):
#         self.x = self.inital_x
#         self.y = self.initial_y
#         self.dx, self.dy = calculate_random_direction(serve_to)

#     def update_pos(self, tick: float, paddle_left: "PongPaddle", paddle_right: "PongPaddle"):
#         self.x = self.x + tick * self.dx * self.speed_x

#         self.y = self.y + tick * self.dy * self.speed_y

#         print("ball speed x: ", self.dx * self.speed_x)
#         print("ball speed y: ", self.dy * self.speed_y)

#         if self.dy > 0 and self.y > self.bound_bottom - self.h:
#             self.y = self.bound_bottom - self.h
#             self.dy = self.dy * -1
#         elif self.dy < 0 and self.y < self.bound_top:
#             self.y = self.bound_top
#             self.dy = self.dy * -1

#         if self.x > paddle_left.x and self.x + self.w < paddle_right.x:
#             return PongBall.Scored.SCORE_NONE

#         if self.x <= 0:
#             return PongBall.Scored.SCORE_PLAYER_RIGHT
#         elif self.x + self.w >= self.bound_right:
#             return PongBall.Scored.SCORE_PLAYER_LEFT

#         paddle = paddle_left if self.x <= paddle_left.x else paddle_right
#         collision = self.check_collision(paddle)

#         if collision == Collision.COLL_LEFT:
#             self.x = paddle.x + paddle.w
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

#         if ((collision == Collision.COLL_LEFT or collision == Collision.COLL_RIGHT)
#                 and paddle.dy == PongPaddle.Dir.UP):
#             self.dy = self.dy * 0.5 if self.dy < 0 else 1.5
#         if ((collision == Collision.COLL_LEFT or collision == Collision.COLL_RIGHT)
#                 and paddle.dy == PongPaddle.Dir.DOWN):
#             self.dy = self.dy * 1.5 if self.dy < 0 else 0.5
#         return PongBall.Scored.SCORE_NONE


# class PongPaddle(PongObj):
#     class PaddlePos:
#         LEFT = 10
#         RIGHT = 20

#     class Dir:
#         NONE = 0
#         UP = -1
#         DOWN = 1

#     def __init__(self, pos: PaddlePos, settings: PongSettings) -> None:
#         x = settings.wall_dist if pos == PongPaddle.PaddlePos.LEFT else settings.width - (settings.paddle_width + settings.wall_dist)
#         super().__init__(
#             x / settings.width,
#             (settings.height // 2 - settings.paddle_height // 2) / settings.height,
#             settings.paddle_width / settings.width,
#             settings.paddle_height / settings.height,
#             PongPaddle.Dir.NONE,
#             PongPaddle.Dir.NONE,
#             settings.border_height / settings.height,
#             (settings.height - settings.border_height) / settings.height,
#             0,
#             1
#         )
#         self.speed_y: decimal = settings.paddle_speed / settings.height

#     def update_pos_direct(self, y: int = None):
#         self.y = max(self.bound_top, min(y, self.bound_bottom - self.h))

#     def update_pos_by_dir(self, tick: int):
#         new_y = self.y + tick * self.dy * self.speed_y
#         self.update_pos_direct(y=new_y)

#     def set_direction(self, dir: Dir, release: bool):
#         if release and self.dy == dir:
#             self.dy = PongPaddle.Dir.NONE
#         elif not release:
#             self.dy = dir


# from enum import Enum
# import random
# import math
# from decimal import Decimal as decimal

# class Collision(Enum):
#     COLL_NONE = 0
#     COLL_TOP = 1
#     COLL_RIGHT = 2
#     COLL_BOTTOM = 3
#     COLL_LEFT = 4

# class PongObj:
#     def __init__(self, x: decimal, y: decimal,
#                  w: decimal, h: decimal,
#                  dx: decimal, dy: decimal,
#                  bound_top: decimal, bound_bottom: decimal,
#                  bound_left: decimal, bound_right: decimal) -> None:
#         self.x: decimal = x
#         self.y: decimal = y
#         self.w: decimal = w
#         self.h: decimal = h
#         self.dx: decimal = dx
#         self.dy: decimal = dy
#         self.bound_top: decimal = bound_top
#         self.bound_bottom: decimal = bound_bottom
#         self.bound_left: decimal = bound_left
#         self.bound_right: decimal = bound_right

#         self.speed_x: decimal = 1
#         self.speed_y: decimal = 1

#     @property
#     def top(self):
#         return self.y

#     @property
#     def bottom(self):
#         return self.y + self.h

#     @property
#     def left(self):
#         return self.x

#     @property
#     def right(self):
#         return self.x + self.w

#     def check_collision(self, paddle: "PongPaddle") -> Collision:
#         # Berechnung der Überschneidungen
#         diffBottom = paddle.bottom - self.top
#         diffTop = self.bottom - paddle.top
#         diffRight = self.right - paddle.left
#         diffLeft = paddle.right - self.left

#         # Berechnung der Zeit bis zur Kollision basierend auf der Geschwindigkeit und Tiefe der Überschneidung
#         time_to_collision_top = diffTop / abs(self.dy) if self.dy > 0 else float('inf')
#         time_to_collision_bottom = diffBottom / abs(self.dy) if self.dy < 0 else float('inf')
#         time_to_collision_left = diffLeft / abs(self.dx) if self.dx > 0 else float('inf')
#         time_to_collision_right = diffRight / abs(self.dx) if self.dx < 0 else float('inf')

#         # Identifikation der ersten Kollisionsseite basierend auf der kürzesten Zeit
#         min_time = min(time_to_collision_top, time_to_collision_bottom, time_to_collision_left, time_to_collision_right)

#         if min_time == time_to_collision_top:
#             return Collision.COLL_TOP
#         elif min_time == time_to_collision_bottom:
#             return Collision.COLL_BOTTOM
#         elif min_time == time_to_collision_left:
#             return Collision.COLL_LEFT
#         elif min_time == time_to_collision_right:
#             return Collision.COLL_RIGHT
#         else:
#             return Collision.COLL_NONE

# def calculate_random_direction(serve_to: "InitialServe") -> tuple:
#     angle = random.uniform(-math.pi / 4, math.pi / 4)  # Zufälliger Winkel im Bereich von -45 bis 45 Grad
#     dx = math.cos(angle)
#     dy = math.sin(angle)

#     if serve_to == InitialServe.LEFT and dx > 0:
#         dx = -dx
#     elif serve_to == InitialServe.RIGHT and dx < 0:
#         dx = -dx

#     return dx, dy

# class InitialServe(Enum):
#     LEFT = 1
#     RIGHT = 2

# class PongSettings:
#     def __init__(self, width, height, ball_width, ball_height, ball_speed, initial_serve_to, border_height, paddle_width, paddle_height, wall_dist, paddle_speed):
#         self.width = width
#         self.height = height
#         self.ball_width = ball_width
#         self.ball_height = ball_height
#         self.ball_speed = ball_speed
#         self.initial_serve_to = initial_serve_to
#         self.border_height = border_height
#         self.paddle_width = paddle_width
#         self.paddle_height = paddle_height
#         self.wall_dist = wall_dist
#         self.paddle_speed = paddle_speed

# class PongBall(PongObj):
#     class Scored:
#         SCORE_NONE = 0
#         SCORE_PLAYER_LEFT = 1
#         SCORE_PLAYER_RIGHT = 2

#     def __init__(self, settings: PongSettings) -> None:
#         dx, dy = calculate_random_direction(settings.initial_serve_to)

#         self.initial_x = (settings.width // 2 - settings.ball_width // 2) / settings.width
#         self.initial_y = (settings.height // 2 - settings.ball_height // 2) / settings.height
#         super().__init__(
#             self.initial_x,
#             self.initial_y,
#             settings.ball_width / settings.width,
#             settings.ball_height / settings.height,
#             dx,
#             dy,
#             settings.border_height / settings.height,
#             (settings.height - settings.border_height) / settings.height,
#             0,
#             1
#         )
#         self.speed_x: decimal = settings.ball_speed / settings.width
#         self.speed_y: decimal = settings.ball_speed / settings.height

#     def reset_position(self, serve_to: InitialServe):
#         self.x = self.initial_x
#         self.y = self.initial_y
#         self.dx, self.dy = calculate_random_direction(serve_to)


#     def update_pos(self, tick: float, paddle_left: "PongPaddle", paddle_right: "PongPaddle"):
#         self.x = self.x + tick * self.dx * self.speed_x
#         self.y = self.y + tick * self.dy * self.speed_y

#         print("ball speed x: ", self.dx * self.speed_x)
#         print("ball speed y: ", self.dy * self.speed_y)

#         if self.dy > 0 and self.bottom > self.bound_bottom:
#             self.y = self.bound_bottom - self.h
#             self.dy = self.dy * -1
#         elif self.dy < 0 and self.top < self.bound_top:
#             self.y = self.bound_top
#             self.dy = self.dy * -1

#         if self.x > paddle_left.x and self.x + self.w < paddle_right.x:
#             return PongBall.Scored.SCORE_NONE

#         if self.left <= 0:
#             return PongBall.Scored.SCORE_PLAYER_RIGHT
#         elif self.right >= self.bound_right:
#             return PongBall.Scored.SCORE_PLAYER_LEFT

#         paddle = paddle_left if self.x <= paddle_left.x else paddle_right
#         collision = self.check_collision(paddle)

#         if collision == Collision.COLL_LEFT:
#             self.x = paddle.x + paddle.w + 0.01  # Adjust position slightly to avoid immediate re-collision
#             self.dx = self.dx * -1
#             print("COLL_LEFT")
#         elif collision == Collision.COLL_RIGHT:
#             self.x = paddle.x - self.w - 0.01  # Adjust position slightly to avoid immediate re-collision
#             self.dx = self.dx * -1
#             print("COLL_RIGHT")
#         elif collision == Collision.COLL_TOP:
#             self.y = paddle.y - self.h - 0.01  # Adjust position slightly to avoid immediate re-collision
#             self.dy = self.dy * -1
#             print("COLL_TOP")
#         elif collision == Collision.COLL_BOTTOM:
#             self.y = paddle.y + paddle.h + 0.01  # Adjust position slightly to avoid immediate re-collision
#             self.dy = self.dy * -1
#             print("COLL_BOTTOM")

#         if ((collision == Collision.COLL_LEFT or collision == Collision.COLL_RIGHT)
#                 and paddle.dy == PongPaddle.Dir.UP.value):
#             self.dy = self.dy * 0.5 if self.dy < 0 else 1.5
#         if ((collision == Collision.COLL_LEFT or collision == Collision.COLL_RIGHT)
#                 and paddle.dy == PongPaddle.Dir.DOWN.value):
#             self.dy = self.dy * 1.5 if self.dy < 0 else 0.5

#         return PongBall.Scored.SCORE_NONE


# class PongPaddle(PongObj):
#     class PaddlePos(Enum):
#         LEFT = 10
#         RIGHT = 20

#     class Dir(Enum):
#         NONE = 0
#         UP = -1
#         DOWN = 1

#     def __init__(self, pos: PaddlePos, settings: PongSettings) -> None:
#         x = settings.wall_dist if pos == PongPaddle.PaddlePos.LEFT else settings.width - (settings.paddle_width + settings.wall_dist)
#         super().__init__(
#             x / settings.width,
#             (settings.height // 2 - settings.paddle_height // 2) / settings.height,
#             settings.paddle_width / settings.width,
#             settings.paddle_height / settings.height,
#             PongPaddle.Dir.NONE.value,
#             PongPaddle.Dir.NONE.value,
#             settings.border_height / settings.height,
#             (settings.height - settings.border_height) / settings.height,
#             0,
#             1
#         )
#         self.speed_y: decimal = settings.paddle_speed / settings.height

#     def update_pos_direct(self, y: int = None):
#         self.y = max(self.bound_top, min(y, self.bound_bottom - self.h))

#     def update_pos_by_dir(self, tick: int):
#         new_y = self.y + tick * self.dy * self.speed_y
#         self.update_pos_direct(y=new_y)

#     def set_direction(self, dir: Dir, release: bool):
#         if release and self.dy == dir.value:
#             self.dy = PongPaddle.Dir.NONE.value
#         elif not release:
#             self.dy = dir.value
