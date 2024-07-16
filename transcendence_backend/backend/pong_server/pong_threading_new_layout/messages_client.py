from typing import Literal, TypedDict, TypeAlias, NotRequired
from enum import Enum
import uuid
from channels.layers import get_channel_layer
from .messages_server import WebsocketErrorCode
import logging
from asgiref.sync import async_to_sync




class ClientCommands(Enum):
    CLIENT_JOIN_GAME = Literal["client-join-game"]
    CLIENT_MOVE = Literal["client-move"]
    CLIENT_READY = Literal["client-ready"]
    CLIENT_PAUSE = Literal["client-pause"]
    CLIENT_RESUME = Literal["client-resume"]
    CLIENT_LEAVE_GAME = Literal["client-leave-game"]


class InternalCommands(Enum):
    CLIENT_DISCONNECTED = Literal["client-disconnected"]
    CLIENT_TIMEOUT = Literal["client-timeout"]
    CLIENT_RECONNECTED = Literal["client-reconnected"]
    CLIENT_GET_CURRENT_SESSION = Literal["client-get-curent-session"]


class ClientBaseCommand(TypedDict):
    cmd: Literal["default_cmd"]
    user_id: int
    id: int
    internal: NotRequired[int]
    # payload: None


ClientMoveDirection = Literal["up", "down", "release_up", "release_down", "none"]



    # user_id: int
class ClientJoinPayload(TypedDict):
    schedule_id: int

    # user_id: int
# class ClientMovePayload(TypedDict):


# class ClientUserPayload(TypedDict):
#     user_id: int


class ClientPingCommand(ClientBaseCommand):
    cmd: Literal["ping"]
    client_timestamp_ms: float

class ClientReadyCommand(ClientBaseCommand):
    cmd: ClientCommands.CLIENT_READY.value
    # payload: ClientUserPayload

class ClientMoveCommand(ClientBaseCommand):
    cmd: ClientCommands.CLIENT_MOVE.value
    # payload: ClientMovePayload
    timestamp_sec: float
    timestamp_ms: int
    action: ClientMoveDirection
    new_y: float


class ClientPauseCommand(ClientBaseCommand):
    cmd: ClientCommands.CLIENT_PAUSE.value
    # payload: ClientUserPayload


class ClientResumeCommand(ClientBaseCommand):
    cmd: ClientCommands.CLIENT_RESUME.value
    # payload: ClientUserPayload

class ClientJoinCommand(ClientBaseCommand):
    cmd: ClientCommands.CLIENT_JOIN_GAME.value
    schedule_id: int
    # payload: ClientJoinPayload


class ClientLeaveCommand(ClientBaseCommand):
    cmd: ClientCommands.CLIENT_LEAVE_GAME.value
    # payload: ClientUserPayload

ClientCommand: TypeAlias = \
    ClientJoinCommand \
    | ClientReadyCommand \
    | ClientMoveCommand \
    | ClientPauseCommand \
    | ClientResumeCommand \
    | ClientLeaveCommand \
    | ClientPingCommand


class InternalDisconnectedCommand(ClientBaseCommand):
    cmd: InternalCommands.CLIENT_DISCONNECTED.value
    # payload: ClientUserPayload

class InternalTimeoutCommand(ClientBaseCommand):
    cmd: InternalCommands.CLIENT_TIMEOUT.value
    # payload: ClientUserPayload

class InternalReconnectedCommand(ClientBaseCommand):
    cmd: InternalCommands.CLIENT_RECONNECTED.value
    # payload: ClientUserPayload


InternalCommand: TypeAlias = \
    InternalDisconnectedCommand \
    | InternalReconnectedCommand \
    | InternalTimeoutCommand

class GameEngineMessage(TypedDict):
    type: Literal["handle_command"]
    game_group_name: str
    consumer_channel_name: str
    client_command: ClientCommand | InternalCommand

class ClientResponse(TypedDict):
    success: bool
    cmd: str
    id: int
    message: str
    status_code: int
    # type: Literal["command-response"]

class GameEngineMessageResponse(TypedDict):
    type: Literal["handle_command_response"]
    response: ClientResponse


class InternalMessenger:

    def __init__(self, game_group_name: str, consumer_channel_name: str):
        self.channel_layer = get_channel_layer()
        self.game_group_name = game_group_name
        self.consumer_channel_name = consumer_channel_name

    

    async def push_to_game_engine(self, msg: GameEngineMessage | ClientCommand | InternalCommand) -> bool:
        if self.channel_layer:
            try:
                if "client_command" in msg:
                    await self.channel_layer.send("game_engine", msg)
                else:
                    await self.channel_layer.send("game_engine", self.__create_cmd(msg))
                return True
            except Exception as e:
                logging.error(f"Error Internal Messenger: push_to_game_engine: {e}")
        else:
            logging.error("Error Internal Messenger: push_to_game_engine: Channel Layer not configured")
        return False

    def __create_cmd(self, cmd: ClientCommand | InternalCommand) -> GameEngineMessage:
        return {
            "type": "handle_command",
            "game_group_name": self.game_group_name,
            "consumer_channel_name": self.consumer_channel_name,
            "client_command": cmd
        }

    def is_internal_command(self, command: ClientCommand | InternalCommand) -> bool:
        if "internal" not in command:
            return False
        return command["internal"] == 1

    def join_game(self, user_id: int, schedule_id: int) -> GameEngineMessage:
        return self.__create_cmd({
            "cmd": "client-join-game",
            "id": 0,
            "internal": 1,
            "user_id": user_id,
            "schedule_id": schedule_id
        })

    def leave_game(self, user_id: int) -> GameEngineMessage:
        return self.__create_cmd({
            "cmd": "client-leave-game",
            "id": 0,
            "user_id": user_id,
            "internal": 1,
        })

    def user_disconnected(self, user_id: int) -> GameEngineMessage:
        return self.__create_cmd({
            "cmd": "client-disconnected",
            "id": 0,
            "user_id": user_id,
            "internal": 1
        })

    def user_reconnected(self, user_id: int) -> GameEngineMessage:
        return self.__create_cmd({
            "cmd": "client-reconnected",
            "id": 0,
            "user_id": user_id,
            "internal": 1
        })
    
    def timeout(self) -> GameEngineMessage:
        return self.__create_cmd({
            "cmd": "client-timeout",
            "id": 0,
            "user_id": 0,
            "internal": 1
        })



async def async_send_command_response(event: GameEngineMessage, success: bool, message: str,
    status_code: WebsocketErrorCode = WebsocketErrorCode.OK) -> None:

    if not isinstance(event["client_command"]["id"], int):
        logging.error("Error: send_command_response: invalid id")
    msg: GameEngineMessageResponse = {
        "type": "handle_command_response",
        "response": {
            "success": success,
            "id": event["client_command"]["id"],
            "cmd": event["client_command"]["cmd"],
            "message": message,
            "status_code": status_code.value,
        }
    }
    layer = get_channel_layer()
    channel_name = event.get("consumer_channel_name", None)
    if layer:
        if channel_name and isinstance(channel_name, str):
            try:
                await layer.send(channel_name, msg)
            except Exception as e:
                logging.error(f"Error: send_command_response: send to channel {channel_name}: {e}")
        else:
            logging.error("Error: send_command_response: Channel name invalid")
    else:
        logging.error("Error: send_command_response: Channel layer not initialized")


@async_to_sync
async def sync_send_command_response(event: GameEngineMessage, success: bool, message: str,
    status_code: WebsocketErrorCode = WebsocketErrorCode.OK):
    await async_send_command_response(event, success, message, status_code)



# class InternalMessenger:

#     def __init__(self, game_group_name: str, consumer_channel_name: str):
#         self.channel_layer = get_channel_layer()

#         self.engine_msg = {
#             "type": "handle_command",
#             "game_group_name": game_group_name,
#             "consumer_channel_name": consumer_channel_name,
#             "client_command": None
#         }
        

#     async def push_to_game_engine(self, msg: GameEngineMessage) -> bool:
#         if self.channel_layer:
#             try:
#                 await self.channel_layer.send("game_engine", {
#                     "type": "handle_command",
#                     "game_group_name": self.game_group_name if self.game_group_name else "",
#                     "consumer_channel_name": self.consumer_channel_name if self.consumer_channel_name else "",
#                     "client_command": command
#                 })
#                 return True
#             except Exception as e:
#                 logging.error(f"Error Internal Messenger: push_to_game_engine: {e}")
#         else:
#             logging.error("Error Internal Messenger: push_to_game_engine: Channel Layer not configured")
#         return False

#     def is_internal_command(self, command: ClientCommand | InternalCommand) -> bool:
#         if "internal" not in command:
#             return False
#         return command["internal"] == 1

#     def join_game(self, user_id: int, schedule_id: int) -> ClientJoinCommand:
#         return {
#             "cmd": "client-join-game",
#             "id": 0,
#             "payload": {
#                 "user_id": user_id,
#                 "schedule_id": schedule_id,
#             },
#             "internal": 1
#         }

#     def leave_game(self, user_id: int) -> ClientLeaveCommand:
#         return {
#             "cmd": "client-leave-game",
#             "id": 0,
#             "payload": {
#                 "user_id": user_id
#             },
#             "internal": 1
#         }

#     def user_disconnected(self, user_id: int) -> InternalDisconnectedCommand:
#         return {
#             "cmd": "client-disconnected",
#             "id": 0,
#             "payload": {
#                 "user_id": user_id
#             },
#             "internal": 1
#         }

#     def user_reconnected(self, user_id: int) -> InternalReconnectedCommand:
#         return {
#             "cmd": "client-reconnected",
#             "id": 0,
#             "payload": {
#                 "user_id": user_id
#             },
#             "internal": 1
#         }



# async def send_command_response(event: GameEngineMessage, success: bool, message: str,
#     status_code: WebsocketErrorCode = WebsocketErrorCode.OK):

#     if not isinstance(event["client_command"]["id"], int):
#         logging.error("Error: send_command_response: invalid id")
#     msg: GameEngineMessageResponse = {
#         "type": "handle_command_response",
#         "response": {
#             "success": success,
#             "id": event["client_command"]["id"],
#             "cmd": event["client_command"]["cmd"],
#             "message": message,
#             "status_code": status_code.value,
#         }
#     }
#     layer = get_channel_layer()
#     channel_name = event.get("consumer_channel_name", None)
#     if layer:
#         if channel_name and isinstance(channel_name, str):
#             try:
#                 await layer.send(channel_name, msg)
#             except Exception as e:
#                 logging.error(f"Error: send_command_response: send to channel {channel_name}: {e}")
#         else:
#             logging.error("Error: send_command_response: Channel name invalid")
#     else:
#         logging.error("Error: send_command_response: Channel layer not initialized")



# async def send_command_response(event: GameEngineMessage | ClientCommand | InternalCommand, success: bool, message: str,
#     status_code: WebsocketErrorCode = WebsocketErrorCode.OK, channel_name: str | None = None):

#     command = event.get("client_command", None)
#     if command:
#         channel = event["consumer_channel_name"]

#     if not isinstance(event["client_command"]["id"], int):
#         logging.error("Error: send_command_response: invalid id")
#     msg: GameEngineMessageResponse = {
#         "type": "handle_command_response",
#         "channel_name": "",
#         "response": {
#             "success": success,
#             "id": event["client_command"]["id"],
#             "cmd": event["client_command"]["cmd"],
#             "message": message,
#             "status_code": status_code.value,
#         }
#     }
#     layer = get_channel_layer()
#     if layer:
#         if event["consumer_channel_name"] and isinstance(event["consumer_channel_name"], str):
#             try:
#                 await layer.send(event["consumer_channel_name"], msg)
#             except Exception as e:
#                 logging.error(f"Error: send_command_response: send to channel {event['consumer_channel_name']}: {e}")
#         else:
#             logging.error("Error: send_command_response: Channel name invalid")
#     else:
#         logging.error("Error: send_command_response: Channel layer not initialized")





# class ClientJoinPayload(TypedDict):
#     user_id: int
#     schedule_id: int

# class ClientUserPayload(TypedDict):
#     user_id: int

# @dataclasses.dataclass
# class BaseInternalCommand:
#     cmd: InternalCommands = dataclasses.field(init=False)

#     def to_dict(self):
#         d = dataclasses.asdict(self)
#         d["cmd"] = self.cmd.value
#         d["id"] = self.id
#         return d
    
#     payload: ClientJoinPayload | ClientUserPayload | None
#     id: int = 0


# @dataclasses.dataclass
# class InternalJoinCommand(BaseInternalCommand):
#     cmd = InternalCommands.CLIENT_JOIN_GAME
#     payload: ClientJoinPayload

# @dataclasses.dataclass
# class InternalLeaveGameCommand(BaseInternalCommand):
#     cmd = InternalCommands.CLIENT_LEAVE_GAME

# @dataclasses.dataclass
# class InternalDisconnectedCommand(BaseInternalCommand):
#     cmd = InternalCommands.CLIENT_DISCONNECTED
#     payload: ClientUserPayload

# @dataclasses.dataclass
# class InternalReconnectedCommand(BaseInternalCommand):
#     cmd = InternalCommands.CLIENT_RECONNECTED
#     payload: ClientUserPayload

# @dataclasses.dataclass
# class InternalGetCurrentSessionCommand(BaseInternalCommand):
#     cmd = InternalCommands.CLIENT_GET_CURRENT_SESSION
#     payload: ClientUserPayload



# ClientCreateGameCommand \

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