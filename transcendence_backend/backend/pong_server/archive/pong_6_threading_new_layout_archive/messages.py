from enum import Enum
import json
from typing import TypedDict


class GameObjectPositionData(TypedDict):
    x: float
    y: float
    dx: float
    dy: float


class GameUpdateDict(TypedDict):
    ball: GameObjectPositionData
    players: list[GameObjectPositionData]
    scores: dict[str, int]


class ClientServerMessages(Enum):
    CLIENT_READY = "client_ready"
    CLIENT_SURRENDER = "client_surrender"
    CLIENT_MOVE = "client_move"
    CLIENT_PAUSE = "client_pause"
    CLIENT_RESUME = "client_resume"
    CLIENT_DISCONNECT = "client_disconnect"


class ServerClientMessages(Enum):
    SERVER_WAIT_FOR_OPPONENT = "server_wait_for_opponent"  # only message
    SERVER_GAME_READY = "server_game_ready"  # only message
    SERVER_GAME_START = "server_game_start"  # data: settings and state
    SERVER_GAME_UPDATE = "server_game_update"  # data: state
    SERVER_GAME_END = "server_game_end"  # data: winner, looser, else?
    SERVER_GAME_PAUSED = "server_game_paused"  # only message
    SERVER_GAME_RESUMED = "server_game_resumed"  # only message
    SERVER_OPPONENT_CONNECTED = "server_opponent_connected"  # only message
    SERVER_OPPONENT_DISCONNECTED = "server_opponent_disconnected"  # only message
    SERVER_OPPONENT_SURRENDERED = "server_opponent_surrendered"  # only message
    SERVER_GAME_ERROR = "server_game_error"  # data: error message


class MessageType(Enum):
    GAME_UPDATE = "update_game"
    INIT_GAME = "init_game"
    START_GAME = "start_game"
    HIDE_BALL = "hide_ball"
    SHOW_BALL = "show_ball"
    GAME_END = "end_game"
    GAME_ERROR = "game_error"
    WAITING_FOR_OPPONENT = "waiting_for_opponent"


class PongMessage:
    def __init__(self, channel_layer, group_name):
        self.channel_layer = channel_layer
        self.group_name = group_name

    def create_message(self, message_type: MessageType, data: dict | None = None) -> dict:
        return {
            "msg": message_type.value,
            "data": data
        }

    async def send_to_channel_layer(self, message_type: MessageType, data: dict | None = None):
        message = self.create_message(message_type, data)
        if (message_type == MessageType.GAME_END):
            type = 'game_end'
        elif (message_type == MessageType.GAME_ERROR):
            type = 'game_error'
        else:
            type = 'forward_message'
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': type,
                'message': message
            }
        )


# from enum import Enum
# import json

# class MessageType(Enum):
#     GAME_UPDATE = "game_update"
#     START_GAME = "start_game"
#     HIDE_BALL = "hide_ball"
#     SHOW_BALL = "show_ball"
#     GAME_END = "game_end"
#     WAITING_FOR_OPPONENT = "waiting_for_opponent"

# class PongMessage:
#     @staticmethod
#     def create_message(message_type: MessageType, data: dict) -> dict:
#         return {
#             "type": message_type.value,
#             "data": data
#         }

#     @staticmethod
#     async def send_to_channel_layer(channel_layer, group_name, message_type: MessageType, data: dict):
#         message = PongMessage.create_message(message_type, data)
#         await channel_layer.group_send(
#             group_name,
#             {
#                 'type': 'forward_message',
#                 'message': message
#             }
#         )

#     @staticmethod
#     async def send_to_websocket(consumer, message_type: MessageType, data: dict):
#         message = PongMessage.create_message(message_type, data)
#         await consumer.send(text_data=json.dumps(message))
