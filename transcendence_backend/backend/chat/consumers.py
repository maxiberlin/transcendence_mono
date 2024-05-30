# chat/consumers.py
import json

from channels.generic.websocket import AsyncWebsocketConsumer, AsyncJsonWebsocketConsumer

from user.models import UserAccount


class ChatCons(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self
        return await super().connect()
    



#    hdd = dict(self.scope['headers'])
#         nehdd = dict()
#         for key in hdd:
#             nehdd[key.decode('ascii')] = hdd[key].decode('ascii')
#         hdrs = json.dumps(nehdd)
#         msg = f"you are: {hdrs}"


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f"chat_{self.room_name}"

        self.user : UserAccount = self.scope["user"]
        

        # Join room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        await self.accept()

     


    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json["message"]

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name, {"type": "chat_message", "message": message}
        )

    # Receive message from room group
    async def chat_message(self, event):
        msg = event["message"]
        message = f"{self.user.username}: {msg}"

        # Send message to WebSocket
        await self.send(text_data=json.dumps({"message": message}))