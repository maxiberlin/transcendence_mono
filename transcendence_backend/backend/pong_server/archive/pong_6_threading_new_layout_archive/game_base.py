from channels.generic.websocket import AsyncWebsocketConsumer
from channels.layers import get_channel_layer
import dataclasses
import json
import logging
from decimal import Decimal
from .messages_server import ServerMessage
from .messages_client import ClientMessage
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


def dict_factory_decimal(data: list):
    return {
        attr_key: float(attr_val) if isinstance(
            attr_val, Decimal) else attr_val
        for attr_key, attr_val in data
    }


def dict_factory_str(data):
    return {
        attr_key: str(attr_val) for attr_key, attr_val in data
    }


class EnhancedJSONEncoder(json.JSONEncoder):
    def default(self, o):
        if dataclasses.is_dataclass(o) and isinstance(o, dataclasses):
            return dataclasses.asdict(o, dict_factory=dict_factory_str)
        if isinstance(o, Decimal):
            return str(o)
        return super().default(o)


class PlayerConsumerBase(AsyncWebsocketConsumer):
    """
    Base class for player consumers in the Pong game.

    This class provides the basic functionality for handling WebSocket connections
    and processing incoming and outgoing messages.

    Attributes:
        schedule_id (str): The ID of the game schedule.
        room_group_name (str): The name of the room group for the game.
        messagePlayers (ChannelMessenger): The messenger for sending messages to players.
        messageGame (ChannelMessenger): The messenger for sending messages to the game.

    Methods:
        connect: Connects the consumer to the WebSocket.
        receive: Handles incoming messages from the WebSocket.
        push_to_channel: Pushes a message to the players channel.
        on_client_message: Handles incoming messages from the client.
        send_json_to_client: Sends a JSON message to the client.
        on_channel_message_consumer: Handles incoming messages from the channel layer.
        on_channel_message: Handles incoming messages from the channel.
        push_to_game_manager: Pushes a message to the game manager.
    """

    async def connect(self):
        """
        Connects the consumer to the WebSocket.

        This method is called when a WebSocket connection is established.
        It initializes the necessary attributes and sets up the message messengers.
        """
        self.schedule_id = self.scope['url_route']['kwargs']['schedule_id']
        self.room_group_name = f'game_{self.schedule_id}'
        self.messagePlayers = ChannelMessenger(
            self.room_group_name, 'on_channel_message_consumer')
        self.messageGame = ChannelMessenger(
            self.room_group_name, 'on_channel_message_game')

    async def receive(self, text_data=None, bytes_data=None, **kwargs):
        """
        Handles incoming messages from the WebSocket.

        This method is called when a message is received from the WebSocket.
        It parses the message and calls the appropriate handler method.
        """
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
        """
        Pushes a message to the players channel.

        Args:
            message (ServerMessage): The message to be pushed to the channel.
        """
        self.messagePlayers.push_to_channel(message)

    async def on_client_message(self, clientMessage: ClientMessage):
        """
        Handles incoming messages from the client.

        This method is called when a message is received from the client.
        It can be overridden in subclasses to implement custom message handling logic.

        Args:
            clientMessage (ClientMessage): The message received from the client.
        """
        pass

    async def send_json_to_client(self, content: ServerMessage, close=False):
        """
        Sends a JSON message to the client.

        This method serializes the content into JSON format and sends it to the client.

        Args:
            content (ServerMessage): The content of the message to be sent.
            close (bool): Whether to close the WebSocket connection after sending the message.
        """
        data = json.dumps(content, cls=EnhancedJSONEncoder)
        await super().send(text_data=data, close=close)

    async def on_channel_message_consumer(self, event):
        """
        Handles incoming messages from the channel layer.

        This method is called when a message is received from the channel layer.
        It can be overridden in subclasses to implement custom message handling logic.

        Args:
            event (dict): The event data received from the channel layer.
        """
        try:
            message: ServerMessage = event['message']
            if not isinstance(message, ServerMessage):
                raise ValueError("Invalid message type")
            await self.on_channel_message(message)
        except Exception as e:
            logger.error(f"Error on_channel_message_internal: {e}")

    async def on_channel_message(self, message: ServerMessage):
        """
        Handles incoming messages from the channel.

        This method is called when a message is received from the channel.
        It can be overridden in subclasses to implement custom message handling logic.

        Args:
            message (ServerMessage): The message received from the channel.
        """
        pass

    async def push_to_game_manager(self, message: ServerMessage):
        """
        Pushes a message to the game manager.

        This method is used to push messages to the game manager, which will be handled by the game thread.

        Args:
            message (ServerMessage): The message to be pushed to the game manager.
        """
        pass
