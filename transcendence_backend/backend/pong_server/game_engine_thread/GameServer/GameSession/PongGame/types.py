from typing import Literal, TypedDict

ServeMode = Literal["serve-winner", "serve-loser", "serve-random"]
ServeSide = Literal["serve-left", "serve-right"]

MoveDirection = Literal["up", "down", "release_up", "release_down", "none"]

class GameObjData(TypedDict):
    x: float
    y: float
    w: float
    h: float
    speed_x: float
    speed_y: float
    bound_top: float
    bound_bottom: float
    bound_left: float
    bound_right: float

class GameObjPositionData(TypedDict):
    x: float
    y: float
    dx: float
    dy: float
