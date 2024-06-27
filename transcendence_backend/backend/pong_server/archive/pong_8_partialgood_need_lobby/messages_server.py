from dataclasses import dataclass, asdict, field
from typing import TypeAlias, TypedDict, Literal
from enum import Enum


# class ServeMode(Enum):
#     WINNER = Literal['serve-winner']
#     LOSER = Literal['serve-loser']
#     RANDOM = Literal['serve-random']


# class InitialServe(Enum):
#     LEFT = Literal['initial-serve-left']
#     RIGHT = Literal['initial-serve-right']


# class ServeSide(Enum):
#     LEFT = Literal['serve-left']
#     RIGHT = Literal['serve-right']

ServeMode = Literal["serve-winner", "serve-loser", "serve-random"]

ServeSide = Literal["serve-left", "serve-right"]

class GameSettings(TypedDict):
    point_wait_time: float
    serve_mode: ServeMode
    initial_serve_to: ServeSide
    max_score: int
    tick_duration: float
    border_height: float
    border_width: float


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


@dataclass
class BaseBroadcast:
    tag: str = field(init=False)

    def to_dict(self):
        d = asdict(self)
        d["tag"] = self.tag
        d["type"] = "handle_broadcast"
        return d

@dataclass
class WaitForOpponent(BaseBroadcast):
    tag = "server-wait-for-opponent"


@dataclass
class GameReady(BaseBroadcast):
    tag = "server-game-ready"


@dataclass
class GameJoinTimeout(BaseBroadcast):
    tag = "server-game-join-timeout"


@dataclass
class GameStart(BaseBroadcast):
    tag = "server-game-start"
    timestamp: int
    ball: GameObjPositionData
    paddle_left: GameObjPositionData
    paddle_right: GameObjPositionData
    settings: GameSettings


@dataclass
class GameUpdate(BaseBroadcast):
    tag = "server-game-update"
    timestamp: int
    ball: GameObjPositionData
    paddle_left: GameObjPositionData
    paddle_right: GameObjPositionData


@dataclass
class GameEnd(BaseBroadcast):
    tag = "server-game-end"
    user_id_winner: int
    user_id_loser: int


@dataclass
class GamePaused(BaseBroadcast):
    tag = "server-game-paused"


@dataclass
class GameResumed(BaseBroadcast):
    tag = "server-game-resumed"


@dataclass
class OpponentConnected(BaseBroadcast):
    tag = "server-opponent-connected"
    user_id: int


@dataclass
class OpponentDisconnected(BaseBroadcast):
    tag = "server-opponent-disconnected"
    user_id: int


@dataclass
class OpponentSurrendered(BaseBroadcast):
    tag = "server-opponent-surrendered"
    user_id: int


@dataclass
class Error(BaseBroadcast):
    tag = "server-game-error"
    error: str


ServerMessage: TypeAlias = WaitForOpponent | GameReady | GameStart | GameUpdate | GameEnd | GamePaused | GameResumed | OpponentConnected | OpponentDisconnected | OpponentSurrendered | Error
