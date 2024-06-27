from decimal import Decimal
import dataclasses
import json
from enum import Enum
import struct
from typing import TypedDict, Literal, NotRequired
from .game_base import EnhancedJSONEncoder, dict_factory_decimal, dict_factory_str
from .messages_server import GameObjData, GameObjPositionData


from enum import Enum
from decimal import Decimal


# class Collision(Enum):
#     """
#     Enum class representing collision types.

#     Attributes:
#         COLL_NONE (int): No collision.
#         COLL_TOP (int): Collision with the top side.
#         COLL_RIGHT (int): Collision with the right side.
#         COLL_BOTTOM (int): Collision with the bottom side.
#         COLL_LEFT (int): Collision with the left side.
#     """

#     COLL_NONE = 0
#     COLL_TOP = 1
#     COLL_RIGHT = 2
#     COLL_BOTTOM = 3
#     COLL_LEFT = 4

#     @staticmethod
#     def get_collision_right(objA: "GameObjDataClass", objB: "GameObjDataClass", objA_dx: Decimal) -> Decimal:
#         """
#         Calculates the time of collision with the right side of objB.

#         Args:
#             objA (GameObjDataClass): The first game object.
#             objB (GameObjDataClass): The second game object.
#             objA_dx (Decimal): The change in x-coordinate of objA.

#         Returns:
#             Decimal: The time of collision with the right side of objB.
#         """
#         print("get_collision_right: ", abs(
#             objA.right - objB.left), abs(objA_dx))
#         if objA_dx == 0:
#             return abs(objA.right - objB.left)
#         return abs(objA.right - objB.left) / abs(objA_dx)

#     @staticmethod
#     def get_collision_left(objA: "GameObjDataClass", objB: "GameObjDataClass", objA_dx: Decimal) -> Decimal:
#         """
#         Calculates the time of collision with the left side of objB.

#         Args:
#             objA (GameObjDataClass): The first game object.
#             objB (GameObjDataClass): The second game object.
#             objA_dx (Decimal): The change in x-coordinate of objA.

#         Returns:
#             Decimal: The time of collision with the left side of objB.
#         """
#         print("get_collision_left: ", abs(objB.right - objA.left), abs(objA_dx))
#         if objA_dx == 0:
#             return abs(objB.right - objA.left)
#         return abs(objB.right - objA.left) / abs(objA_dx)

#     @staticmethod
#     def get_collision_top(objA: "GameObjDataClass", objB: "GameObjDataClass", objA_dy: Decimal) -> Decimal:
#         """
#         Calculates the time of collision with the top side of objB.

#         Args:
#             objA (GameObjDataClass): The first game object.
#             objB (GameObjDataClass): The second game object.
#             objA_dy (Decimal): The change in y-coordinate of objA.

#         Returns:
#             Decimal: The time of collision with the top side of objB.
#         """
#         print("get_collision_top: ", abs(objA.bottom - objB.top), abs(objA_dy))
#         if objA_dy == 0:
#             return abs(objA.bottom - objB.top)
#         return abs(objA.bottom - objB.top) / abs(objA_dy)

#     @staticmethod
#     def get_collision_bottom(objA: "GameObjDataClass", objB: "GameObjDataClass", objA_dy: Decimal) -> Decimal:
#         """
#         Calculates the time of collision with the bottom side of objB.

#         Args:
#             objA (GameObjDataClass): The first game object.
#             objB (GameObjDataClass): The second game object.
#             objA_dy (Decimal): The change in y-coordinate of objA.

#         Returns:
#             Decimal: The time of collision with the bottom side of objB.
#         """
#         print("get_collision_bottom: ", abs(
#             objB.bottom - objA.top), abs(objA_dy))
#         if objA_dy == 0:
#             return abs(objB.bottom - objA.top)
#         return abs(objB.bottom - objA.top) / abs(objA_dy)

#     @staticmethod
#     def check_collision_y(objA: "GameObjDataClass", objB: "GameObjDataClass", objA_dy: Decimal, collTypeX: "Collision", diffTimeX: Decimal) -> "Collision":
#         """
#         Checks for collision in the y-direction.

#         Args:
#             objA (GameObjDataClass): The first game object.
#             objB (GameObjDataClass): The second game object.
#             objA_dy (Decimal): The change in y-coordinate of objA.
#             collTypeX (Collision): The collision type in the x-direction.
#             diffTimeX (Decimal): The time of collision in the x-direction.

#         Returns:
#             Collision: The collision type in the y-direction.
#         """
#         if (objA_dy >= 0 and objA.bottom > objB.top and objA.bottom < objB.bottom):
#             diffTimeTop = Collision.get_collision_top(objA, objB, objA_dy)
#             return Collision.COLL_TOP if diffTimeTop < diffTimeX else collTypeX
#         elif (objA_dy <= 0 and objA.top < objB.bottom and objA.top > objB.top):
#             diffTimeBottom = Collision.get_collision_bottom(
#                 objA, objB, objA_dy)
#             return Collision.COLL_BOTTOM if diffTimeBottom < diffTimeX else collTypeX
#         return collTypeX

#     @staticmethod
#     def collision_detection(objA: "GameObjDataClass", objB: "GameObjDataClass") -> "Collision":
#         """
#         Performs collision detection between two game objects.

#         Args:
#             objA (GameObjDataClass): The first game object.
#             objB (GameObjDataClass): The second game object.

#         Returns:
#             Collision: The type of collision between the two game objects.
#         """
#         dx = objA.dx * objA.speed_x
#         dy = objA.dy * objA.speed_y
#         collision = Collision.COLL_NONE


#         if (dx >= 0 and objA.right > objB.left):
#             diffTimeRight = Collision.get_collision_right(objA, objB, dx)
#             collision = Collision.check_collision_y(
#                 objA, objB, dy, Collision.COLL_RIGHT, diffTimeRight)
#         elif (dx <= 0 and objA.left < objB.right):
#             diffTimeLeft = Collision.get_collision_left(objA, objB, dx)
#             collision = Collision.check_collision_y(
#                 objA, objB, dy, Collision.COLL_LEFT, diffTimeLeft)
#         return collision


class Collision(Enum):
    """
    Enum class representing collision types.

    Attributes:
        COLL_NONE (int): No collision.
        COLL_TOP (int): Collision with the top side.
        COLL_RIGHT (int): Collision with the right side.
        COLL_BOTTOM (int): Collision with the bottom side.
        COLL_LEFT (int): Collision with the left side.
    """

    COLL_NONE = 0
    COLL_TOP = 1
    COLL_RIGHT = 2
    COLL_BOTTOM = 3
    COLL_LEFT = 4

    @staticmethod
    def get_collision_right(objA: "GameObjDataClass", objB: "GameObjDataClass", veloAx: Decimal) -> Decimal:
        """
        Calculates the time of collision with the right side of objB.

        Args:
            objA (GameObjDataClass): The first game object.
            objB (GameObjDataClass): The second game object.
            objA_dx (Decimal): The change in x-coordinate of objA.

        Returns:
            Decimal: The time of collision with the right side of objB.
        """
        print("get_collision_right: ", abs(
            objA.right - objB.left), abs(veloAx))
        if veloAx == 0:
            return abs(objA.right - objB.left)
        return abs(objA.right - objB.left) / abs(veloAx)

    @staticmethod
    def get_collision_left(objA: "GameObjDataClass", objB: "GameObjDataClass", veloAx: Decimal) -> Decimal:
        """
        Calculates the time of collision with the left side of objB.

        Args:
            objA (GameObjDataClass): The first game object.
            objB (GameObjDataClass): The second game object.
            objA_dx (Decimal): The change in x-coordinate of objA.

        Returns:
            Decimal: The time of collision with the left side of objB.
        """
        print("get_collision_left: ", abs(objB.right - objA.left), abs(veloAx))
        if veloAx == 0:
            return abs(objB.right - objA.left)
        return abs(objB.right - objA.left) / abs(veloAx)

    @staticmethod
    def get_collision_top(objA: "GameObjDataClass", objB: "GameObjDataClass", veloAy: Decimal) -> Decimal:
        """
        Calculates the time of collision with the top side of objB.

        Args:
            objA (GameObjDataClass): The first game object.
            objB (GameObjDataClass): The second game object.
            objA_dy (Decimal): The change in y-coordinate of objA.

        Returns:
            Decimal: The time of collision with the top side of objB.
        """
        print("get_collision_top: ", abs(objA.bottom - objB.top), abs(veloAy))
        if veloAy == 0:
            return abs(objA.bottom - objB.top)
        return abs(objA.bottom - objB.top) / abs(veloAy)

    @staticmethod
    def get_collision_bottom(objA: "GameObjDataClass", objB: "GameObjDataClass", veloAy: Decimal) -> Decimal:
        """
        Calculates the time of collision with the bottom side of objB.

        Args:
            objA (GameObjDataClass): The first game object.
            objB (GameObjDataClass): The second game object.
            objA_dy (Decimal): The change in y-coordinate of objA.

        Returns:
            Decimal: The time of collision with the bottom side of objB.
        """
        print("get_collision_bottom: ", abs(
            objB.bottom - objA.top), abs(veloAy))
        if veloAy == 0:
            return abs(objB.bottom - objA.top)
        return abs(objB.bottom - objA.top) / abs(veloAy)

    @staticmethod
    def check_collision_y(objA: "GameObjDataClass", objB: "GameObjDataClass", veloAy: Decimal, collTypeX: "Collision", diffTimeX: Decimal) -> "Collision":
        """
        Checks for collision in the y-direction.

        Args:
            objA (GameObjDataClass): The first game object.
            objB (GameObjDataClass): The second game object.
            objA_dy (Decimal): The change in y-coordinate of objA.
            collTypeX (Collision): The collision type in the x-direction.
            diffTimeX (Decimal): The time of collision in the x-direction.

        Returns:
            Collision: The collision type in the y-direction.
        """
        if (veloAy > 0 and objA.bottom > objB.top and objA.bottom < objB.bottom):
            print(
                "veloAy > 0 and objBall.bottom > objPaddle.top and objBall.bottom < objPaddle.bottom")
            diffTimeTop = Collision.get_collision_top(objA, objB, veloAy)
            return Collision.COLL_BOTTOM if diffTimeTop < diffTimeX else collTypeX
        elif (veloAy < 0 and objA.top < objB.bottom and objA.top > objB.top):
            print(
                "veloAy < 0 and objBall.top < objPaddle.bottom and objBall.top > objPaddle.top")
            diffTimeBottom = Collision.get_collision_bottom(
                objA, objB, veloAy)
            return Collision.COLL_TOP if diffTimeBottom < diffTimeX else collTypeX
        return collTypeX

    @staticmethod
    def collision_detection(objA: "GameObjDataClass", objB: "GameObjDataClass") -> "Collision":
        """
        Performs collision detection between two game objects.

        Args:
            objA (GameObjDataClass): The first game object.
            objB (GameObjDataClass): The second game object.

        Returns:
            Collision: The type of collision between the two game objects.
        """

        collision = Collision.COLL_NONE
        diffTime = Decimal('Infinity')

        relVeloX = objA.dx * objA.speed_x - objB.dx * objB.speed_x
        relVeloY = objA.dy * objA.speed_y - objB.dy * objB.speed_y

        print(f"relVeloX: {relVeloX}, relVeloY: {relVeloY}")

        if (relVeloX > 0 and objA.right > objB.left and objA.right < objB.right):
            diffTime = Collision.get_collision_right(objA, objB, relVeloX)
            collision = Collision.COLL_RIGHT
            # return Collision.check_collision_y(
            #     objA, objB, relVeloY, Collision.COLL_RIGHT, diffTime)
        elif (relVeloX < 0 and objA.left < objB.right and objA.left > objB.left):
            diffTime = Collision.get_collision_left(objA, objB, relVeloX)
            collision = Collision.COLL_LEFT

        print(f"diffTime: {diffTime}")
        print("collision: ", collision)

        return Collision.check_collision_y(
            objA, objB, relVeloY, collision, diffTime)

        # collision = Collision.COLL_NONE
        # diffTimeRight = 0

        # relVeloX = objA.dx * objA.speed_x - objB.dx * objB.speed_x
        # relVeloY = objA.dy * objA.speed_y - objB.dy * objB.speed_y

        # if (relVeloX > 0 and objA.right > objB.left):
        #     diffTimeRight = Collision.get_collision_right(objA, objB, relVeloX)
        #     collision = Collision.COLL_RIGHT
        #     return Collision.check_collision_y(
        #         objA, objB, relVeloY, Collision.COLL_RIGHT, diffTimeRight)
        # elif (relVeloX < 0 and objA.left < objB.right):
        #     diffTimeLeft = Collision.get_collision_left(objA, objB, relVeloX)
        #     collision = Collision.COLL_RIGHT
        #     return Collision.check_collision_y(
        #         objA, objB, relVeloY, Collision.COLL_LEFT, diffTimeLeft)
        # return Collision.COLL_NONE


@dataclasses.dataclass(slots=True)
class GameObjDataClass:
    """
    Represents the data of a game object in the Pong game.

    Attributes:
        x (Decimal): The x-coordinate of the object.
        y (Decimal): The y-coordinate of the object.
        w (Decimal): The width of the object.
        h (Decimal): The height of the object.
        left (Decimal): The left boundary of the object.
        right (Decimal): The right boundary of the object.
        top (Decimal): The top boundary of the object.
        bottom (Decimal): The bottom boundary of the object.
        speed_x (Decimal): The speed of the object in the x-direction.
        speed_y (Decimal): The speed of the object in the y-direction.
        bound_top (Decimal): The top boundary of the object's bounding box.
        bound_bottom (Decimal): The bottom boundary of the object's bounding box.
        bound_left (Decimal): The left boundary of the object's bounding box.
        bound_right (Decimal): The right boundary of the object's bounding box.
        scaleX (int): The scaling factor in the x-direction.
        scaleY (int): The scaling factor in the y-direction.
        xU (int): The x-coordinate in the unscaled coordinate system.
        yU (int): The y-coordinate in the unscaled coordinate system.
        wU (int): The width in the unscaled coordinate system.
        hU (int): The height in the unscaled coordinate system.
        dx (Decimal): The change in x-coordinate per update.
        dy (Decimal): The change in y-coordinate per update.
        speedU (int): The speed in the unscaled coordinate system.
        boundObj (GameObjDataClass | None): The bounding object.

    Methods:
        __post_init__: Initializes the object after it has been created.
        getDataAsDict: Returns the object's data as a dictionary.
        getDataAsJSON: Returns the object's data as a JSON string.
        getPositionalDataAsDict: Returns the object's positional data as a dictionary.
        getPositionalDataAsJSON: Returns the object's positional data as a JSON string.
        getPositionalDataAsBinary: Returns the object's positional data as binary.
        check_collision: Checks if the object collides with another object.
        update_pos: Updates the object's position.
    """

    x: Decimal = dataclasses.field(init=False)
    y: Decimal = dataclasses.field(init=False)
    w: Decimal = dataclasses.field(init=False)
    h: Decimal = dataclasses.field(init=False)
    left: Decimal = dataclasses.field(init=False)
    right: Decimal = dataclasses.field(init=False)
    top: Decimal = dataclasses.field(init=False)
    bottom: Decimal = dataclasses.field(init=False)
    speed_x: Decimal = dataclasses.field(init=False)
    speed_y: Decimal = dataclasses.field(init=False)
    bound_top: Decimal = dataclasses.field(init=False)
    bound_bottom: Decimal = dataclasses.field(init=False)
    bound_left: Decimal = dataclasses.field(init=False)
    bound_right: Decimal = dataclasses.field(init=False)
    scaleX: dataclasses.InitVar[int]
    scaleY: dataclasses.InitVar[int]
    xU: dataclasses.InitVar[int]
    yU: dataclasses.InitVar[int]
    wU: dataclasses.InitVar[int]
    hU: dataclasses.InitVar[int]
    dx: Decimal = Decimal(0)
    dy: Decimal = Decimal(0)
    speedU: dataclasses.InitVar[int] = 0
    boundObj: dataclasses.InitVar["GameObjDataClass | None"] = None

    def __post_init__(self,
                      scaleX: int, scaleY: int,
                      xU: int, yU: int,
                      wU: int, hU: int,
                      speedU: int = 0,
                      boundObj: "GameObjDataClass | None" = None):
        """
        Initializes the object after it has been created.

        Args:
            scaleX (int): The scaling factor in the x-direction.
            scaleY (int): The scaling factor in the y-direction.
            xU (int): The x-coordinate in the unscaled coordinate system.
            yU (int): The y-coordinate in the unscaled coordinate system.
            wU (int): The width in the unscaled coordinate system.
            hU (int): The height in the unscaled coordinate system.
            speedU (int, optional): The speed in the unscaled coordinate system. Defaults to 0.
            boundObj (GameObjDataClass | None, optional): The bounding object. Defaults to None.
        """
        self.x = Decimal(xU) / Decimal(scaleX)
        self.y = Decimal(yU) / Decimal(scaleY)
        self.w = Decimal(wU) / Decimal(scaleX)
        self.h = Decimal(hU) / Decimal(scaleY)
        self.speed_x = Decimal(speedU) / Decimal(scaleX)
        self.speed_y = Decimal(speedU) / Decimal(scaleY)

        self.left = self.x
        self.right = self.x + self.w
        self.top = self.y
        self.bottom = self.y + self.h

        self.bound_top = boundObj.y if boundObj else Decimal(0)
        self.bound_bottom = boundObj.y + \
            boundObj.h if boundObj else Decimal(1)
        self.bound_left = boundObj.x if boundObj else Decimal(0)
        self.bound_right = boundObj.x + \
            boundObj.w if boundObj else Decimal(1)

    def __setattr__(self, key, value):
        if key == "x" and hasattr(self, "w"):
            self.left = value
            self.right = value + self.w
        elif key == "y" and hasattr(self, "h"):
            self.top = value
            self.bottom = value + self.h
        super(GameObjDataClass, self).__setattr__(key, value)

    def getDataAsDict(self) -> GameObjData:
        """
        Returns the object's data as a dictionary.

        Returns:
            GameObjData: The object's data as a dictionary.
        """
        return {
            "bottom": self.bottom,
            "bound_bottom": self.bound_bottom,
            "bound_left": self.bound_left,
            "bound_right": self.bound_right,
            "bound_top": self.bound_top,
            "h": self.h,
            "left": self.left,
            "right": self.right,
            "speed_x": self.speed_x,
            "speed_y": self.speed_y,
            "top": self.top,
            "w": self.w,
            "x": self.x,
            "y": self.y
        }

    # def getDataAsJSON(self) -> str:
    #     """
    #     Returns the object's data as a JSON string.

    #     Returns:
    #         str: The object's data as a JSON string.
    #     """
    #     return json.dumps(self.getDataAsDict(), cls=EnhancedJSONEncoder, )

    def getPositionalDataAsDict(self) -> GameObjPositionData:
        """
        Returns the object's positional data as a dictionary.

        Returns:
            GameObjPositionData: The object's positional data as a dictionary.
        """
        return {
            "x": self.x,
            "y": self.y,
            "dx": self.dx,
            "dy": self.dy
        }

    # def getPositionalDataAsJSON(self) -> str:
    #     """
    #     Returns the object's positional data as a JSON string.

    #     Returns:
    #         str: The object's positional data as a JSON string.
    #     """
    #     return json.dumps(self.getPositionalDataAsDict(), cls=EnhancedJSONEncoder)

    def getPositionalDataAsBinary(self) -> bytes:
        """
        Returns the object's positional data as binary.

        Returns:
            bytes: The object's positional data as binary.
        """
        tpl = self.x.as_tuple()
        return struct.pack('!ffff', float(self.x), float(self.y), float(self.dx), float(self.dy))

    def check_collision(self, obj: "GameObjDataClass"):
        """
        Checks if the object collides with another object.

        Args:
            obj (GameObjDataClass): The other object to check collision with.

        Returns:
            bool: True if collision occurs, False otherwise.
        """
        return Collision.collision_detection(self, obj)

    def update_pos(self):
        """
        Updates the object's position.
        """
        pass
