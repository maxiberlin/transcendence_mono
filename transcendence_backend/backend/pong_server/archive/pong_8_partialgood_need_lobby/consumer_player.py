import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from .messages_client import ClientCommand, GameEngineMessage, GameEngineMessageResponse
from channels_redis.core import RedisChannelLayer
from channels.layers import InMemoryChannelLayer, get_channel_layer
from . import messages_server as msg_server
from . import messages_client as msg_client
from .messages_client import WebsocketErrorCode

logger = logging.getLogger(__name__)



class PlayerConsumer(AsyncWebsocketConsumer):

    def get_game_engine_message(self, command: ClientCommand) -> GameEngineMessage:
        return {
            "type": "handle_command",
            "client_command": command,
            "consumer_channel_name": self.channel_name,
            "game_group_name": self.game_group_name
        }

    async def connect(self):
        logger.error(f"Scope: {self.scope}")
        self.schedule_id = self.scope['url_route']['kwargs']['schedule_id']
        self.user = self.scope["user"]
        self.game_group_name = f'game_{self.schedule_id}'

        self.game_created = False
        self.game_joined = False

        self.channel_layer: RedisChannelLayer | None = get_channel_layer()

        if not self.channel_layer or not self.user.is_authenticated:
            await self.close(code=WebsocketErrorCode.NOT_AUTHENTICATED, reason="Not authenticated")
            return

        await self.channel_layer.group_add(
                self.game_group_name,
                self.channel_name
            )


        await self.accept()

        await self.channel_layer.send("game_engine", self.get_game_engine_message({
            "cmd": "client-create-game",
            "id": 1,
            "payload": {
                "schedule_id": self.schedule_id,
                "game_settings": None
            }
        }))

        await self.channel_layer.send("game_engine", self.get_game_engine_message({
            "cmd": "client-join-game",
            "id": 2,
            "payload": {
                "user_id": self.user.pk
            }
        }))


    async def disconnect(self, close_code):

        await self.close()



    async def receive(self, text_data):
        try:
            clientCommand: ClientCommand = await json.loads(text_data)
            if self.channel_layer:
                await self.channel_layer.send("game_engine", self.get_game_engine_message(clientCommand))
        except Exception as e:
            logger.error(f"Error in receive: {e}")


    async def handle_command_response(self, event: GameEngineMessageResponse):

        if (event["response"]["cmd"] == "client-create-game"
            and event["response"]["id"] == 1):
            if event["response"]["status_code"] == WebsocketErrorCode.OK:
                self.game_created = True
            else:
                await self.close(code=2)

        match event["response"]["status_code"]:
            case WebsocketErrorCode.INVALID_SCHEDULE_ID | msg_client.WebsocketErrorCode.INVALID_USER_ID | msg_client.WebsocketErrorCode.USER_NO_PARTICIPANT:
                await self.close(code=event["response"]["status_code"])
            case WebsocketErrorCode.OK:
                ""

        try:
            await self.send(text_data=json.dumps(event["response"]))
        except Exception as e:
            logger.error(f"Error in handle_command_response: {e}")

