from channels.generic.websocket import AsyncWebsocketConsumer
from channels.layers import get_channel_layer
import dataclasses
import json
import logging
from .messages_server import ServerMessage
from .messages_client import ClientCommand
from . import messages_server as serverMsg
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)


class ChannelMessenger:
    def __init__(self, room_group_name: str, handler_name: str, channel_alias: str | None = None) -> None:
        self.channel_layer = get_channel_layer(
        ) if not channel_alias else get_channel_layer(alias=channel_alias)
        if not self.channel_layer:
            raise RuntimeError("Channel layer not found")
        self.room_group_name = room_group_name
        self.handler_name = handler_name

    def push_to_channel(self, message: ServerMessage, type: str | None = None):
        if (not self.channel_layer):
            return
        msg = dataclasses.asdict(message)
        msg["tag"] = message.tag
        async_to_sync(self.channel_layer.group_send)(
            self.room_group_name,
            {
                'type': self.handler_name if not type else type,
                'message': msg
            }
        )


class ChannelMessengerAsync:
    def __init__(self, room_group_name: str, layer_alias: str | None = None) -> None:
        if (layer_alias):
            self.channel_layer = get_channel_layer(layer_alias)
        else:
            self.channel_layer = get_channel_layer()
        self.room_group_name = room_group_name

    async def push_to_channel(self, message: ServerMessage):
        if (not self.channel_layer):
            return
        msg = dataclasses.asdict(message)
        msg["tag"] = message.tag
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'on_channel_message',
                'message': msg
            }
        )


def dict_factory_str(data):
    return {
        attr_key: str(attr_val) for attr_key, attr_val in data
    }


class EnhancedJSONEncoder(json.JSONEncoder):
    def default(self, o):
        if dataclasses.is_dataclass(o) and isinstance(o, dataclasses):
            return dataclasses.asdict(o, dict_factory=dict_factory_str)
        return super().default(o)


class PlayerConsumerBase(AsyncWebsocketConsumer):
    async def connect(self):
        self.schedule_id = self.scope['url_route']['kwargs']['schedule_id']
        self.room_group_name = f'game_{self.schedule_id}'
        self.messagePlayers = ChannelMessenger(
            self.room_group_name, 'on_channel_message_consumer')
        self.messageGame = ChannelMessenger(
            self.room_group_name, 'on_channel_message_game')


    async def receive(self, text_data=None, bytes_data=None, **kwargs):
        try:
            if text_data:
                clientMessage = await json.loads(text_data)
                await self.on_client_message(clientMessage)
            else:
                raise ValueError(
                    "No text section for incoming WebSocket frame!")
        except Exception as e:
            logger.error(f"Error receive: {e}")
            await self.push_to_channel(
                serverMsg.Error(f"Error receive: {e}"))


    async def push_to_channel(self, message: ServerMessage):
        self.messagePlayers.push_to_channel(message)


    async def on_client_message(self, clientMessage: ClientCommand):
        pass


    async def send_json_to_client(self, content: ServerMessage, close=False):
        data = json.dumps(content, cls=EnhancedJSONEncoder)
        await super().send(text_data=data, close=close)


    async def on_channel_message_consumer(self, event):
        try:
            message: ServerMessage = event['message']
            if not isinstance(message, ServerMessage):
                raise ValueError("Invalid message type")
            await self.on_channel_message(message)
        except Exception as e:
            logger.error(f"Error on_channel_message_internal: {e}")


    async def on_channel_message(self, message: ServerMessage):
        pass


    async def push_to_game_manager(self, message: ServerMessage):
        pass
