from dataclasses import dataclass, asdict, field
from typing import TypeAlias, TypedDict, Literal, Union, NotRequired
from enum import Enum
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync, sync_to_async
import logging




class WebsocketErrorCode(Enum):
    OK = 4000

    NON_CLOSING_ERROR = 4100
    GAME_ALREADY_CREATED = 4101
    USER_ALREADY_JOINED_GAME = 4102
    INVALID_COMMAND = 4103
    DEFAULT_ERROR = 4199

    CLOSING_ERROR = 4200
    NOT_AUTHENTICATED = 4201
    ALREADY_RUNNING_GAME_SESSION = 4202
    INVALID_SCHEDULE_ID = 4203
    INVALID_USER_ID = 4204
    USER_NO_PARTICIPANT = 4205
    JOIN_TIMEOUT = 4206
    RECONNECT_TIMEOUT = 4207
    IDLE_TIMEOUT = 4208
    GAME_SERVER_TIMEOUT = 4209
    ALREADY_CONNECTED = 4210

    INTERNAL_ERROR = 4211


class CommandError(Exception):
    def __init__(self, message, error_code: WebsocketErrorCode):            
        # Call the base class constructor with the parameters it needs
        super().__init__(message)
            
        # Now for your custom code...
        self.error_code = error_code


ServeMode = Literal["serve-winner", "serve-loser", "serve-random"]

ServeSide = Literal["serve-left", "serve-right"]

class GameSettings(TypedDict):
    point_wait_time_ms: float
    serve_mode: ServeMode
    initial_serve_to: ServeSide
    max_score: int
    tick_rate: int
    tick_duration_ms: int
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

class ConsumerMessage(TypedDict):
    type: Literal["handle_broadcast"]
    server_broadcast: dict[str, Union[str, int, float]] | None
    close_code: NotRequired[int]


async def async_send_to_consumer(server_broadcast: "BaseBroadcast", channel_name: str | None = None, group_name: str | None = None) -> bool:
    layer = get_channel_layer()
    if not layer:
        logging.error("Error: send_to_consumer: Channel Layer not configured")
        return False
    msg: ConsumerMessage = {
            "type": "handle_broadcast",
            "server_broadcast": server_broadcast.to_dict()
    }
    try:
        if channel_name and isinstance(channel_name, str):
            await layer.send(channel_name, msg)
        elif group_name and isinstance(group_name, str):
            await layer.group_send(group_name, msg)
        else:
            logging.error("Error: send_to_consumer: invalid arguments")
            return False
    except Exception as e:
        logging.error(f"Error: send_to_consumer: {e}")
        return False
    return True

@async_to_sync
async def sync_send_to_consumer(server_broadcast: "BaseBroadcast", channel_name: str | None = None, group_name: str | None = None):
    return await async_send_to_consumer(server_broadcast, channel_name, group_name)


def _convert_enum_dict(data):
    return {key: val.value if isinstance(val, Enum) else val for key, val in data}


@dataclass(kw_only=True)
class BaseBroadcast:
    tag: str = field(init=False)
    close_code: WebsocketErrorCode = field(default=WebsocketErrorCode.OK)

    def __post_init__(self):
        self.tag = self.__class__.tag

    def to_dict(self):
        return asdict(self, dict_factory=_convert_enum_dict)

    def to_consumer_msg(self) -> "ConsumerMessage":
        return {
            "type": "handle_broadcast",
            "server_broadcast": asdict(self, dict_factory=_convert_enum_dict)
        }

@dataclass
class GameStart(BaseBroadcast):
    tag = "server-game-start"
    timestamp: int


@dataclass
class GameReady(BaseBroadcast):
    tag = "server-game-ready"
    timestamp: int
    court: GameObjData
    ball: GameObjData
    paddle_left: GameObjData
    paddle_right: GameObjData
    settings: GameSettings
    timeout_time_sec: int
    user_id_left: int
    user_id_right: int


@dataclass
class GameUpdate(BaseBroadcast):
    tag = "server-game-update"
    timestamp: float
    tickno: int
    invalid_ticks: int
    ball: GameObjPositionData
    paddle_left: GameObjPositionData
    paddle_right: GameObjPositionData


class ServerPongCommand(TypedDict):
    tag: Literal["pong"]
    client_timestamp_ms: float
    server_timestamp_ms: float

@dataclass
class GamePaused(BaseBroadcast):
    tag = "server-game-paused"


@dataclass
class GameResumed(BaseBroadcast):
    tag = "server-game-resumed"


@dataclass
class UserConnected(BaseBroadcast):
    tag = "server-user-connected"
    user_id: int


@dataclass
class UserDisconnected(BaseBroadcast):
    tag = "server-user-disconnected"
    user_id: int

@dataclass
class UserReconnected(BaseBroadcast):
    tag = "server-user-reconnected"
    user_id: int


GameEndReason = Literal["win", "surrender", "timeout"]
GameSide = Literal["left", "right"]

@dataclass
class GameEnd(BaseBroadcast):
    tag = "server-game-end"
    winner_side: GameSide
    loser_side: GameSide
    winner_id: int
    loser_id: int
    player_one_id: int
    player_two_id: int
    player_one_score: int
    player_two_score: int
    reason: GameEndReason

@dataclass
class GamePlayerScored(BaseBroadcast):
    tag = "server-game-player-scored"
    side: GameSide
    who_scored_id: int
    player_one_id: int
    player_two_id: int
    player_one_score: int
    player_two_score: int


@dataclass
class Error(BaseBroadcast):
    tag = "server-game-error"
    error: str


ServerMessage: TypeAlias = Union[
    GameReady,
    GameStart,
    GameUpdate,
    GameEnd,
    GamePaused,
    GameResumed,
    UserConnected,
    UserDisconnected,
    UserReconnected,
    Error
]





# Mapping von Tags zu Dataclasses
tag_to_dataclass = {
    "server-game-ready": GameReady,
    "server-game-start": GameStart,
    "server-game-update": GameUpdate,
    "server-game-end": GameEnd,
    "server-game-paused": GamePaused,
    "server-game-resumed": GameResumed,
    "server-user-connected": UserConnected,
    "server-user-disconnected": UserDisconnected,
    "server-user-reconnected": UserReconnected,
    "server-game-error": Error
}

# Funktion zur Erstellung einer Instanz basierend auf dem Tag und den Daten
def create_instance_from_dict(data: ConsumerMessage) -> BaseBroadcast:
    if not data["server_broadcast"]:
        raise ValueError("Server broadcast data is missing")
    server_message = data["server_broadcast"]
    tag = server_message.get("tag")
    if not tag or not isinstance(tag, str):
        raise ValueError("Tag is missing in the provided data")
    
    dataclass_type = tag_to_dataclass.get(tag)
    if not dataclass_type:
        raise ValueError(f"No dataclass found for tag: {tag}")
    
    # Entferne den Tag aus den Daten, da er nicht im Konstruktor der Dataclass verwendet wird
    server_message.pop("tag")
    
    # Erstelle die Instanz der Dataclass mit den verbleibenden Daten
    return dataclass_type(**data["server_broadcast"])






# # class ServeMode(Enum):
# #     WINNER = Literal['serve-winner']
# #     LOSER = Literal['serve-loser']
# #     RANDOM = Literal['serve-random']


# # class InitialServe(Enum):
# #     LEFT = Literal['initial-serve-left']
# #     RIGHT = Literal['initial-serve-right']


# # class ServeSide(Enum):
# #     LEFT = Literal['serve-left']
# #     RIGHT = Literal['serve-right']



# class WebsocketErrorCode(Enum):
#     OK = 4100
#     GAME_ALREADY_CREATED = 4101
#     INVALID_SCHEDULE_ID = 4102
#     INVALID_USER_ID = 4103
#     USER_NO_PARTICIPANT = 4104
#     NOT_AUTHENTICATED = 4105
#     ALREADY_RUNNING_GAME_SESSION = 4106
#     DEFAULT_ERROR = 4199


# class CommandError(Exception):
#     def __init__(self, message, error_code: WebsocketErrorCode):            
#         # Call the base class constructor with the parameters it needs
#         super().__init__(message)
            
#         # Now for your custom code...
#         self.error_code = error_code


# ServeMode = Literal["serve-winner", "serve-loser", "serve-random"]

# ServeSide = Literal["serve-left", "serve-right"]

# class GameSettings(TypedDict):
#     point_wait_time: float
#     serve_mode: ServeMode
#     initial_serve_to: ServeSide
#     max_score: int
#     tick_duration: float
#     border_height: float
#     border_width: float


# class GameObjData(TypedDict):
#     x: float
#     y: float
#     w: float
#     h: float
#     speed_x: float
#     speed_y: float
#     bound_top: float
#     bound_bottom: float
#     bound_left: float
#     bound_right: float


# class GameObjPositionData(TypedDict):
#     x: float
#     y: float
#     dx: float
#     dy: float



# class ServerBroadcasts(Enum):
#     WAIT_FOR_OTHER_USERS = Literal["server-wait-for-other-users"]
#     GAME_READY = Literal["server-game-ready"]
#     GAME_START = Literal["server-game-start"]
#     GAME_UPDATE = Literal["server-game-update"]
#     GAME_END = Literal["server-game-end"]
#     GAME_PAUSED = Literal["server-game-paused"]
#     GAME_RESUMED = Literal["server-game-resumed"]
#     USER_CONNECTED = Literal["server-user-connected"]
#     USER_DISCONNECTED = Literal["server-user-disconnected"]
#     USER_RECONNECTED = Literal["server-user-reconnected"]
#     ERROR = Literal["server-game-error"]




# @dataclass
# class BaseBroadcast:
#     tag: str = field(init=False)
#     close_code: WebsocketErrorCode = field(default=WebsocketErrorCode.OK)

#     def __post_init__(self):
#         self.tag = self.__class__.tag


#     def to_consumer_msg(self) -> "ConsumerMessage":
#         return {
#             "type": "handle_broadcast",
#             "server_broadcast": asdict(self)
#         }

# @dataclass
# class WaitForOtherUsers(BaseBroadcast):
#     tag = "server-wait-for-other-users"


# @dataclass
# class GameReady(BaseBroadcast):
#     tag = "server-game-ready"


# @dataclass
# class GameJoinTimeout(BaseBroadcast):
#     tag = "server-game-join-timeout"


# @dataclass
# class GameStart(BaseBroadcast):
#     tag = "server-game-start"
#     timestamp: int
#     ball: GameObjPositionData
#     paddle_left: GameObjPositionData
#     paddle_right: GameObjPositionData
#     settings: GameSettings


# @dataclass
# class GameUpdate(BaseBroadcast):
#     tag = "server-game-update"
#     timestamp: int
#     ball: GameObjPositionData
#     paddle_left: GameObjPositionData
#     paddle_right: GameObjPositionData


# @dataclass
# class GameEnd(BaseBroadcast):
#     tag = "server-game-end"
#     user_id_winner: int
#     user_id_loser: int
#     reason: Literal["win", "surrender", "timeout"]


# @dataclass
# class GamePaused(BaseBroadcast):
#     tag = "server-game-paused"


# @dataclass
# class GameResumed(BaseBroadcast):
#     tag = "server-game-resumed"


# @dataclass
# class UserConnected(BaseBroadcast):
#     tag = "server-user-connected"
#     user_id: int


# @dataclass
# class UserDisconnected(BaseBroadcast):
#     tag = "server-user-disconnected"
#     user_id: int

# @dataclass
# class UserReconnected(BaseBroadcast):
#     tag = "server-user-reconnected"
#     user_id: int


# @dataclass
# class Error(BaseBroadcast):
#     tag = "server-game-error"
#     error: str



# ServerMessage: TypeAlias = Union[
#     WaitForOtherUsers,
#     GameReady,
#     GameStart,
#     GameUpdate,
#     GameEnd,
#     GamePaused,
#     GameResumed,
#     UserConnected,
#     UserDisconnected,
#     UserReconnected,
#     Error
# ]

# class ConsumerMessage(TypedDict):
#     type: Literal["handle_broadcast"]
#     server_broadcast: dict[str, Union[str, int, float]] | None
#     close_code: NotRequired[int]

# # Mapping von Tags zu Dataclasses
# tag_to_dataclass = {
#     "server-wait-for-other-users": WaitForOtherUsers,
#     "server-game-ready": GameReady,
#     "server-game-start": GameStart,
#     "server-game-update": GameUpdate,
#     "server-game-end": GameEnd,
#     "server-game-paused": GamePaused,
#     "server-game-resumed": GameResumed,
#     "server-user-connected": UserConnected,
#     "server-user-disconnected": UserDisconnected,
#     "server-user-reconnected": UserReconnected,
#     "server-game-error": Error
# }

# # Funktion zur Erstellung einer Instanz basierend auf dem Tag und den Daten
# def create_instance_from_dict(data: ConsumerMessage) -> BaseBroadcast:
#     if not data["server_broadcast"]:
#         raise ValueError("Server broadcast data is missing")
#     server_message = data["server_broadcast"]
#     tag = server_message.get("tag")
#     if not tag or not isinstance(tag, str):
#         raise ValueError("Tag is missing in the provided data")
    
#     dataclass_type = tag_to_dataclass.get(tag)
#     if not dataclass_type:
#         raise ValueError(f"No dataclass found for tag: {tag}")
    
#     # Entferne den Tag aus den Daten, da er nicht im Konstruktor der Dataclass verwendet wird
#     server_message.pop("tag")
    
#     # Erstelle die Instanz der Dataclass mit den verbleibenden Daten
#     return dataclass_type(**data["server_broadcast"])





