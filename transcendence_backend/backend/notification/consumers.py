import json
import time
import asyncio
from datetime import datetime
from typing import TypedDict, Literal, Unpack, Union


from django.conf import settings
from django.utils import timezone
from django.core.paginator import Paginator, InvalidPage, Page
from django.core.serializers import serialize
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth.decorators import login_required
from django.db.models.query import QuerySet

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from channels_redis.core import RedisChannelLayer


from user.models import UserAccount, Player
from chat.models import ChatRoom, ChatMessage, ChatRoomData, ChatMessageData

from notification.constants import *
from notification.models import Notification, NotificationData, get_user_notification_room

def use_timeout(timeout_ms: int):
    def get_time():
        return time.perf_counter_ns()//1_000_000
    
    last = start = get_time()
    
    def check_timeout():
        nonlocal last
        now = get_time()
        print(f"CHECK CONNECTION: STAMP: {now - start}, DIFF: {now - last}")
        return now - last > timeout_ms
    
    def reset_timeout():
        nonlocal last
        now = get_time()
        print(f"NEW PING: STAMP: {now - start}, DIFF: {now - last}")
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

    async def receive_json(self, content: ClientCommand):
            
            if content.get("command", None) == 'ping':
                self.reset_timeout()
                await self.send_json({ "msg_type": "pong" })
     




def sync_get_user_rooms(user: UserAccount | int):
    rooms = ChatRoom.objects.filter(users__pk=user, is_active=True).distinct()
    return [(room.pk, room.group_name) for room in rooms]

@database_sync_to_async
def get_user_rooms(user: UserAccount):
    rooms = ChatRoom.objects.filter(users=user, is_active=True).distinct()
    return [(room.pk, room.group_name) for room in rooms]

class NotificationConsumer(AsyncJsonWebsocketConsumer):

    async def __heartbeat_loop(self):
        timeout = HEARTBEAT_TIMEOUT_MS / 1000
        while True:
            await asyncio.sleep(timeout)
            currtime = time.perf_counter()*1000
            # print(f"CHECK CONNECTION: {currtime - self.lastpong}")
            if currtime - self.lastpong > HEARTBEAT_TIMEOUT_MS:
                print(f"CHECK CONNECTION took too long: {currtime - self.lastpong}")
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
        self.user_room = get_user_notification_room(self.user)
        self.chatrooms: list[tuple[int, str]] = await get_user_rooms(self.user)
        await self.channel_layer.group_add(self.user_room, self.channel_name)
        await self.accept()
        await self.send_json({ "msg_type": "hello", "heartbeat_ms": HEARTBEAT_INTERVAL_MS })
        self.lastpong = time.perf_counter()*1000
        self.user_disconnect_timeout_task = asyncio.get_running_loop().create_task(self.__heartbeat_loop())

    async def disconnect(self, code: int):
        print("NotificationConsumer: disconnect, code: ", code)
        if code == WebsocketCloseCodes.NOT_AUTHENTICATED or code == 1006:
            return
        self.user_disconnect_timeout_task.cancel()
        await self.channel_layer.group_discard(self.user_room, self.channel_name)

    # CHAT HANDLING

    
    async def chat_room_add(self, event):
        data: ChatRoomData = event['data']
        group_name: str = event['group_name']
        self.chatrooms.append((data["room_id"], group_name))
        await self.send_json({
            "general_msg_type": 'chat_room_add',
            "chat_message": data,
        })

    async def chat_room_remove(self, event):
        data: ChatRoomData = event['data']
        group_name: str = event['group_name']
        self.chatrooms.remove((data["room_id"], group_name))
        await self.send_json({
            "general_msg_type": 'chat_room_remove',
            "chat_message": data,
        })
    
    async def chat_message_new(self, event):
        print(f"HIER: new chat message: {event}")
        await self.send_json({
            "general_msg_type": NotificationMessages.GENERAL_MSG_TYPE_GET_NEW_GENERAL_NOTIFICATIONS.value,
            "chat_message": event['data'],
        })
    
    @database_sync_to_async
    def get_unread_count(self):
        return Notification.objects.filter(target=self.user, read=False).count()
    
    async def notification_new(self, event):
        print(f"HIER: new notification: {event}")
        count = await self.get_unread_count()
        await self.send_json({
            "general_msg_type": NotificationMessages.GENERAL_MSG_TYPE_GET_NEW_GENERAL_NOTIFICATIONS.value,
            "notification": event['data'],
            "count": count
        })
    
    async def notification_update(self, event):
        print(f"HIER: updated notification: {event}")
        await self.send_json({
                "general_msg_type": NotificationMessages.GENERAL_MSG_TYPE_UPDATED_NOTIFICATION.value,
                "notification": event['data']
            })
    

    #Fix errors
    async def receive_json(self, content: ClientCommand):
        
        command = content.get("command", None)
        if command != "ping":
            print(f"NotificationConsumer: receive_json. Command: {command}")
        # if content.get("module", None) == 'chat':
        #     await self.handle_chat_command(content)
        #     return
        try:
            match content['command']:
                case 'ping':
                    self.lastpong = time.perf_counter()*1000
                    # print(f"PONG")
                    data = { "msg_type": "pong" }


                case 'get_general_notifications':
                    data = await self.get_general_notifications(content.get('page_number', None))

                case "mark_notifications_read":
                    data = await self.mark_notifications_read(content['oldest_timestamp'])

                case "get_unread_general_notifications_count":
                    data = await self.get_unread_general_notifications_count()
                
                case _:
                    return

            await self.send_json(data)
        except Exception as e:
            print("\nEXCEPTION: receive_json: " + str(e) + '\n') #TODO:
            pass
        
    async def handle_notification_command(self):
        pass

    # async def handle_chat_command(self, content):
    #     command = content.get("command", None)
    #     if command == 'send':
    #         if len(content['message'].lstrip()) == 0:
    #             raise ClientError('EMPTY_STRING', 'Cannot send an empty string!')
    #         await self.send_room(content['room_id'], content['message'])
    #     elif command == 'join':
    #         await self.join_room(content['room'], content['type'])
    #     elif command == 'leave':
    #         await self.leave_room(content['room'])
    #     elif command == 'get_room_chat_messages':
    #         print(f"PublicChatConsumer: get_room_chat_messages with p.{content['page_number']}")
    #         room = await get_room_or_error(content['room_id'])
    #         data = await get_room_chat_messages(room, content['page_number'])
    #         if data != None:
    #             data = json.loads(data)
    #             await self.send_messages_data(data['messages'], data['new_page_number'])
    #     pass

    @database_sync_to_async
    def mark_notifications_read(self, newest_timestamp: int):
        print(f"MARK AS READ: {datetime.fromtimestamp(newest_timestamp)}")
        ts = datetime.fromtimestamp(newest_timestamp)
        notifications = Notification.objects.filter(target=self.user, read=False).order_by('-timestamp').filter(timestamp__lte=(ts))
        
        for notification in notifications:
            notification.read = True
            notification.save(send_notification=False)
        return {
                "general_msg_type": NotificationMessages.GENERAL_MSG_TYPE_GET_UNREAD_NOTIFICATIONS_COUNT.value,
                "count": Notification.objects.filter(target=self.user, read=False).count()
            }

    @database_sync_to_async
    def get_unread_general_notifications_count(self) -> GeneralNotoficationsUnreadCount:
        return {
            "general_msg_type": NotificationMessages.GENERAL_MSG_TYPE_GET_UNREAD_NOTIFICATIONS_COUNT.value,
            "count": (Notification.objects.filter(target=self.user, read=False)
                              .order_by('-timestamp')
                              .count())
        }
            
    @database_sync_to_async
    def get_general_notifications(self, page_number: int) -> GeneralNotificationsData | PageinationExhausted:
        notifications = Notification.objects.filter(target=self.user).order_by('-timestamp')
        # print(f"page: {page_number}, all notifications: {notifications}")
        pages = Paginator(notifications, DEFAULT_NOTIFICATION_PAGE_SIZE)
        try:
            page = pages.page(page_number)
            # print([ e.get_notification_data() for e in page.object_list if isinstance(e, Notification)])
            return {
                "general_msg_type": NotificationMessages.GENERAL_MSG_TYPE_NOTIFICATIONS_DATA.value,
                "notifications": [ e.get_notification_data() for e in page.object_list if isinstance(e, Notification)],
                "new_page_number": page_number + 1
            }
        except InvalidPage:
            print(f"page {page_number} out of bounds")
            return {
                "general_msg_type": NotificationMessages.GENERAL_MSG_TYPE_PAGINATION_EXHAUSTED.value,
            }


