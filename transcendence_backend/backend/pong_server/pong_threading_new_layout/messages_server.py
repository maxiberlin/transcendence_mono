from dataclasses import dataclass
from typing import TypeAlias, TypedDict
from decimal import Decimal
from .game_base_class import GameObjData, GameObjPositionData


@dataclass(slots=True)
class WaitForOpponent:
    tag = "server_wait_for_opponent"


@dataclass(slots=True)
class GameReady:
    tag = "server_game_ready"


@dataclass(slots=True)
class GameStart:
    """
    Represents a message indicating the start of a game.

    Attributes:
        tag (str): The tag identifying the message as a server game start message.
        timestamp (int): The timestamp of when the game started.
        ball (GameObjPositionData): The position data of the ball object.
        paddle_left (GameObjPositionData): The position data of the left paddle object.
        paddle_right (GameObjPositionData): The position data of the right paddle object.
        settings (dict): The game settings.
    """
    tag = "server_game_start"
    timestamp: int
    ball: GameObjPositionData
    paddle_left: GameObjPositionData
    paddle_right: GameObjPositionData
    settings: dict


@dataclass(slots=True)
class GameUpdate:
    tag = "server_game_update"
    timestamp: int
    ball: GameObjPositionData
    paddle_left: GameObjPositionData
    paddle_right: GameObjPositionData


@dataclass(slots=True)
class GameEnd:
    tag = "server_game_end"
    winner: str
    looser: str


@dataclass(slots=True)
class GamePaused:
    tag = "server_game_paused"


@dataclass(slots=True)
class GameResumed:
    tag = "server_game_resumed"


@dataclass(slots=True)
class OpponentConnected:
    tag = "server_opponent_connected"
    user_id: int


@dataclass(slots=True)
class OpponentDisconnected:
    tag = "server_opponent_disconnected"
    user_id: int


@dataclass(slots=True)
class OpponentSurrendered:
    tag = "server_opponent_surrendered"


@dataclass
class Error:
    tag = "server_game_error"
    error: str


ServerMessage: TypeAlias = WaitForOpponent | GameReady | GameStart | GameUpdate | GameEnd | GamePaused | GameResumed | OpponentConnected | OpponentDisconnected | OpponentSurrendered | Error
