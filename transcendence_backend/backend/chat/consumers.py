import json
from django.core.paginator import Paginator
from django.core.serializers.python import Serializer
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.conf import settings
from django.utils import timezone
from datetime import datetime
from django.contrib.humanize.templatetags.humanize import naturalday
from chat.models import *
from game.models import Tournament
from django.shortcuts import get_object_or_404
from typing import TypedDict

MSG_TYPE_MESSAGE = 0
DEFAULT_ROOM_CHAT_MESSAGE_PAGE_SIZE = 10
MSG_TYPE_CONNECTED_USER_COUNT = 1

user = settings.AUTH_USER_MODEL


class ChatConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):
        print('ChatConsumer: connect: ' + str(self.scope['user']))
        await self.accept()
        self.room_id = None

    async def disconnect(self, code):
        print('ChatConsumer: disconnect')
        try:
            if self.room_id != None:
                await self.leave_room(self.room_id)
        except Exception:
            pass

    async def receive_json2(self, content):
        command = content.get('command', None)
        pass


    async def receive_json(self, content):
        command = content.get('command', None)
        print('ChatConsumer: command: ' + str(command))
        try:
            if command == 'send':
                if len(content['message'].lstrip()) == 0:
                    raise ClientError('EMPTY_STRING', 'Cannot send an empty string!')
                await self.send_room(content['room_id'], content['message'])
            elif command == 'join':
                await self.join_room(content['room'], content['type'])
            elif command == 'leave':
                await self.leave_room(content['room'])
            elif command == 'get_room_chat_messages':
                print(f"PublicChatConsumer: get_room_chat_messages with p.{content['page_number']}")
                room = await get_room_or_error(content['room_id'])
                data = await get_room_chat_messages(room, content['page_number'])
                if data != None:
                    data = json.loads(data)
                    await self.send_messages_data(data['messages'], data['new_page_number'])
                else:
                    raise ClientError('ERROR_GET_MESSAGES','Could not retrieve chatroom messages.')
        except ClientError as e:
            await self.handle_client_error(e)

    async def send_room(self, room_id, message):
        print('ChatConsumer: send_room')
        if self.room_id != None:
            print(str(room_id), f'>>>>>>>>>>>>>>>||| {str(self.room_id)}')
            if str(room_id) != str(self.room_id):
                raise ClientError('ACCESS_DENIED', 'Room access denied')
            if not is_authenticated(self.scope['user']):
                raise ClientError('AUTH_ERROR', 'You must be logged in to chat.')
        else:
            raise ClientError('ROOM_ACCESS_DENIED', 'Room access denied')
        room = await get_room_or_error(room_id)
        await create_room_chat_message(room, self.scope['user'], message)
        if self.channel_layer:
            await self.channel_layer.group_send(
                room.group_name,
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
        print('ChatConsumer: chat message from user #: ' + str(event['user_id']))
        timestamp = humanize_timestamp(timezone.now())
        await self.send_json({
            'msg_type': MSG_TYPE_MESSAGE,
            'user_id': event['user_id'],
            'username': event['username'],
            'avatar': event['avatar'],
            'message': event['message'],
            'timestamp': timestamp,
        })

    async def join_room(self, room_id, room_type):
        print('ChatConsumer: join room')
        is_auth = is_authenticated(self.scope['user'])
        try:
            room = await get_room_or_error(room_id)
        except ClientError as e:
            await self.handle_client_error(e)
        if room_type == 'private' or room_type == 'tournament':
            is_member = await user_is_room_member(room_id, self.scope['user'])
            if not is_member:
                await disconnect_user(room, self.scope['user'])
                raise ClientError('ACCESS_DENIED', 'Room access denied')   
        if is_auth:
            await connect_user(room, self.scope['user'])
        self.room_id = room_id
        if self.channel_layer:
            await self.channel_layer.group_add(room.group_name, self.channel_name)
            await self.send_json({'join': str(room.id)})
            num_connected_users = await get_connected_user_count(room)
            await self.channel_layer.group_send(
                room.group_name,
                {
                    "type": "connected.user.count",
                    "connected_user_count": num_connected_users,
                }
            )
    
    async def leave_room(self, room_id):
        print('ChatConsumer: leave room')
        is_auth = is_authenticated(self.scope['user'])
        try:
            room = await get_room_or_error(room_id)
        except ClientError as e:
            await self.handle_client_error(e)
        if is_auth:
            await disconnect_user(room, self.scope['user'])
        self.room_id = room_id
        if self.channel_layer:
            await self.channel_layer.group_discard(room.group_name, self.channel_name)
            num_connected_users = await get_connected_user_count(room)
            await self.channel_layer.group_send(
                room.group_name,
                {
                    "type": "connected.user.count",
                    "connected_user_count": num_connected_users,
                }
            )


    #Send error data to UI
    async def handle_client_error(self, error):
        error_data = {}
        error_data['error'] = error.code
        if error.message:
            error_data['message'] = error.message
            await self.send_json(error_data)
        return

    async def send_messages_data(self, messages, new_page_number):
        print('ChatConsumer: send_messages_data. ')
        await self.send_json(
            {
                'messages_data': 'messages_data',
                'messages': messages,
                'new_page_number': new_page_number,
            },
        )
    
    async def connected_user_count(self, event):
        print('ChatConsumer: connected_user_count: count: ' + str(event['connected_user_count']))
        await self.send_json(
            {
                'msg_type': MSG_TYPE_CONNECTED_USER_COUNT,
                'connected_user_count': event['connected_user_count']
            },
        )



# def TournamentChatConsumer(AsyncJsonWebsocketConsumer):
#     pass

class ClientError(Exception):
    def __init__(self, code, message):
        super().__init__(code)
        self.code = code
        if message:
            self.message = message

def is_authenticated(user):
	if user.is_authenticated:
		return True
	return False

@database_sync_to_async
def get_connected_user_count(room):
    if room.users:
          return len(room.users.all())
    return 0

@database_sync_to_async
def user_is_room_member(room_id, user):
    room = ChatRoom.objects.get(id=room_id)
    if user in room.users.all():
        return True
    return False
     

@database_sync_to_async
def create_room_chat_message(room, user, message):
    return ChatMessage.objects.create(user=user, room=room, content=message)

@database_sync_to_async
def connect_user(room, user):
    return room.connect_user(user)

@database_sync_to_async
def disconnect_user(room, user):
    return room.disconnect_user(user)

@database_sync_to_async
def get_room_or_error(room_id):
    try:
        room = ChatRoom.objects.get(id=room_id)
    except ChatRoom.DoesNotExist:
        raise ClientError('ROOM_INVALID', 'room id does not exist.')
    return room

@database_sync_to_async
def get_room_chat_messages(room, page_number):
	try:
		query_set = ChatMessage.messages.by_room(room)
		pages = Paginator(query_set, DEFAULT_ROOM_CHAT_MESSAGE_PAGE_SIZE)

		data = {}
		new_page_number = int(page_number)  
		if new_page_number <= pages.num_pages:
			new_page_number = new_page_number + 1
			item = LazyRoomChatMessageEncoder()
			data['messages'] = item.serialize(pages.page(page_number).object_list)
		else:
			data['messages'] = None
			# data['messages'] = 'None'
		data['new_page_number'] = new_page_number
		return json.dumps(data)
	except Exception as e:
		print('EXCEPTION: ' + str(e)) #TODO:
		return None

def humanize_timestamp(timestamp):
    if (naturalday(timestamp) == 'today' or naturalday(timestamp) == 'yesterday'):
        str_time = datetime.strftime(timestamp, '%H:%M')
        str_time = str_time.lstrip('0')
        ts = f'{naturalday(timestamp)} at {str_time}'
    else:
        str_time = datetime.strftime(timestamp, '%d %b %Y')
        ts = f'{str_time}'
    return ts

class LazyRoomChatMessageEncoder(Serializer):
	def get_dump_object(self, obj: ChatMessage):
		dump_object = {}
		dump_object.update({'msg_type': MSG_TYPE_MESSAGE})
		dump_object.update({'user_id': str(obj.user.pk)})
		dump_object.update({'username': str(obj.user.username)})
		dump_object.update({'message': str(obj.content)})
		dump_object.update({'avatar': str(obj.user.avatar.url)})
		dump_object.update({'timestamp': humanize_timestamp(obj.timestamp)})
		return dump_object

# MSG_TYPE_MESSAGE = 0
# DEFAULT_ROOM_CHAT_MESSAGE_PAGE_SIZE = 10
# MSG_TYPE_CONNECTED_USER_COUNT = 1

# user = settings.AUTH_USER_MODEL

# class ChatConsumer(AsyncJsonWebsocketConsumer):

#     async def connect(self):
#         print('ChatConsumer: connect: ' + str(self.scope['user']))
#         await self.accept()
#         self.room_id = None

#     async def disconnect(self, code):
#         print('ChatConsumer: disconnect')
#         try:
#             if self.room_id != None:
#                 await self.leave_room(self.room_id)
#         except Exception:
#             pass

#     async def receive_json(self, content):
#         command = content.get('command', None)
#         print('ChatConsumer: command: ' + str(command))
#         try:
#             if command == 'send':
#                 if len(content['message'].lstrip()) == 0:
#                     raise ClientError('EMPTY_STRING', 'Cannot send an empty string!')
#                 await self.send_room(content['room_id'], content['message'])
#             elif command == 'join':
#                 await self.join_room(content['room'], content['type'])
#             elif command == 'leave':
#                 await self.leave_room(content['room'])
#             elif command == 'get_room_chat_messages':
#                 print(f"PublicChatConsumer: get_room_chat_messages with p.{content['page_number']}")
#                 room = await get_room_or_error(content['room_id'])
#                 data = await get_room_chat_messages(room, content['page_number'])
#                 if data != None:
#                     data = json.loads(data)
#                     await self.send_messages_data(data['messages'], data['new_page_number'])
#                 else:
#                     raise ClientError('ERROR_GET_MESSAGES','Could not retrieve chatroom messages.')
#         except ClientError as e:
#             await self.handle_client_error(e)

#     async def send_room(self, room_id, message):
#         print('ChatConsumer: send_room')
#         if self.room_id != None:
#             print(str(room_id), f'>>>>>>>>>>>>>>>||| {str(self.room_id)}')
#             if str(room_id) != str(self.room_id):
#                 raise ClientError('ACCESS_DENIED', 'Room access denied')
#             if not is_authenticated(self.scope['user']):
#                 raise ClientError('AUTH_ERROR', 'You must be logged in to chat.')
#         else:
#             raise ClientError('ROOM_ACCESS_DENIED', 'Room access denied')
#         room = await get_room_or_error(room_id)
#         await create_room_chat_message(room, self.scope['user'], message)
#         if self.channel_layer:
#             await self.channel_layer.group_send(
#                 room.group_name,
#                 {
#                     'type': 'chat.message',
#                     'user_id': self.scope['user'].id,
#                     'username': self.scope['user'].username,
#                     'avatar': self.scope['user'].avatar.url,
#                     'message': message
#                 }
#             )

#     # Send message to the client
#     async def chat_message(self, event):
#         print('ChatConsumer: chat message from user #: ' + str(event['user_id']))
#         timestamp = humanize_timestamp(timezone.now())
#         await self.send_json({
#             'msg_type': MSG_TYPE_MESSAGE,
#             'user_id': event['user_id'],
#             'username': event['username'],
#             'avatar': event['avatar'],
#             'message': event['message'],
#             'timestamp': timestamp,
#         })

#     async def join_room(self, room_id, room_type):
#         print('ChatConsumer: join room')
#         is_auth = is_authenticated(self.scope['user'])
#         try:
#             room = await get_room_or_error(room_id)
#         except ClientError as e:
#             await self.handle_client_error(e)
#         if room_type == 'private' or room_type == 'tournament':
#             is_member = await user_is_room_member(room_id, self.scope['user'])
#             if not is_member:
#                 await disconnect_user(room, self.scope['user'])
#                 raise ClientError('ACCESS_DENIED', 'Room access denied')   
#         if is_auth:
#             await connect_user(room, self.scope['user'])
#         self.room_id = room_id
#         if self.channel_layer:
#             await self.channel_layer.group_add(room.group_name, self.channel_name)
#             await self.send_json({'join': str(room.id)})
#             num_connected_users = await get_connected_user_count(room)
#             await self.channel_layer.group_send(
#                 room.group_name,
#                 {
#                     "type": "connected.user.count",
#                     "connected_user_count": num_connected_users,
#                 }
#             )
    
#     async def leave_room(self, room_id):
#         print('ChatConsumer: leave room')
#         is_auth = is_authenticated(self.scope['user'])
#         try:
#             room = await get_room_or_error(room_id)
#         except ClientError as e:
#             await self.handle_client_error(e)
#         if is_auth:
#             await disconnect_user(room, self.scope['user'])
#         self.room_id = room_id
#         if self.channel_layer:
#             await self.channel_layer.group_discard(room.group_name, self.channel_name)
#             num_connected_users = await get_connected_user_count(room)
#             await self.channel_layer.group_send(
#                 room.group_name,
#                 {
#                     "type": "connected.user.count",
#                     "connected_user_count": num_connected_users,
#                 }
#             )


#     #Send error data to UI
#     async def handle_client_error(self, error):
#         error_data = {}
#         error_data['error'] = error.code
#         if error.message:
#             error_data['message'] = error.message
#             await self.send_json(error_data)
#         return

#     async def send_messages_data(self, messages, new_page_number):
#         print('ChatConsumer: send_messages_data. ')
#         await self.send_json(
#             {
#                 'messages_data': 'messages_data',
#                 'messages': messages,
#                 'new_page_number': new_page_number,
#             },
#         )
    
#     async def connected_user_count(self, event):
#         print('ChatConsumer: connected_user_count: count: ' + str(event['connected_user_count']))
#         await self.send_json(
#             {
#                 'msg_type': MSG_TYPE_CONNECTED_USER_COUNT,
#                 'connected_user_count': event['connected_user_count']
#             },
#         )



# # def TournamentChatConsumer(AsyncJsonWebsocketConsumer):
# #     pass

# class ClientError(Exception):
#     def __init__(self, code, message):
#         super().__init__(code)
#         self.code = code
#         if message:
#             self.message = message

# def is_authenticated(user):
# 	if user.is_authenticated:
# 		return True
# 	return False

# @database_sync_to_async
# def get_connected_user_count(room):
#     if room.users:
#           return len(room.users.all())
#     return 0

# @database_sync_to_async
# def user_is_room_member(room_id, user):
#     room = ChatRoom.objects.get(id=room_id)
#     if user in room.users.all():
#         return True
#     return False
     

# @database_sync_to_async
# def create_room_chat_message(room, user, message):
#     return ChatMessage.objects.create(user=user, room=room, content=message)

# @database_sync_to_async
# def connect_user(room, user):
#     return room.connect_user(user)

# @database_sync_to_async
# def disconnect_user(room, user):
#     return room.disconnect_user(user)

# @database_sync_to_async
# def get_room_or_error(room_id):
#     try:
#         room = ChatRoom.objects.get(id=room_id)
#     except ChatRoom.DoesNotExist:
#         raise ClientError('ROOM_INVALID', 'room id does not exist.')
#     return room

# @database_sync_to_async
# def get_room_chat_messages(room, page_number):
# 	try:
# 		query_set = ChatMessage.messages.by_room(room)
# 		pages = Paginator(query_set, DEFAULT_ROOM_CHAT_MESSAGE_PAGE_SIZE)

# 		data = {}
# 		new_page_number = int(page_number)  
# 		if new_page_number <= pages.num_pages:
# 			new_page_number = new_page_number + 1
# 			item = LazyRoomChatMessageEncoder()
# 			data['messages'] = item.serialize(pages.page(page_number).object_list)
# 		else:
# 			data['messages'] = None
# 			# data['messages'] = 'None'
# 		data['new_page_number'] = new_page_number
# 		return json.dumps(data)
# 	except Exception as e:
# 		print('EXCEPTION: ' + str(e)) #TODO:
# 		return None

# def humanize_timestamp(timestamp):
#     if (naturalday(timestamp) == 'today' or naturalday(timestamp) == 'yesterday'):
#         str_time = datetime.strftime(timestamp, '%H:%M')
#         str_time = str_time.lstrip('0')
#         ts = f'{naturalday(timestamp)} at {str_time}'
#     else:
#         str_time = datetime.strftime(timestamp, '%d %b %Y')
#         ts = f'{str_time}'
#     return ts

# class LazyRoomChatMessageEncoder(Serializer):
# 	def get_dump_object(self, obj: ChatMessage):
# 		dump_object = {}
# 		dump_object.update({'msg_type': MSG_TYPE_MESSAGE})
# 		dump_object.update({'user_id': str(obj.user.pk)})
# 		dump_object.update({'username': str(obj.user.username)})
# 		dump_object.update({'message': str(obj.content)})
# 		dump_object.update({'avatar': str(obj.user.avatar.url)})
# 		dump_object.update({'timestamp': humanize_timestamp(obj.timestamp)})
# 		return dump_object
