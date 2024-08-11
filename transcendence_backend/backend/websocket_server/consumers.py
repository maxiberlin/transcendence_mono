# import json
import time
import asyncio
from datetime import datetime
# from typing import TypedDict, Literal, Unpack, Union, Generic, ParamSpec, TypeVar, Callable, Optional
from django.db.models import F

# from django.conf import settings
# from django.utils import timezone
from django.core.paginator import Paginator, InvalidPage
# from django.core.serializers import serialize
# from django.contrib.contenttypes.models import ContentType
# from django.contrib.auth.decorators import login_required
# from django.db.models.query import QuerySet

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from channels_redis.core import RedisChannelLayer
from dataclasses import dataclass


from user.models import UserAccount, Player
from chat.models import *
from friends.models import FriendList

from .constants import *
from websocket_server.utils import async_send_consumer_internal_command
from notification.models import Notification, NotificationData
# from django.db import close_old_connections
# from asgiref.sync import SyncToAsync

def use_timeout(timeout_ms: int):
    def get_time():
        return time.perf_counter_ns()//1_000_000
    
    last = start = get_time()
    
    def check_timeout():
        nonlocal last
        now = get_time()
        # print(f"CHECK CONNECTION: STAMP: {now - start}, DIFF: {now - last}")
        return now - last > timeout_ms
    
    def reset_timeout():
        nonlocal last
        now = get_time()
        # print(f"NEW PING: STAMP: {now - start}, DIFF: {now - last}")
        last = now

    return check_timeout, reset_timeout
        

class TestConnectionConsumer(AsyncJsonWebsocketConsumer):

    
    async def __heartbeat_loop(self):
        timeout = HEARTBEAT_TIMEOUT_MS / 1000
        while True:
            await asyncio.sleep(timeout/2)
            if self.check_timeout():
                await self.close()
                break
    
    async def connect(self) -> None:
        print("TestConnectionConsumer: connected")
        await self.accept()
        self.check_timeout , self.reset_timeout = use_timeout(HEARTBEAT_TIMEOUT_MS)
        await self.send_json({ "msg_type": "hello", "heartbeat_ms": HEARTBEAT_INTERVAL_MS })
        self.user_disconnect_timeout_task = asyncio.get_running_loop().create_task(self.__heartbeat_loop())

    async def disconnect(self, code: int):
            print("TestConnectionConsumer: disconnect, code: ", code)

    async def receive_json(self, content: ClientCommand, **kwargs):
            
            if content.get("command", None) == 'ping':
                self.reset_timeout()
                await self.send_json({ "msg_type": "pong" })
     

@dataclass(slots=True)
class ChatGroupnameRoomId:
    groupname: str
    room_id: int


@database_sync_to_async
def get_user_channels(user: UserAccount) -> tuple[list[str], list[ChatGroupnameRoomId]]:
    rooms = ChatRoom.rooms.filter(users=user, is_active=True).distinct()
    chats_channels = [ChatGroupnameRoomId(groupname=room.group_name, room_id=room.pk) for room in rooms]
    friends_channels = FriendList.objects.get(user=user).get_friends_public_groups()
    return friends_channels, chats_channels

@database_sync_to_async
def add_online_count(user: UserAccount):
    return UserAccount.objects.get(pk=user.pk).update_status_count(True)

@database_sync_to_async
def remove_online_count(user: UserAccount):
    return UserAccount.objects.get(pk=user.pk).update_status_count(False)

class NotificationConsumer(AsyncJsonWebsocketConsumer):

    """
    INITIALIZATION AND QUITTING
    """
    async def __heartbeat_loop(self):
        timeout = HEARTBEAT_TIMEOUT_MS / 1000
        while True:
            await asyncio.sleep(timeout)
            currtime = time.perf_counter()*1000
            # # print(f"CHECK CONNECTION: {currtime - self.lastpong}")
            if currtime - self.lastpong > HEARTBEAT_TIMEOUT_MS:
                # print(f"CHECK CONNECTION took too long: {currtime - self.lastpong}")
                await self.close()
                break
            

    async def connect(self) -> None:
        print("NotificationConsumer: connect: " + str(self.scope["user"]) )
        self.scope: AuthenticatedWebsocketScope
        self.channel_layer: RedisChannelLayer
        if not isinstance(self.scope["user"], UserAccount):
            return await self.close(code=WebsocketCloseCodes.NOT_AUTHENTICATED)
        self.user: UserAccount = self.scope["user"]
        
        self.newest_timestamp = time.time()

        await self.accept()

        await self.send_json({ "msg_type": "hello", "heartbeat_ms": HEARTBEAT_INTERVAL_MS })
        

        self.private_user_room = self.user.get_private_user_room()
        await self.channel_layer.group_add(self.private_user_room, self.channel_name)

        user_channels: tuple[list[str], list[ChatGroupnameRoomId]] = await get_user_channels(self.user)
        self.friend_public_group, self.chatrooms = user_channels

        for friend_room in self.friend_public_group:
            await self.channel_layer.group_add(friend_room, self.channel_name)

        for i in self.chatrooms:
            await self.channel_layer.group_add(i.groupname, self.channel_name)

        
        
        status = await add_online_count(self.user)
        if status is not None:
            await async_send_consumer_internal_command(self.user.get_friends_user_room(), {
                'type': 'friend.status.changed',
                'status': status,
                'user_id': self.user.pk
            })
        
        self.lastpong = time.perf_counter()*1000
        self.user_disconnect_timeout_task = asyncio.get_running_loop().create_task(self.__heartbeat_loop())

    async def disconnect(self, code: int):
        print("NotificationConsumer: disconnect, code: ", code)
        if hasattr(self, 'user') and isinstance(self.user, UserAccount):
            status = await remove_online_count(self.user)
            if status is not None:
                await async_send_consumer_internal_command(self.user.get_friends_user_room(), {
                    'type': 'friend.status.changed',
                    'status': status,
                    'user_id': self.user.pk
            })
        if code == WebsocketCloseCodes.NOT_AUTHENTICATED or code == 1006:
            return
        self.user_disconnect_timeout_task.cancel()
        await self.channel_layer.group_discard(self.private_user_room, self.channel_name)

        for friend_room in self.friend_public_group:
            await self.channel_layer.group_add(friend_room, self.channel_name)

        for i in self.chatrooms:
            await self.channel_layer.group_add(i.groupname, self.channel_name)



    """
    SEND MESSAGES OF A SPECIFIC TYPE TO THE CONSUMER
    """
    async def send_message(self, module: Literal['chat', 'notification', 'friend'], msg_type: int, payload: MessagePayload | None = None):
        await self.send_json({
            'module': module,
            'msg_type': msg_type,
            'payload': payload
        })
    async def send_message_chat(self, msg_type: int, payload: MessagePayload | None = None):
        await self.send_message('chat', msg_type, payload)

    async def send_message_notification(self, msg_type: int, payload: MessagePayload | None = None):
        # print(f"send_message_notification, msg_type: {msg_type}, payload: {payload}")
        # print(f"send_message_notification, typeof msg_type: {type(msg_type)}, typeof payload: {type(payload)}")
        await self.send_message('notification', msg_type, payload)
        

    """
    USER OR FRIEND ACTIONS
    :   friend.status.changed
    """
    async def friend_status_changed(self, event: InternalCommandFriendStatusChanged):
        await self.send_message('friend', MSG_TYPE_FRIEND_STATUS_CHANGED, {
            'status': event['status'],
            'user_id': event['user_id']
        })


    """
    CHAT MESSAGES: SEND TO CONSUMER FUNCTIONS
    :   chat.room.add
    :   chat.room.remove
    :   chat.room.update
    :   chat.message.new
    """
    async def chat_room_add(self, event: InternalCommandChatRoom):
        data = event['data']
        group_name = event.get('chat_room_channel_name')
        if group_name is not None:
            item = ChatGroupnameRoomId(groupname=group_name, room_id=data["room_id"])
            if len([i for i in self.chatrooms if i == item]) == 0:
                self.chatrooms.append(item)
                await self.channel_layer.group_add(group_name, self.channel_name)
                await self.send_message_chat(MSG_TYPE_CHAT_ROOM_ADD, {'chat_room': data})
            else:
                print(f"CHATROOM TO ADD DOES ALREADY EXIST")

    async def chat_room_remove(self, event: InternalCommandChatRoom):
        data: ChatRoomData = event['data']
        group_name = event.get('chat_room_channel_name')
        try:
            item = next(item for item in self.chatrooms if item.room_id == data["room_id"] and item.groupname == group_name)
            self.chatrooms.remove(item)
            await self.channel_layer.group_discard(group_name, self.channel_name)
            await self.send_message_chat(MSG_TYPE_CHAT_ROOM_REMOVE, {'chat_room': data})
        except StopIteration:
            print(f"chatroom to remove does not exist")

    async def chat_room_update(self, event: InternalCommandChatRoom):
        data: ChatRoomData = event['data']
        try:
            next(item for item in self.chatrooms if item.room_id == data["room_id"])
            await self.send_message_chat(MSG_TYPE_CHAT_ROOM_UPDATE, {'chat_room': data})
        except StopIteration:
            print(f"chatroom to update does not exist")
    
    async def chat_message_new(self, event):
        # print(f"HIER: new chat message: {event}")
        await self.send_message_chat(MSG_TYPE_CHAT_MESSAGE_NEW, {"room_id": event['room_id'], "chat_message": event['data']})
    

    """
    CHAT MESSAGES: SYNC DATABASE LOOKUP FUNKTIONS
    """
    @database_sync_to_async
    def create_room_chat_message(self, room_id: int, message: str):
        m = ChatMessage.objects.create(user=self.user, room_id=room_id, content=message)
        return serializer_chat_message_data(m)

    @database_sync_to_async
    def get_chatmessages_page(self, room_id: int, page_number: int) -> list[ChatMessageData] | None:
        # print(f"func -> get_chatmessages_page: page: {page_number}, typeof page: {type(page_number)}")
        chatmessages = ChatMessage.messages.by_room(room_id)
        # print(f"new chats: {chatmessages}")
        pages = Paginator(chatmessages, DEFAULT_ROOM_CHAT_MESSAGE_PAGE_SIZE)
        try:
            page = pages.page(page_number)
            return [ serializer_chat_message_data(e) for e in page.object_list if isinstance(e, ChatMessage)]
        except InvalidPage:
            print(f"page {page_number} out of bounds")
            
    @database_sync_to_async
    def get_chatmessages_unread_count(self, room_id: int):
        UnreadMessages.objects.filter(user=self.user, room_id=room_id).count()
        pass
    
    """
    CHAT MESSAGES: PARSE AND HANDLE COMMAND
    """
    async def handle_chat_command(self, content: ClientCommand):
        try:
            # print(f"handle_chat_command")
            match content['command']:
                case 'send_chat_message':
                    room_id = content['room_id']
                    message = content['message']
                    print(f"user: {self.user} wants to send a message to room: {room_id}")
                    item = next(item for item in self.chatrooms if item.room_id == room_id)
                    message_data: ChatMessageData = await self.create_room_chat_message(room_id, message)
                    print(f"user: {self.user} send a message to room: {room_id} - successsfull")
                    await async_send_consumer_internal_command(item.groupname, {
                        'type': 'chat.message.new',
                        'data': message_data,
                        'room_id': room_id,
                    })
                case 'get_chatmessages_page' :
                    # print(f"handle get_chatmessages_page")
                    data: list[ChatMessageData] | None = await self.get_chatmessages_page(content['room_id'], content['page_number'])
                    if data is None:
                        await self.send_message_chat(MSG_TYPE_CHAT_MESSAGE_PAGINATION_EXHAUSTED, {'room_id': content['room_id']})
                    else:
                        await self.send_message_chat(MSG_TYPE_CHAT_MESSAGE_PAGE, {
                            'chat_messages': data,
                            'new_page_number': content['page_number'] + 1,
                            'room_id': content['room_id'],
                        })
                # case "mark_notifications_read":
                #     data = await database_sync_to_async(self.mark_notifications_read)(content['oldest_timestamp'])
                #     await self.send_json(data)
                # case "get_unread_general_notifications_count":
                #     data = await database_sync_to_async(self.get_unread_general_notifications_count)()
                #     await self.send_json(data)
        except Exception as e:
            print(f"handle_chat_command error: {e}")
    
    """
    GENERAL GET MODULE AND CALL SPECIFIC HANDLER: PARSE AND HANDLE COMMAND
    """
    async def receive_json(self, content: ClientCommand, **kwargs):
        # if content.get('command') != "ping":
            # print(f"NotificationConsumer: receive_json. Command: {content}")
        try:
            if content.get('command') == 'ping':
                self.lastpong = time.perf_counter()*1000
                await self.send_json({ "msg_type": "pong" })
            elif content.get('module') == 'notification':
                await self.handle_notification_command(content)
            elif content.get('module') == 'chat':
                await self.handle_chat_command(content)
        except Exception as e:
            print("\nEXCEPTION: receive_json: " + str(e) + '\n') #TODO:
        
    """
    NOTIFICATIONS: PARSE AND HANDLE COMMAND
    """
    async def handle_notification_command(self, content: ClientCommand):
        try:
            match content['command']:
                case 'get_notifications':
                    data = await self.get_general_notifications(content['page_number'])
                    if data is None:
                        await self.send_message_notification(MSG_TYPE_NOTIFICATION_PAGINATION_EXHAUSTED, None)
                    else:
                        await self.send_message_notification(MSG_TYPE_NOTIFICATION_PAGE, { 'notifications': data, 'new_page_number': content['page_number'] + 1 })
                case "mark_notifications_read":
                    count: int = await self.mark_notifications_read(content['oldest_timestamp'])
                    await self.send_message_notification(MSG_TYPE_NOTIFICATION_UNREAD_COUNT, {'count': count } )
                case "get_unread_general_notifications_count":
                    count: int = await self.get_unread_count()
                    await self.send_message_notification(MSG_TYPE_NOTIFICATION_UNREAD_COUNT, {'count': count })
                case _:
                    return
        except Exception as e:
            print(f"handle_notification_command error: {e}")

    """
    NOTIFICATIONS: SEND TO CONSUMER FUNCTIONS
    :   notification.new
    :   notification.update
    """
    async def notification_new(self, event):
        await self.send_message_notification(MSG_TYPE_NOTIFICATION_NEW, {"notification": event['data']})

    
    async def notification_update(self, event):
        await self.send_message_notification(MSG_TYPE_NOTIFICATION_UPDATED, {"notification": event['data']})

    """
    NOTIFICATIONS: SYNC DATABASE FUNKTIONS -> RETURNS PAYLOAD
    """
    @database_sync_to_async
    def mark_notifications_read(self, newest_timestamp: int) -> int:
        # print(f"1. MARK AS READ: {datetime.fromtimestamp(newest_timestamp)}")
        ts = datetime.fromtimestamp(newest_timestamp)
        # print(f"2. MARK AS READ: {datetime.fromtimestamp(newest_timestamp)}")
        notifications = Notification.objects.filter(target=self.user, read=False).order_by('-timestamp').filter(timestamp__lte=(ts))
        # print(f"3. MARK AS READ: {datetime.fromtimestamp(newest_timestamp)}")
        for notification in notifications:
            # print(f"loop - MARK AS READ: {datetime.fromtimestamp(newest_timestamp)}")
            notification.read = True
            notification.save(send_notification=False)
        # print(f"4. MARK AS READ: {datetime.fromtimestamp(newest_timestamp)}")
        count = Notification.objects.filter(target=self.user, read=False).count()
        # print(f"COUNT: {count}")
        return int(count)
    
    @database_sync_to_async
    def get_unread_count(self):
        return int(Notification.objects.filter(target=self.user, read=False).count())

    @database_sync_to_async
    def get_general_notifications(self, page_number: int) -> list[NotificationData] | None:
        notifications = Notification.objects.filter(target=self.user).order_by('-timestamp')
        pages = Paginator(notifications, DEFAULT_NOTIFICATION_PAGE_SIZE)
        try:
            page = pages.page(page_number)
            return [ e.get_notification_data() for e in page.object_list if isinstance(e, Notification)]
        except InvalidPage:
            # print(f"page {page_number} out of bounds")
            return None





# def sync_get_user_rooms(user: UserAccount | int):
#     rooms = ChatRoom.objects.filter(users__pk=user, is_active=True).distinct()
#     return [(room.pk, room.group_name) for room in rooms]

# @database_sync_to_async
# def get_user_rooms(user: UserAccount):
#     rooms = ChatRoom.objects.filter(users=user, is_active=True).distinct()
#     return [(room.pk, room.group_name) for room in rooms]

# class NotificationConsumer(AsyncJsonWebsocketConsumer):

#     async def __heartbeat_loop(self):
#         timeout = HEARTBEAT_TIMEOUT_MS / 1000
#         while True:
#             await asyncio.sleep(timeout)
#             currtime = time.perf_counter()*1000
# #             # print(f"CHECK CONNECTION: {currtime - self.lastpong}")
#             if currtime - self.lastpong > HEARTBEAT_TIMEOUT_MS:
# #                 print(f"CHECK CONNECTION took too long: {currtime - self.lastpong}")
#                 await self.close()
#                 break

#     async def connect(self) -> None:
#         print("NotificationConsumer: connect: " + str(self.scope["user"]) )
#         self.scope: AuthenticatedWebsocketScope
#         self.channel_layer: RedisChannelLayer
#         if not isinstance(self.scope["user"], UserAccount):
#             return await self.close(code=WebsocketCloseCodes.NOT_AUTHENTICATED)
#         self.user: UserAccount = self.scope["user"]
        
#         self.newest_timestamp = time.time()
#         self.private_user_room = get_user_notification_room(self.user)
#         self.chatrooms: list[tuple[int, str]] = await get_user_rooms(self.user)
#         await self.channel_layer.group_add(self.private_user_room, self.channel_name)
#         for id, room_name in self.chatrooms:
#             await self.channel_layer.group_add(room_name, self.channel_name)

#         await self.accept()
#         await self.send_json({ "msg_type": "hello", "heartbeat_ms": HEARTBEAT_INTERVAL_MS })
#         self.lastpong = time.perf_counter()*1000
#         self.user_disconnect_timeout_task = asyncio.get_running_loop().create_task(self.__heartbeat_loop())

#     async def disconnect(self, code: int):
#         print("NotificationConsumer: disconnect, code: ", code)
#         if code == WebsocketCloseCodes.NOT_AUTHENTICATED or code == 1006:
#             return
#         self.user_disconnect_timeout_task.cancel()
#         await self.channel_layer.group_discard(self.private_user_room, self.channel_name)

#     # CHAT HANDLING

    
#     async def chat_room_add(self, event):
#         data: ChatRoomData = event['data']
#         group_name: str = event['group_name']
#         self.chatrooms.append((data["room_id"], group_name))
#         await self.channel_layer.group_add(group_name, self.channel_name)
#         await self.send_json({
#             "general_msg_type": MSG_TYPE_CHAT_ROOM_ADD,
#             "room": data,
#         })

#     async def chat_room_remove(self, event):
#         data: ChatRoomData = event['data']
#         group_name: str = event['group_name']
#         self.chatrooms.remove((data["room_id"], group_name))
#         await self.channel_layer.group_discard(group_name, self.channel_name)
#         await self.send_json({
#             "general_msg_type": MSG_TYPE_CHAT_ROOM_REMOVE,
#             "room": data,
#         })
    
#     async def chat_message_new(self, event):
# #         print(f"HIER: new chat message: {event}")
#         await self.send_json({
#             "general_msg_type": MSG_TYPE_NEW_CHAT_MESSAGE,
#             "room_id": event['room_id'],
#             "chat_message": event['data'],
#         })
        
#     @database_sync_to_async
#     def create_room_chat_message(self, room_id: int, message: str):
#         m = ChatMessage.objects.create(user=self.user, room_id=room_id, content=message)
#         return m.get_message_data()


#     @database_sync_to_async
#     def get_unread_count(self):
#         return Notification.objects.filter(target=self.user, read=False).count()
    
#     async def notification_new(self, event):
# #         print(f"HIER: new notification: {event}")
#         count = await self.get_unread_count()
#         await self.send_json({
#             "general_msg_type": MSG_TYPE_GET_NEW_GENERAL_NOTIFICATIONS,
#             "notification": event['data'],
#             "count": count
#         })
    
#     async def notification_update(self, event):
# #         print(f"HIER: updated notification: {event}")
#         await self.send_json({
#                 "general_msg_type": MSG_TYPE_UPDATED_NOTIFICATION,
#                 "notification": event['data']
#             })
    

#     #Fix errors
#     async def receive_json(self, content: ClientCommand):
        
#         command = content.get("command", None)
#         if command != "ping":
# #             print(f"NotificationConsumer: receive_json. Command: {command}")
#         # if content.get("module", None) == 'chat':
#         #     await self.handle_chat_command(content)
#         #     return
#         try:
#             match content['command']:
#                 case 'ping':
#                     self.lastpong = time.perf_counter()*1000
# #                     # print(f"PONG")
#                     data = { "msg_type": "pong" }
#                     await self.send_json(data)
#                 case 'send_chat_message':
#                     room_id = content.get('room_id')
#                     message = content.get('message')
# #                     print(f"room: {room_id}")
# #                     print(f"type room: {type(room_id)}")
# #                     print(f"message: {message}")
# #                     print(f"rooooms: {self.chatrooms}")
#                     for r in self.chatrooms:
# #                         print(f"is: {r[0]} type: {type(r[0])}")
#                     checkedroom = [i for i in self.chatrooms if i[0] == room_id]
# #                     print(f"checkedroom: {checkedroom[0]}")
#                     if len(checkedroom) == 1 and checkedroom[0][0] == room_id and len(message.lstrip()) != 0:
#                         checkedroom = checkedroom[0]
# #                         print(f"OKOK: ", checkedroom)
#                         message_data = await self.create_room_chat_message(room_id, message)
#                         await self.channel_layer.group_send(checkedroom[1], {
#                             'type': 'chat.message.new',
#                             'data': message_data,
#                             'room_id': room_id,
#                         })
#                 case 'get_general_notifications':
#                     data = await database_sync_to_async(self.get_general_notifications)(content.get('page_number', None))
#                     await self.send_json(data)
#                 case "mark_notifications_read":
#                     data = await database_sync_to_async(self.mark_notifications_read)(content['oldest_timestamp'])
#                     await self.send_json(data)
#                 case "get_unread_general_notifications_count":
#                     data = await database_sync_to_async(self.get_unread_general_notifications_count)()
#                     await self.send_json(data)
#                 case _:
#                     return


#         except Exception as e:
#             print("\nEXCEPTION: receive_json: " + str(e) + '\n') #TODO:
#             pass
        
#     async def handle_notification_command(self):
#         pass


#     def mark_notifications_read(self, newest_timestamp: int):
# #         print(f"MARK AS READ: {datetime.fromtimestamp(newest_timestamp)}")
#         ts = datetime.fromtimestamp(newest_timestamp)
#         notifications = Notification.objects.filter(target=self.user, read=False).order_by('-timestamp').filter(timestamp__lte=(ts))
        
#         for notification in notifications:
#             notification.read = True
#             notification.save(send_notification=False)
#         return {
#                 "general_msg_type":MSG_TYPE_GET_UNREAD_NOTIFICATIONS_COUNT,
#                 "count": Notification.objects.filter(target=self.user, read=False).count()
#             }

#     def get_unread_general_notifications_count(self) -> GeneralNotoficationsUnreadCount:
#         return {
#             "general_msg_type": MSG_TYPE_GET_UNREAD_NOTIFICATIONS_COUNT,
#             "count": (Notification.objects.filter(target=self.user, read=False)
#                               .order_by('-timestamp')
#                               .count())
#         }
            
#     def get_general_notifications(self, page_number: int) -> GeneralNotificationsData | PageinationExhausted:
#         notifications = Notification.objects.filter(target=self.user).order_by('-timestamp')
# #         # print(f"page: {page_number}, all notifications: {notifications}")
#         pages = Paginator(notifications, DEFAULT_NOTIFICATION_PAGE_SIZE)
#         try:
#             page = pages.page(page_number)
#             # print([ e.get_notification_data() for e in page.object_list if isinstance(e, Notification)])
#             return {
#                 "general_msg_type": MSG_TYPE_NOTIFICATIONS_DATA,
#                 "notifications": [ e.get_notification_data() for e in page.object_list if isinstance(e, Notification)],
#                 "new_page_number": page_number + 1
#             }
#         except InvalidPage:
# #             print(f"page {page_number} out of bounds")
#             return {
#                 "general_msg_type": MSG_TYPE_PAGINATION_EXHAUSTED,
#             }


