import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from .messages_client import ClientCommand, GameEngineMessage, GameEngineMessageResponse
from channels_redis.core import RedisChannelLayer
from channels.layers import InMemoryChannelLayer, get_channel_layer
from . import messages_server as msg_server
from . import messages_client as msg_client
from user.models import UserAccount

logger = logging.getLogger(__name__)



class PlayerConsumer(AsyncWebsocketConsumer):

    # def get_game_engine_message(self, command: ClientCommand | msg_client.InternalCommand) -> GameEngineMessage:
    #     return {
    #         "type": "handle_command",
    #         "client_command": command,
    #         "consumer_channel_name": self.channel_name,
    #         "game_group_name": self.game_group_name
    #     }

    async def connect(self):
        # logger.error(f"Scope: {self.scope}")
        self.schedule_id = self.scope['url_route']['kwargs']['schedule_id'] if 'schedule_id' in self.scope['url_route']['kwargs'] else -1
        self.game_group_name = f'game_{self.schedule_id}'
        self.messenger = msg_client.InternalMessenger(game_group_name=self.game_group_name, consumer_channel_name=self.channel_name)
        self.user: UserAccount | None = self.scope["user"] if "user" in self.scope else None
        self.channel_layer: RedisChannelLayer | None = get_channel_layer()

        if not self.channel_layer:
            logger.error("Channel layer not found")
            await self.close()
            return

        
        if not self.user or not self.user.is_authenticated:
            logger.error("User not authenticated")
            await self.close(code=msg_server.WebsocketErrorCode.NOT_AUTHENTICATED.value, reason="Not authenticated")
            return

        await self.channel_layer.group_add(
                self.game_group_name,
                self.channel_name
            )


        await self.accept()

        # print(f"PlayerConsumer: connect: {self.channel_name}")
        # print(f"send to game_engine:")

        msg = self.messenger.join_game(self.user.pk, self.schedule_id)
        print(f"message sent: {msg}")
        await self.messenger.push_to_game_engine(msg)


    async def disconnect(self, close_code):
        if self.user:
            await self.messenger.push_to_game_engine(self.messenger.user_disconnected(self.user.pk))
        # if self.channel_layer:
        #     await self.channel_layer.send("game_engine", self.get_game_engine_message(clientCommand))
        await self.close()



    async def receive(self, text_data):
        try:
            clientCommand: ClientCommand = await json.loads(text_data)
            if self.user:
                clientCommand["user_id"] = self.user.pk
            if self.channel_layer:
                # await self.channel_layer.send("game_engine", self.get_game_engine_message(clientCommand))
                await self.messenger.push_to_game_engine(clientCommand)
        except Exception as e:
            logger.error(f"Error in receive: {e}")


    async def handle_command_response(self, event: GameEngineMessageResponse):

        print(f"command response: ", event)
        match event["response"]["status_code"]:
            case (msg_server.WebsocketErrorCode.INVALID_SCHEDULE_ID.value
                | msg_server.WebsocketErrorCode.INVALID_USER_ID.value
                | msg_server.WebsocketErrorCode.USER_NO_PARTICIPANT.value):
                await self.close(code=event["response"]["status_code"])
                print("connection closed")
                return
        
        try:
            # await self.send(text_data=json.dumps(event["response"]))
            await self.send(text_data=json.dumps(event["response"]))
        except Exception as e:
            logger.error(f"Error in handle_command_response: {e}")

    async def handle_broadcast(self, event: msg_server.ConsumerMessage):
        try:
            data: dict[str, str | int | float] | None = event["server_broadcast"]
            await self.send(text_data=json.dumps(data))
            if data and data["tag"] == "server-game-end":
                print("game end -> close connection")
                await self.close()
        except Exception as e:
            logger.error(f"Error in handle_broadcast: {e}")

