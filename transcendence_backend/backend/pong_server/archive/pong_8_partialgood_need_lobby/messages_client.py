from typing import Literal, TypedDict, TypeAlias
from user.models import UserAccount
from django.contrib.auth.models import AnonymousUser
from enum import Enum
from .messages_server import GameSettings




class WebsocketErrorCode(Enum):
    OK = 4100
    GAME_ALREADY_CREATED = 4101
    INVALID_SCHEDULE_ID = 4102
    INVALID_USER_ID = 4103
    USER_NO_PARTICIPANT = 4104
    NOT_AUTHENTICATED = 4105
    ALREADY_RUNNING_GAME_SESSION = 4106
    DEFAULT_ERROR = 4199

class ClientCommands(Enum):
    DEFAULT_CMD = Literal["default_cmd"]
    CLIENT_CREATE_GAME = Literal["client-create-game"]
    CLIENT_JOIN_GAME = Literal["client-join-game"]
    CLIENT_QUIT_GAME = Literal["client-quit-game"]
    CLIENT_DISCONNECTED = Literal["client-disconnected"]
    CLIENT_GET_CURRENT_SESSION = Literal["client-get-curent-session"]
    CLIENT_MOVE = Literal["client-move"]
    CLIENT_PAUSE = Literal["client-pause"]
    CLIENT_RESUME = Literal["client-resume"]


class CommandError(Exception):
    def __init__(self, message, error_code: WebsocketErrorCode):            
        # Call the base class constructor with the parameters it needs
        super().__init__(message)
            
        # Now for your custom code...
        self.error_code = error_code


class ClientBaseCommand(TypedDict):
    cmd: ClientCommands.DEFAULT_CMD.value
    id: int
    payload: None


class ClientCreatePayload(TypedDict):
    schedule_id: int
    game_settings: GameSettings | None

class ClientCreateGameCommand(ClientBaseCommand):
    cmd: ClientCommands.CLIENT_CREATE_GAME.value
    payload: ClientCreatePayload




class ClientJoinPayload(TypedDict):
    user_id: int

class ClientJoinCommand(ClientBaseCommand):
    cmd: ClientCommands.CLIENT_JOIN_GAME.value
    payload: ClientJoinPayload


class ClientQuitGameCommand(ClientBaseCommand):
    cmd: ClientCommands.CLIENT_QUIT_GAME.value

class ClientUserPayload(TypedDict):
    user_id: int

class ClientDisconnecedCommand(ClientBaseCommand):
    cmd: ClientCommands.CLIENT_DISCONNECTED.value
    payload: ClientUserPayload

class ClientGetCurrentSessionCommand(ClientBaseCommand):
    cmd: ClientCommands.CLIENT_GET_CURRENT_SESSION.value
    payload: ClientUserPayload


ClientMoveDirection = Literal["up", "down", "release_up", "release_down"]

class ClientMovePayload(TypedDict):
    user_id: int
    action: ClientMoveDirection
    new_y: float

class ClientMoveCommand(ClientBaseCommand):
    cmd: ClientCommands.CLIENT_MOVE.value
    payload: ClientMovePayload


class ClientPauseCommand(ClientBaseCommand):
    cmd: ClientCommands.CLIENT_PAUSE.value


class ClientResumeCommand(ClientBaseCommand):
    cmd: ClientCommands.CLIENT_RESUME.value

ClientCommand: TypeAlias = \
    ClientCreateGameCommand \
    | ClientJoinCommand \
    | ClientDisconnecedCommand \
    | ClientGetCurrentSessionCommand \
    | ClientQuitGameCommand \
    | ClientMoveCommand \
    | ClientPauseCommand \
    | ClientResumeCommand



class GameEngineMessage(TypedDict):
    type: Literal["handle_command"]
    game_group_name: str
    consumer_channel_name: str
    client_command: ClientCommand

class ClientResponse(TypedDict):
    success: bool
    cmd: str
    id: int
    message: str
    status_code: int
    payload: None | dict

class GameEngineMessageResponse(TypedDict):
    type: Literal["handle_command_response"]
    channel_name: str | None
    response: ClientResponse

# class GameEngineMessage(TypedDict):
#     room_group_name: str
#     consumer_channel_name: str
#     client_command: ClientCommand

# class ClientBaseCommand(TypedDict):
#     cmd: Literal["default_cmd"]
#     id: int
#     payload: None


# class ClientCreatePayload(TypedDict):
#     schedule_id: int
#     game_settings: GameSettings | None

# class ClientCreateGameCommand(ClientBaseCommand):
#     cmd: Literal["client-create-game"]
#     payload: ClientCreatePayload




# class ClientJoinPayload(TypedDict):
#     user_id: int

# class ClientJoinCommand(ClientBaseCommand):
#     cmd: Literal["client-join-game"]
#     payload: ClientJoinPayload


# class ClientQuitGameCommand(ClientBaseCommand):
#     cmd: Literal["client-quit-game"]

# class ClientUserPayload(TypedDict):
#     user_id: int

# class ClientDisconnecedCommand(ClientBaseCommand):
#     cmd: Literal["client-disconnected"]
#     payload: ClientUserPayload

# class ClientGetCurrentSessionCommand(ClientBaseCommand):
#     cmd: Literal["client-get-curent-session"]
#     payload: ClientUserPayload


# ClientMoveDirection = Literal["up", "down", "release_up", "release_down"]

# class ClientMovePayload(TypedDict):
#     user_id: int
#     action: ClientMoveDirection
#     new_y: float

# class ClientMoveCommand(ClientBaseCommand):
#     cmd: Literal["client-move"]
#     payload: ClientMovePayload


# class ClientPauseCommand(ClientBaseCommand):
#     cmd: Literal["client-pause"]


# class ClientResumeCommand(ClientBaseCommand):
#     cmd: Literal["client-resume"]


# ClientCommand: TypeAlias = \
#     ClientCreateGameCommand \
#     | ClientJoinCommand \
#     | ClientDisconnecedCommand \
#     | ClientGetCurrentSessionCommand \
#     | ClientQuitGameCommand \
#     | ClientMoveCommand \
#     | ClientPauseCommand \
#     | ClientResumeCommand



# class GameEngineMessage(TypedDict):
#     type: Literal["handle_command"]
#     game_group_name: str
#     consumer_channel_name: str
#     client_command: ClientCommand

# class ClientResponse(TypedDict):
#     success: bool
#     cmd: str
#     id: int
#     message: str
#     status_code: int
#     payload: None | dict

# class GameEngineMessageResponse(TypedDict):
#     type: Literal["handle_command_response"]
#     channel_name: str | None
#     response: ClientResponse

# # class GameEngineMessage(TypedDict):
# #     room_group_name: str
# #     consumer_channel_name: str
# #     client_command: ClientCommand