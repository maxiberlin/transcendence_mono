from enum import Enum
import json

class MessageType(Enum):
    GAME_UPDATE = "game_update"
    START_GAME = "start_game"
    HIDE_BALL = "hide_ball"
    SHOW_BALL = "show_ball"
    GAME_END = "game_end"
    WAITING_FOR_OPPONENT = "waiting_for_opponent"

class PongMessage:
    @staticmethod
    def create_message(message_type: MessageType, data: dict) -> dict:
        return {
            "type": message_type.value,
            "data": data
        }

    @staticmethod
    async def send_to_channel_layer(channel_layer, group_name, message_type: MessageType, data: dict):
        message = PongMessage.create_message(message_type, data)
        await channel_layer.group_send(
            group_name,
            {
                'type': 'forward_message',
                'message': message
            }
        )

    @staticmethod
    async def send_to_websocket(consumer, message_type: MessageType, data: dict):
        message = PongMessage.create_message(message_type, data)
        await consumer.send(text_data=json.dumps(message))
