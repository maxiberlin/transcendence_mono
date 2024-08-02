import json
from django.conf import settings
from datetime import datetime
from django.utils import timezone
from user.models import UserAccount
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.core.paginator import Paginator, InvalidPage, Page
from django.core.serializers import serialize
from channels.db import database_sync_to_async
from django.contrib.contenttypes.models import ContentType
from friends.models import FriendRequest, FriendList
from game.models import GameRequest
from notification.utils import LazyNotificationEncoder
from django.contrib.auth.decorators import login_required
from notification.constants import *
from notification.models import Notification, NotificationData, get_user_notification_room
from typing import TypedDict, Literal, Unpack, Union
import time
from django.db.models.query import QuerySet
from channels_redis.core import RedisChannelLayer

async def __heartbeat_loop(self):
        timeout = msg_server.HEARTBEAT_INTERVAL_MS / 1000
        
        await asyncio.sleep(1)
        while True:
            await asyncio.sleep(timeout)
            if self.closed == True:
                break
            print("CHECK HEARTBEAT")
            if self.recentMessage == False:
                print("Heartbeat error -> No Message in Interval, close connection")
                await self.close_connection(push_to_engine=True, code=msg_server.WebsocketErrorCode.PLAYER_TIMEOUT.value, reason="Player Disconnected Timeout")
                break
            self.recentMessage = False
        print("HEARTBEAT LOOP DONE")
res: msg_server.ServerHelloCommand = {
                    "tag": "hello",
                    "heartbeat_ms": msg_server.HEARTBEAT_INTERVAL_MS
        }
        await self.send(json.dumps(res))
async def send_pong(self, client_timestamp_ms: float):
        curr = time.time() * 1000
        print(f"ping fro user: user {self.user}")
        servertime = self.started_unix_ms + (curr - self.started_perf) * 1000
        res: msg_server.ServerPongCommand = {
            "tag": "pong",
            "client_timestamp_ms": client_timestamp_ms,
            "server_timestamp_ms": servertime
        }
        await self.send(text_data=json.dumps(res))

class NotificationConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self) -> None:
        print("NotificationConsumer: connect: " + str(self.scope["user"]) )
        self.user: UserAccount | None = self.scope["user"] if "user" in self.scope else None
        if not isinstance(self.user, UserAccount):
            await self.close()
            return
        await self.accept()
        self.newest_timestamp = time.time()
        # self.user_room = f"user_room_{self.scope['user']}"
        self.user_room = get_user_notification_room(self.scope['user'])
        # self.user_room = "543j25knj24n2k5n23k"
        print(f"connect group room?!?!!?: {self.user_room}")
        if isinstance(self.channel_layer, RedisChannelLayer):
            print(f"connect group room: {self.user_room}")
            await self.channel_layer.group_add(self.user_room, self.channel_name)
        


    async def disconnect(self, code):
        if self.channel_layer:
            await self.channel_layer.group_discard(self.user_room, self.channel_name)
        print("NotificationConsumer: disconnect")
    
    
    @database_sync_to_async
    def get_unread_count(self):
        return Notification.objects.filter(target=self.user, read=False).count()
    
    async def notification_new(self, event):
        print(f"HIER: new notification: {event}")
        count = await self.get_unread_count()
        await self.send_json({
            "general_msg_type": NotificationMessages.GENERAL_MSG_TYPE_GET_NEW_GENERAL_NOTIFICATIONS.value,
            "notifications": event['data'],
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
        
        if content.get("cmd") == "ping":
            await self.send_json({ "tag": "pong" })
            return
        
        
        command = content.get("command", None)
        print(f"NotificationConsumer: receive_json. Command: {command}")
        try:
            data = None
            match content['command']:
                case 'get_general_notifications':
                    data = await self.get_general_notifications(content.get('page_number', None))

                case "mark_notifications_read":
                    data = await self.mark_notifications_read(content['oldest_timestamp'])

                case "get_unread_general_notifications_count":
                    data = await self.get_unread_general_notifications_count()

            await self.send_json(data)
        except Exception as e:
            print("\nEXCEPTION: receive_json: " + str(e) + '\n') #TODO:
            pass

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



# class NotificationConsumer(AsyncJsonWebsocketConsumer):

#     async def connect(self) -> None:
#         print("NotificationConsumer: connect: " + str(self.scope["user"]) )
#         self.user: UserAccount | None = self.scope["user"] if "user" in self.scope else None
#         if not isinstance(self.user, UserAccount):
#             await self.close()
#             return
#         await self.accept()
#         self.newest_timestamp = time.time()
#         # self.user_room = f"user_room_{self.scope['user']}"
#         self.user_room = get_user_notification_room(self.scope['user'])
#         # self.user_room = "543j25knj24n2k5n23k"
#         print(f"connect group room?!?!!?: {self.user_room}")
#         if isinstance(self.channel_layer, RedisChannelLayer):
#             print(f"connect group room: {self.user_room}")
#             await self.channel_layer.group_add(self.user_room, self.channel_name)
        


#     async def disconnect(self, code):
#         if self.channel_layer:
#             await self.channel_layer.group_discard(self.user_room, self.channel_name)
#         print("NotificationConsumer: disconnect")
    
    
    
#     async def notification_new(self, event):
#         print(f"HIER: new notification: {event}")
#         await self.send_json({
#             "general_msg_type": NotificationMessages.GENERAL_MSG_TYPE_GET_NEW_GENERAL_NOTIFICATIONS.value,
#             "notifications": event['data']
#         })
    
#     async def notification_update(self, event):
#         print(f"HIER: updated notification: {event}")
#         await self.send_json({
#                 "general_msg_type": NotificationMessages.GENERAL_MSG_TYPE_UPDATED_NOTIFICATION.value,
#                 "notification": event['data']
#             })
    

#     #Fix errors
#     async def receive_json(self, content: ClientCommand):
        
#         if content.get("cmd") == "ping":
#             await self.send_json({ "tag": "pong" })
#             return
        
        
#         command = content.get("command", None)
#         print(f"NotificationConsumer: receive_json. Command: {command}")
#         try:
#             data = None
#             match content['command']:
#                 case 'get_general_notifications':
#                     data = await self.get_general_notifications(content.get('page_number', None))

#                 # case "get_new_general_notifications":
#                 #     self.newest_timestamp = content.get('newest_timestamp')
#                 #     data = await self.get_new_general_notifications(content.get('newest_timestamp'))

#                 # case "refresh_general_notifications":
#                 #     print(f"@@@---->Oldest = {content['oldest_timestamp']} || -->Newsest = {content['newest_timestamp']}")
#                 #     data = await self.refresh_general_notifications(content['oldest_timestamp'], content['newest_timestamp'])

#                 case "mark_notifications_read":
#                     data = await self.mark_notifications_read(content['oldest_timestamp'])

#                 case "get_unread_general_notifications_count":
#                     data = await self.get_unread_general_notifications_count()

#                 # case "accept_friend_request":
#                 #     data = await self.handle_friend_request( content['notification_id'], "accept")

#                 # case "reject_friend_request":
#                 #     data = await self.handle_friend_request( content['notification_id'], "reject")

#             await self.send_json(data)
#         except Exception as e:
#             print("\nEXCEPTION: receive_json: " + str(e) + '\n') #TODO:
#             pass

#     @database_sync_to_async
#     def mark_notifications_read(self, newest_timestamp: int) -> None:
#         print(f"MARK AS READ: {datetime.fromtimestamp(newest_timestamp)}")
#         notifications = (Notification.objects.filter(target=self.user, read=False)
#                          .order_by('-timestamp')
#                          .filter(timestamp__lte=(datetime.fromtimestamp(newest_timestamp))))
        
#         for notification in notifications:
#             notification.read = True
#             notification.save(send_notification=False)

#     @database_sync_to_async
#     def get_unread_general_notifications_count(self) -> GeneralNotoficationsUnreadCount:
#         return {
#             "general_msg_type": NotificationMessages.GENERAL_MSG_TYPE_GET_UNREAD_NOTIFICATIONS_COUNT.value,
#             "count": (Notification.objects.filter(target=self.user, read=False)
#                               .order_by('-timestamp')
#                               .count())
#         }
            
#     @database_sync_to_async
#     def get_general_notifications(self, page_number: int) -> GeneralNotificationsData | PageinationExhausted:
#         notifications = Notification.objects.filter(target=self.user).order_by('-timestamp')
#         # print(f"all notifications: {notifications}")
#         pages = Paginator(notifications, DEFAULT_NOTIFICATION_PAGE_SIZE)
#         try:
#             page = pages.page(page_number)
#             # print([ e.get_notification_data() for e in page.object_list if isinstance(e, Notification)])
#             return {
#                 "general_msg_type": NotificationMessages.GENERAL_MSG_TYPE_NOTIFICATIONS_DATA.value,
#                 "notifications": [ e.get_notification_data() for e in page.object_list if isinstance(e, Notification)],
#                 "new_page_number": page_number + 1
#             }
#         except InvalidPage:
#             print(f"page {page_number} out of bounds")
#             return {
#                 "general_msg_type": NotificationMessages.GENERAL_MSG_TYPE_PAGINATION_EXHAUSTED.value,
#             }


#     @database_sync_to_async
#     def get_new_general_notifications(self, newest_timestamp: int) -> NewGeneralNotifications:
#         notifications = (Notification.objects.filter(target=self.user, read=False)
#                          .order_by('-timestamp')
#                          .filter(timestamp__gte=(datetime.fromtimestamp(newest_timestamp))))
#         return {
#             "general_msg_type": NotificationMessages.GENERAL_MSG_TYPE_GET_NEW_GENERAL_NOTIFICATIONS.value,
#             "notifications": [ e.get_notification_data() for e in notifications]
#         }


#     @database_sync_to_async
#     def refresh_general_notifications(self, oldest_timestamp: int, newest_timestamp: int) -> NotificationsRefreshPayload:
#         notifications = (Notification.objects.filter(target=self.user, read=False)
#                          .order_by('-timestamp')
#                          .filter(timestamp__gte=datetime.fromtimestamp(oldest_timestamp),
#                                 timestamp__lte=datetime.fromtimestamp(newest_timestamp)))
#         return {
#             "general_msg_type": NotificationMessages.GENERAL_MSG_TYPE_NOTIFICATIONS_REFRESH_PAYLOAD.value,
#             "notifications": [ e.get_notification_data() for e in notifications]
#         }


#     @database_sync_to_async
#     def handle_friend_request(self, notification_id: int, action: Literal["accept", "reject"]) -> UpdatedNotification | None:
#         try:
#             notification: Notification = Notification.objects.get(pk=notification_id)
#             friend_request: FriendRequest | None = notification.content_object
#             if not friend_request or friend_request.receiver != self.user:
#                 raise RuntimeError("friend request")
#             if action == "accept":
#                 updated_notification = friend_request.accept()
#             elif action == "reject":
#                 updated_notification = friend_request.reject()
#             else:
#                 raise RuntimeError("Invalid action")
#             return {
#                 "general_msg_type": NotificationMessages.GENERAL_MSG_TYPE_UPDATED_NOTIFICATION.value,
#                 "notification": updated_notification.get_notification_data()
#             }
#         except Exception as e:
#             raise RuntimeError("An error occurred with that notification. Try refreshing the browser.") #TODO:
#         return None
