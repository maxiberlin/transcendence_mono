from enum import Enum
from .game_base import EnhancedJSONEncoder
import json
from typing import TypedDict, Literal, NotRequired
from decimal import Decimal, DecimalTuple
import dataclasses
from .game_base import EnhancedJSONEncoder
import struct
from .game_base import dict_factory_decimal, dict_factory_str


class ServeMode(Enum):
    WINNER = Literal['serve-winner']
    LOSER = Literal['serve-loser']
    RANDOM = Literal['serve-random']


class InitialServe(Enum):
    LEFT = Literal['initial-serve-left']
    RIGHT = Literal['initial-serve-right']


@dataclasses.dataclass
class PongSettings:
    width: int = dataclasses.field(default=40000)
    height: int = dataclasses.field(default=20000)
    border_width: int = dataclasses.field(default=600)
    border_height: int = dataclasses.field(default=600)
    paddle_width: int = dataclasses.field(default=600)
    paddle_height: int = dataclasses.field(default=2600)
    paddle_speed: int = dataclasses.field(default=7000)
    wall_dist: int = dataclasses.field(default=600)
    ball_width: int = dataclasses.field(default=600)
    ball_height: int = dataclasses.field(default=600)
    ball_speed: int = dataclasses.field(default=9000)

    point_wait_time: float = dataclasses.field(default=1.0)
    serve_mode: ServeMode = dataclasses.field(default=ServeMode.WINNER)
    initial_serve_to: InitialServe = dataclasses.field(
        default=InitialServe.LEFT)
    max_score: int = dataclasses.field(default=10)
    tick_duration: float = dataclasses.field(default=0.05)


# class PongSettings:
#     _instance = None

#     def __new__(cls):
#         if cls._instance is None:
#             cls._instance = super(PongSettings, cls).__new__(cls)
#             cls._instance.init()
#         return cls._instance

#     def init(self) -> None:
#         self.width: int = 40000
#         self.height: int = 20000
#         self.border_width: int = 600
#         self.border_height: int = 600
#         self.paddle_width: int = 600
#         self.paddle_height: int = 2600
#         self.paddle_speed: int = 7000
#         self.wall_dist: int = 600
#         self.ball_width: int = 600
#         self.ball_height: int = 600
#         self.ball_speed: int = 9000
#         self.point_wait_time: float = 1.0
#         self.serve_mode: ServeMode = ServeMode.WINNER
#         self.initial_serve_to: InitialServe = InitialServe.LEFT
#         self.max_score: int = 10
#         self.tick_duration: float = 0.05  # Neue Variable für die Tick-Dauer

#     def toJSON(self) -> str:
#         return json.dumps(self, cls=EnhancedJSONEncoder, sort_keys=True, indent=4, default=lambda o: o.__dict__)

# def to_dict(self) -> dict:
#     return {
#         'width': self.width,
#         'height': self.height,
#         'border_width': self.border_width / self.width,
#         'border_height': self.border_height / self.height,
#         'paddle_width': self.paddle_width / self.width,
#         'paddle_height': self.paddle_height / self.height,
#         'paddle_speed_x': self.paddle_speed / self.width,
#         'paddle_speed_y': self.paddle_speed / self.height,
#         'wall_dist': self.wall_dist / self.width,
#         'ball_width': self.ball_width / self.width,
#         'ball_height': self.ball_height / self.height,
#         'ball_speed_x': self.ball_speed / self.width,
#         'ball_speed_y': self.ball_speed / self.height,
#         'point_wait_time': self.point_wait_time,
#         'serve_mode': self.serve_mode.name,
#         'initial_serve_to': self.initial_serve_to.name,
#         'max_score': self.max_score,
#         'tick_duration': self.tick_duration
#     }
