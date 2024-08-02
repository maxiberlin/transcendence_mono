import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.conf import settings
from django.utils import timezone
from datetime import datetime
from django.contrib.humanize.templatetags.humanize import naturalday
from game.models import Tournament
from django.shortcuts import get_object_or_404

MSG_TYPE_MESSAGE = 0

user = settings.AUTH_USER_MODEL

class PublicChatConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):
        self.room_type = self.scope["url_route"]["kwargs"]["room_type"]
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.room_group_name = f"{self.room_type}_chat_{self.room_id}"

        if self.room_type == 'public':
            await self.accept()
            if self.channel_layer:
                await self.channel_layer.group_add(
                    self.room_group_name,
                    self.channel_name
                )
        elif self.room_type == 'tournament':
            tournament = get_object_or_404(Tournament, id=self.room_id)
            if self.scope['user'] in tournament.players.all():
                await self.accept()
                if self.channel_layer:
                    await self.channel_layer.group_add(
                        self.room_group_name,
                        self.channel_name
                    )
            else:
                await self.close()
        else:
            await self.close()
        print("PublicChatConsumer: connect: " + str(self.scope['user']))
        # await self.accept()

        # await self.channel_layer.group_add(
        #     'public_chat_room_1',
        #     self.channel_name
        # )
    

    async def disconnect(self, code):
        print("PublicChatConsumer: disconnect")
        pass

    async def receive_json(self, content):
        command = content.get('command', None)
        print("PublicChatConsumer: command: " + str(command))
        try:
            if command == 'send':
                if len(content['message'].lstrip()) == 0:
                    raise ClientError(422, 'Cannot send an empty string!')
                await self.send_message(content['message'])
        except ClientError as e:
            error_data = {}
            error_data['code'] = e.code
            if e.message:
                error_data['message'] = e.message
            await self.send_json(error_data)


    
    async def send_message(self, message):
        if self.channel_layer:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat.message',
                    'user_id': self.scope['user'].id,
                    'username': self.scope['user'].username,
                    'avatar': self.scope['user'].avatar.url,
                    'message': message
                }
            )

    # Send message to the client
    async def chat_message(self, event):
        print("PublicChatConsumer: chat message from user #: " + str(event['user_id']))
        timestamp = humanize_timestamp(timezone.now())
        await self.send_json({
            'msg_type': MSG_TYPE_MESSAGE,
            'user_id': event['user_id'],
            'username': event['username'],
            'avatar': event['avatar'],
            'message': event['message'],
            'timestamp': timestamp,
        })


# def TournamentChatConsumer(AsyncJsonWebsocketConsumer):
#     pass

class ClientError(Exception):
    def __init__(self, code, message):
        super().__init__(code)
        self.code = code
        if message:
            self.message = message


def humanize_timestamp(timestamp):
    if (naturalday(timestamp) == 'today' or naturalday(timestamp) == 'yesterday'):
        str_time = datetime.strftime(timestamp, '%H:%M')
        str_time = str_time.lstrip('0')
        ts = f'{naturalday(timestamp)} at {str_time}'
    else:
        str_time = datetime.strftime(timestamp, '%d %b %Y')
        ts = f'{str_time}'
    return ts