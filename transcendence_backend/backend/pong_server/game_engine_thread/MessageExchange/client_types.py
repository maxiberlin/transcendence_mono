from typing import Literal, TypedDict, NotRequired, Union, Any, TypeAlias
from enum import StrEnum
from GameServer.GameSession.PongGame.types import MoveDirection

class ClientCommandTypes(StrEnum):
    PING = "ping"
    CLIENT_JOIN_GAME = "client-join-game"
    CLIENT_READY = "client-ready"
    CLIENT_MOVE = "client-move"
    CLIENT_PAUSE = "client-pause"
    CLIENT_RESUME = "client-resume"
    CLIENT_LEAVE_GAME = "client-leave-game"

class ClientBaseCommand(TypedDict):
    user_id: int
    id: int
    internal: NotRequired[int]

class ClientPingCommand(ClientBaseCommand):
    cmd: Literal["ping"]
    client_timestamp_ms: float

class ClientReadyCommand(ClientBaseCommand):
    cmd: Literal["client-ready"]

class ClientMoveCommand(ClientBaseCommand):
    cmd: Literal["client-move"]
    timestamp_sec: float
    timestamp_ms: int
    action: MoveDirection
    new_y: float

class ClientPauseCommand(ClientBaseCommand):
    cmd: Literal["client-pause"]

class ClientResumeCommand(ClientBaseCommand):
    cmd: Literal["client-resume"]

class ClientJoinCommand(ClientBaseCommand):
    cmd: Literal["client-join-game"]
    schedule_id: int

class ClientLeaveCommand(ClientBaseCommand):
    cmd: Literal["client-leave-game"]

ClientCommand = Union[
    ClientJoinCommand,
    ClientReadyCommand,
    ClientMoveCommand,
    ClientPauseCommand,
    ClientResumeCommand,
    ClientLeaveCommand,
    ClientPingCommand
]

class InternalDisconnectedCommand(ClientBaseCommand):
    cmd: Literal["client-disconnected"]

class InternalTimeoutCommand(ClientBaseCommand):
    cmd: Literal["client-timeout"]

class InternalReconnectedCommand(ClientBaseCommand):
    cmd: Literal["client-reconnected"]

InternalCommand: TypeAlias = \
    InternalDisconnectedCommand \
    | InternalReconnectedCommand \
    | InternalTimeoutCommand


class ClientResponse(TypedDict):
    success: bool
    cmd: str
    id: int
    message: str
    status_code: int
    payload: Any
