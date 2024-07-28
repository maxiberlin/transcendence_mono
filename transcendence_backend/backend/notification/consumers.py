import json
from django.conf import settings
from datetime import datetime
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
from notification.models import Notification, NotificationData
from typing import TypedDict, Literal, Unpack, Union
import time
from django.db.models.query import QuerySet

# class AcceptFriendRequest(TypedDict):
# 	command: Literal['accept_friend_request']
# 	notification_id: int

# class RejectFriendRequest(TypedDict):
# 	command: Literal['reject_friend_request']
# 	notification_id: int

# class AcceptGameInvitation(TypedDict):
# 	command: Literal['accept_game_invitation']
# 	notification_id: int

# class RejectGameInvitation(TypedDict):
# 	command: Literal['reject_game_invitation']
# 	notification_id: int

# class GetGeneralNotifications(TypedDict):
# 	command: Literal['get_general_notifications']
# 	page_number: int

# class GetNewGeneralNotifications(TypedDict):
# 	command: Literal['get_new_general_notifications']
# 	newest_timestamp: int

# class RefreshGeneralNotifications(TypedDict):
# 	command: Literal['refresh_general_notifications']
# 	oldest_timestamp: int
# 	newest_timestamp: int

# class MarkAllNotificationsAsRead(TypedDict):
# 	command: Literal['mark_notifications_read']
# 	oldest_timestamp: int

# class GetUnreadNotificationCount(TypedDict):
# 	command: Literal['get_unread_general_notifications_count']

# ClientCommand = Union[
# 	AcceptFriendRequest,
# 	RejectFriendRequest,
# 	AcceptGameInvitation,
# 	RejectGameInvitation,
# 	GetGeneralNotifications,
# 	GetNewGeneralNotifications,
# 	RefreshGeneralNotifications,
# 	MarkAllNotificationsAsRead,
# 	GetUnreadNotificationCount
# ]

# class NotificationConsumer(AsyncJsonWebsocketConsumer):

# 	async def connect(self):
# 		print("NotificationConsumer: connect: " + str(self.scope["user"]) )
# 		self.newest_timestamp = time.time()
# 		await self.accept()


# 	async def disconnect(self, code):
# 		print("NotificationConsumer: disconnect")

# 	#Fix errors
# 	async def receive_json(self, content: ClientCommand):
# 		command = content.get("command", None)
# 		print("NotificationConsumer: receive_json. Command: " + command)
# 		try:
# 			user_account: UserAccount = self.scope['user']
# 			match content['command']:
# 				case 'get_general_notifications':
# 					data = await get_general_notifications(user_account, content.get('page_number', None))
# 					if data == None:
# 						pass
# 					else:
# 						data = json.loads(data)
# 						await self.send_general_notifications_data(data['notifications'], data['new_page_number'])

# 				case "get_new_general_notifications":
# 					self.newest_timestamp = content.get('newest_timestamp')
# 					data = await get_new_general_notifications(user_account, content.get('newest_timestamp'))
# 					if data == None:
# 						pass
# 					else:
# 						data = json.loads(data)
# 						await self.send_new_general_notifications_data(data['notifications'])

# 				case "refresh_general_notifications":
# 					print(f"@@@---->Oldest = {content['oldest_timestamp']} || -->Newsest = {content['newest_timestamp']}")
# 					data = await refresh_general_notifications(user_account, content['oldest_timestamp'], content['newest_timestamp'])
# 					if data == None:
# 						raise RuntimeError("Something went wrong. Try refreshing the browser.") #TODO:
# 					else:
# 						data = json.loads(data)
# 						await self.send_general_refreshed_notifications_data(data['notifications'])

# 				case "mark_notifications_read":
# 					await mark_notifications_read(user_account, self.newest_timestamp)


# 				case "get_unread_general_notifications_count":
# 					count = await get_unread_general_notifications_count(user_account)
# 					await self.send_unread_notification_count(count)

# 				case "accept_friend_request":
# 					notification_id = content['notification_id']
# 					data = await accept_friend_request(user_account, notification_id)
# 					if data == None:
# 						raise RuntimeError("Something went wrong. Try refreshing the browser.") #TODO:
# 					else:
# 						data = json.loads(data)
# 						await self.send_updated_friend_request_notification(data['notification'])

# 				case "reject_friend_request":
# 					notification_id = content['notification_id']
# 					data = await reject_friend_request(user_account, notification_id)
# 					if data == None:
# 						raise RuntimeError("Something went wrong. Try refreshing the browser.") #TODO:
# 					else:
# 						data = json.loads(data)
# 						await self.send_updated_friend_request_notification(data['notification'])
			
# 		except Exception as e:
# 			print("\nEXCEPTION: receive_json: " + str(e) + '\n') #TODO:
# 			pass

# 	async def send_general_notifications_data(self, notifications, new_page_number):
# 		await self.send_json(
# 			{
# 				"general_msg_type": GENERAL_MSG_TYPE_NOTIFICATIONS_DATA,
# 				"notifications": notifications,
# 				"new_page_number": new_page_number,
# 			},
# 		)

# 	class GeneralNotificationData(TypedDict):
# 		general_msg_type: Literal[0]
	
# 	async def send_updated_friend_request_notification(self, notification):
# 		"""
# 		After a friend request is accepted or rejected, send the updated notification to template
# 		data contains 'notification' and 'response':
# 		1. data['notification']
# 		2. data['response']
# 		"""
# 		await self.send_json(
# 			{
# 				"general_msg_type": GENERAL_MSG_TYPE_UPDATED_NOTIFICATION,
# 				"notification": notification,
# 			},
# 		)

# 	async def general_pagination_exhausted(self):
# 		"""
# 		Called by receive_json when pagination is exhausted for general notifications
# 		"""
# 		#print("General Pagination DONE... No more notifications.")
# 		await self.send_json(
# 			{
# 				"general_msg_type": GENERAL_MSG_TYPE_PAGINATION_EXHAUSTED,
# 			},
# 		)
	
# 	async def display_progress_bar(self, shouldDisplay):
# 		print("NotificationConsumer: display_progress_bar: " + str(shouldDisplay)) 
# 		await self.send_json(
# 			{
# 				"progress_bar": shouldDisplay,
# 			},
# 		)
	
# 	async def send_general_refreshed_notifications_data(self, notifications):
# 		"""
# 		Called by receive_json when ready to send a json array of the notifications
# 		"""
# 		#print("NotificationConsumer: send_general_refreshed_notifications_payload: " + str(notifications))
# 		await self.send_json(
# 			{
# 				"general_msg_type": GENERAL_MSG_TYPE_NOTIFICATIONS_REFRESH_PAYLOAD,
# 				"notifications": notifications,
# 			},
# 		)

# 	async def send_new_general_notifications_data(self, notifications):
# 		await self.send_json(
# 			{
# 				"general_msg_type": GENERAL_MSG_TYPE_GET_NEW_GENERAL_NOTIFICATIONS,
# 				"notifications": notifications,
# 			},
# 		)

# 	async def send_unread_notification_count(self, count: int):
# 		await self.send_json(
# 			{
# 				"general_msg_type": GENERAL_MSG_TYPE_GET_UNREAD_NOTIFICATIONS_COUNT,
# 				"count": count,
# 			},
# 		)

# @database_sync_to_async
# def mark_notifications_read(user_account: UserAccount, newest_timestamp: int):
# 	friend_request_ct = ContentType.objects.get_for_model(FriendRequest)
# 	friend_list_ct = ContentType.objects.get_for_model(FriendList)
# 	game_request_ct = ContentType.objects.get_for_model(GameRequest)
# 	notifications = Notification.objects.filter(
# 		target=UserAccount.objects.get(pk=user_account.pk),
# 		content_type__in=[friend_request_ct, friend_list_ct, game_request_ct],
# 	).order_by('-timestamp')
# 	if notifications is not None:
# 		notifications = notifications.filter(timestamp__gte=(newest_timestamp))
# 		if notifications is not None:
# 			for notification in notifications:
# 				notification.read = True

# @database_sync_to_async
# def get_unread_general_notifications_count(user_account: UserAccount):
# 		friend_request_ct = ContentType.objects.get_for_model(FriendRequest)
# 		friend_list_ct = ContentType.objects.get_for_model(FriendList)
# 		game_request_ct = ContentType.objects.get_for_model(GameRequest)
# 		notifications_cout = Notification.objects.filter(
# 			target=UserAccount.objects.get(pk=user_account.pk),
# 			content_type__in=[friend_request_ct, friend_list_ct, game_request_ct],
# 			read=False
# 		).order_by('-timestamp').count()
# 		return notifications_cout
		
# @database_sync_to_async
# def get_general_notifications(user, page_number):
# 	"""
# 	Get General Notifications with Pagination (next page of results).
# 	This is for appending to the bottom of the notifications list.
# 	"""
# 	if user.is_authenticated:
# 		friend_request_ct = ContentType.objects.get_for_model(FriendRequest)
# 		friend_list_ct = ContentType.objects.get_for_model(FriendList)
# 		game_request_ct = ContentType.objects.get_for_model(GameRequest)
# 		notifications = Notification.objects.filter(
# 			target=UserAccount.objects.get(username=user),
# 			content_type__in=[friend_request_ct, friend_list_ct, game_request_ct]
# 		).order_by('-timestamp')
# 		pages = Paginator(notifications, DEFAULT_NOTIFICATION_PAGE_SIZE)
# 		data = {}
# 		if len(notifications) > 0:
# 			print(f'length = {len(notifications)}')
# 			if int(page_number) <= pages.num_pages:
# 				item = LazyNotificationEncoder()
# 				serialized_notifications = item.serialize(pages.page(page_number).object_list)
# 				data['notifications'] = serialized_notifications
# 				new_page_number = int(page_number) + 1
# 				data['new_page_number'] = new_page_number
# 		else:
# 			return None
# 		return json.dumps(data)
# 	return None

# @database_sync_to_async
# def get_new_general_notifications(user: UserAccount, newest_timestamp: int):
# 	if user.is_authenticated:
# 		friend_request_ct = ContentType.objects.get_for_model(FriendRequest)
# 		friend_list_ct = ContentType.objects.get_for_model(FriendList)
# 		game_request_ct = ContentType.objects.get_for_model(GameRequest)
# 		notifications = Notification.objects.filter(
# 			target=UserAccount.objects.get(username=user),
# 			content_type__in=[friend_request_ct, friend_list_ct, game_request_ct]
# 		).order_by('-timestamp')
# 		if notifications is not None:
# 			notifications = notifications.filter(timestamp__gte=(datetime.fromtimestamp(newest_timestamp)))
# 			data = {}
# 			if len(notifications) > 0:
# 				item = LazyNotificationEncoder()
# 				serialized_notifications = item.serialize(notifications)
# 				data['notifications'] = serialized_notifications
# 			else:
# 				return None
# 			return json.dumps(data)
# 	return None


# @database_sync_to_async
# def refresh_general_notifications(user, oldest_timestamp: int, newest_timestamp: int):
# 	"""
# 	Retrieve the general notifications newer than the oldest one on the screen and younger than the newest one the screen.
# 	The result will be: Notifications currently visible will be updated
# 	"""
# 	data = {}
# 	print(f"oldest: {oldest_timestamp}, newest: {newest_timestamp}")
# 	if user.is_authenticated:
# 		friend_request_ct = ContentType.objects.get_for_model(FriendRequest)
# 		print('Start---> 000 <<<<<<<<<<<<')
# 		friend_list_ct = ContentType.objects.get_for_model(FriendList)
# 		game_request_ct = ContentType.objects.get_for_model(GameRequest)
# 		print('Start---> 111 <<<<<<<<<<<<')
# 		notifications = Notification.objects.filter(
# 			target=user, content_type__in=[friend_request_ct, friend_list_ct, game_request_ct], read=False,
# 			timestamp__gte=datetime.fromtimestamp(oldest_timestamp),
# 			timestamp__lte=datetime.fromtimestamp(oldest_timestamp)
# 		).order_by('-timestamp')
# 		print('Start---> 222 <<<<<<<<<<<<')
# 		item = LazyNotificationEncoder()
# 		print('Start---> ==+== <<<<<<<<<<<<')
# 		data['notifications'] = item.serialize(notifications)
# 	else:
# 		raise RuntimeError("User must be authenticated to get notifications.") #TODO:

# 	return json.dumps(data) 


# @database_sync_to_async
# def accept_friend_request(user, notification_id):
#     data = {}
#     if user.is_authenticated:
#         try:
#             notification = Notification.objects.get(pk=notification_id)
#             friend_request: FriendRequest | None = notification.content_object
#             if friend_request and friend_request.receiver == user:
#                 updated_notification = friend_request.accept()
#                 item = LazyNotificationEncoder()
#                 data['notification'] = item.serialize([updated_notification])[0]
#                 return json.dumps(data)
#         except Notification.DoesNotExist:
#             raise RuntimeError("An error occurred with that notification. Try refreshing the browser.") #TODO:
#     return None


# @database_sync_to_async
# def reject_friend_request(user, notification_id):
#     data = {}
#     if user.is_authenticated:
#         try:
#             notification = Notification.objects.get(pk=notification_id)
#             friend_request: FriendRequest | None = notification.content_object
#             if friend_request and friend_request.receiver == user:
#                 updated_notification = friend_request.reject()
#                 item = LazyNotificationEncoder()
#                 data['notification'] = item.serialize([updated_notification])[0]
#                 return json.dumps(data)
#         except Notification.DoesNotExist:
#             raise RuntimeError("An error occurred with that notification. Try refreshing the browser.") #TODO:
#     return None

class NotificationConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self) -> None:
        print("NotificationConsumer: connect: " + str(self.scope["user"]) )
        self.newest_timestamp = time.time()
        self.user: UserAccount | None = self.scope["user"] if "user" in self.scope else None
        if not isinstance(self.user, UserAccount):
            await self.close()
        await self.accept()


    async def disconnect(self, code):
        print("NotificationConsumer: disconnect")

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

                case "get_new_general_notifications":
                    self.newest_timestamp = content.get('newest_timestamp')
                    data = await self.get_new_general_notifications(content.get('newest_timestamp'))

                case "refresh_general_notifications":
                    print(f"@@@---->Oldest = {content['oldest_timestamp']} || -->Newsest = {content['newest_timestamp']}")
                    data = await self.refresh_general_notifications(content['oldest_timestamp'], content['newest_timestamp'])

                case "mark_notifications_read":
                    data = await self.mark_notifications_read(self.newest_timestamp)

                case "get_unread_general_notifications_count":
                    data = await self.get_unread_general_notifications_count()

                case "accept_friend_request":
                    data = await self.handle_friend_request( content['notification_id'], "accept")

                case "reject_friend_request":
                    data = await self.handle_friend_request( content['notification_id'], "reject")

            await self.send_json(data)
        except Exception as e:
            print("\nEXCEPTION: receive_json: " + str(e) + '\n') #TODO:
            pass

    @database_sync_to_async
    def mark_notifications_read(self, newest_timestamp: int) -> None:
        notifications = (Notification.objects.filter(target=self.user)
                         .order_by('-timestamp')
                         .filter(timestamp__gte=(newest_timestamp)))
        for notification in notifications:
            notification.read = True

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
            return {
                "general_msg_type": NotificationMessages.GENERAL_MSG_TYPE_PAGINATION_EXHAUSTED.value,
            }


    @database_sync_to_async
    def get_new_general_notifications(self, newest_timestamp: int) -> NewGeneralNotifications:
        notifications = (Notification.objects.filter(target=self.user, read=False)
                         .order_by('-timestamp')
                         .filter(timestamp__gte=(datetime.fromtimestamp(newest_timestamp))))
        return {
            "general_msg_type": NotificationMessages.GENERAL_MSG_TYPE_GET_NEW_GENERAL_NOTIFICATIONS.value,
            "notifications": [ e.get_notification_data() for e in notifications]
        }


    @database_sync_to_async
    def refresh_general_notifications(self, oldest_timestamp: int, newest_timestamp: int) -> NotificationsRefreshPayload:
        notifications = (Notification.objects.filter(target=self.user, read=False)
                         .order_by('-timestamp')
                         .filter(timestamp__gte=datetime.fromtimestamp(oldest_timestamp),
                                timestamp__lte=datetime.fromtimestamp(newest_timestamp)))
        return {
            "general_msg_type": NotificationMessages.GENERAL_MSG_TYPE_NOTIFICATIONS_REFRESH_PAYLOAD.value,
            "notifications": [ e.get_notification_data() for e in notifications]
        }


    @database_sync_to_async
    def handle_friend_request(self, notification_id: int, action: Literal["accept", "reject"]) -> UpdatedNotification | None:
        try:
            notification: Notification = Notification.objects.get(pk=notification_id)
            friend_request: FriendRequest | None = notification.content_object
            if not friend_request or friend_request.receiver != self.user:
                raise RuntimeError("friend request")
            if action == "accept":
                updated_notification = friend_request.accept()
            elif action == "reject":
                updated_notification = friend_request.reject()
            else:
                raise RuntimeError("Invalid action")
            return {
                "general_msg_type": NotificationMessages.GENERAL_MSG_TYPE_UPDATED_NOTIFICATION.value,
                "notification": updated_notification.get_notification_data()
            }
        except Exception as e:
            raise RuntimeError("An error occurred with that notification. Try refreshing the browser.") #TODO:
        return None


# class NotificationConsumer(AsyncJsonWebsocketConsumer):

# 	async def connect(self):
# 		print("NotificationConsumer: connect: " + str(self.scope["user"]) )
# 		await self.accept()


# 	async def disconnect(self, code):
# 		print("NotificationConsumer: disconnect")

# 	#Fix errors
# 	async def receive_json(self, content):
# 		command = content.get("command", None)
# 		print("NotificationConsumer: receive_json. Command: " + command)
# 		try:
# 			user_account = self.scope['user']
# 			if command == "get_general_notifications":
# 				data = await get_general_notifications(user_account, content.get('page_number', None))
# 				if data == None:
# 					pass
# 				else:
# 					data = json.loads(data)
# 					await self.send_general_notifications_data(data['notifications'], data['new_page_number'])
# 			elif command == "accept_friend_request":
# 				notification_id = content['notification_id']
# 				data = await accept_friend_request(user_account, notification_id)
# 				if data == None:
# 					raise RuntimeError("Something went wrong. Try refreshing the browser.") #TODO:
# 				else:
# 					data = json.loads(data)
# 					await self.send_updated_friend_request_notification(data['notification'])
# 			elif command == "reject_friend_request":
# 				notification_id = content['notification_id']
# 				data = await reject_friend_request(user_account, notification_id)
# 				if data == None:
# 					raise RuntimeError("Something went wrong. Try refreshing the browser.") #TODO:
# 				else:
# 					data = json.loads(data)
# 					await self.send_updated_friend_request_notification(data['notification'])
# 			elif command == "refresh_general_notifications":
# 				print(f"@@@---->Oldest = {content['oldest_timestamp']} || -->Newsest = {content['newest_timestamp']}")
# 				data = await refresh_general_notifications(user_account, content['oldest_timestamp'], content['newest_timestamp'])
# 				if data == None:
# 					raise RuntimeError("Something went wrong. Try refreshing the browser.") #TODO:
# 				else:
# 					data = json.loads(data)
# 					await self.send_general_refreshed_notifications_data(data['notifications'])
# 		except Exception as e:
# 			print("\nEXCEPTION: receive_json: " + str(e) + '\n') #TODO:
# 			pass

# 	async def send_general_notifications_data(self, notifications, new_page_number):
# 		await self.send_json(
# 			{
# 				"general_msg_type": GENERAL_MSG_TYPE_NOTIFICATIONS_DATA,
# 				"notifications": notifications,
# 				"new_page_number": new_page_number,
# 			},
# 		)
	
# 	async def send_updated_friend_request_notification(self, notification):
# 		"""
# 		After a friend request is accepted or rejected, send the updated notification to template
# 		data contains 'notification' and 'response':
# 		1. data['notification']
# 		2. data['response']
# 		"""
# 		await self.send_json(
# 			{
# 				"general_msg_type": GENERAL_MSG_TYPE_UPDATED_NOTIFICATION,
# 				"notification": notification,
# 			},
# 		)

# 	async def general_pagination_exhausted(self):
# 		"""
# 		Called by receive_json when pagination is exhausted for general notifications
# 		"""
# 		#print("General Pagination DONE... No more notifications.")
# 		await self.send_json(
# 			{
# 				"general_msg_type": GENERAL_MSG_TYPE_PAGINATION_EXHAUSTED,
# 			},
# 		)
	
# 	async def display_progress_bar(self, shouldDisplay):
# 		print("NotificationConsumer: display_progress_bar: " + str(shouldDisplay)) 
# 		await self.send_json(
# 			{
# 				"progress_bar": shouldDisplay,
# 			},
# 		)
	
# 	async def send_general_refreshed_notifications_data(self, notifications):
# 		"""
# 		Called by receive_json when ready to send a json array of the notifications
# 		"""
# 		#print("NotificationConsumer: send_general_refreshed_notifications_payload: " + str(notifications))
# 		await self.send_json(
# 			{
# 				"general_msg_type": GENERAL_MSG_TYPE_NOTIFICATIONS_REFRESH_PAYLOAD,
# 				"notifications": notifications,
# 			},
# 		)

# @database_sync_to_async
# def get_general_notifications(user, page_number):
# 	"""
# 	Get General Notifications with Pagination (next page of results).
# 	This is for appending to the bottom of the notifications list.
# 	"""
# 	if user.is_authenticated:
# 		friend_request_ct = ContentType.objects.get_for_model(FriendRequest)
# 		friend_list_ct = ContentType.objects.get_for_model(FriendList)
# 		game_request_ct = ContentType.objects.get_for_model(GameRequest)
# 		notifications = Notification.objects.filter(
# 			target=UserAccount.objects.get(username=user),
# 			content_type__in=[friend_request_ct, friend_list_ct, game_request_ct]
# 		).order_by('-timestamp')
# 		pages = Paginator(notifications, DEFAULT_NOTIFICATION_PAGE_SIZE)
# 		data = {}
# 		if len(notifications) > 0:
# 			print(f'length = {len(notifications)}')
# 			if int(page_number) <= pages.num_pages:
# 				item = LazyNotificationEncoder()
# 				serialized_notifications = item.serialize(pages.page(page_number).object_list)
# 				data['notifications'] = serialized_notifications
# 				new_page_number = int(page_number) + 1
# 				data['new_page_number'] = new_page_number
# 		else:
# 			return None
# 		return json.dumps(data)
# 	return None


# @database_sync_to_async
# def accept_friend_request(user, notification_id):
#     """
#     Accept a friend request from within the notification
#     """
#     data = {}
#     if user.is_authenticated:
#         try:
#             notification = Notification.objects.get(pk=notification_id)
#             friend_request: FriendRequest | None = notification.content_object
#             if friend_request and friend_request.receiver == user:
#                 updated_notification = friend_request.accept()
#                 item = LazyNotificationEncoder()
#                 data['notification'] = item.serialize([updated_notification])[0]
#                 return json.dumps(data)
#         except Notification.DoesNotExist:
#             raise RuntimeError("An error occurred with that notification. Try refreshing the browser.") #TODO:
#     return None


# @database_sync_to_async
# def reject_friend_request(user, notification_id):
#     """
#     Dccept a friend request from within the notification
#     """
#     data = {}
#     if user.is_authenticated:
#         try:
#             notification = Notification.objects.get(pk=notification_id)
#             friend_request: FriendRequest | None = notification.content_object
#             if friend_request and friend_request.receiver == user:
#                 updated_notification = friend_request.reject()
#                 item = LazyNotificationEncoder()
#                 data['notification'] = item.serialize([updated_notification])[0]
#                 return json.dumps(data)
#         except Notification.DoesNotExist:
#             raise RuntimeError("An error occurred with that notification. Try refreshing the browser.") #TODO:
#     return None

# @database_sync_to_async
# def refresh_general_notifications(user, oldest_timestamp, newest_timestamp):
# 	"""
# 	Retrieve the general notifications newer than the oldest one on the screen and younger than the newest one the screen.
# 	The result will be: Notifications currently visible will be updated
# 	"""
# 	data = {}
# 	if user.is_authenticated:
# 		friend_request_ct = ContentType.objects.get_for_model(FriendRequest)
# 		print('Start---> 000 <<<<<<<<<<<<')
# 		friend_list_ct = ContentType.objects.get_for_model(FriendList)
# 		game_request_ct = ContentType.objects.get_for_model(GameRequest)
# 		print('Start---> 111 <<<<<<<<<<<<')
# 		notifications = Notification.objects.filter(
# 			target=user, content_type__in=[friend_request_ct, friend_list_ct, game_request_ct], read=False).order_by('-timestamp')
# 		# 	timestamp__gte=oldest_ts,
# 		# 	timestamp__lte=newest_ts
# 		# ).order_by('-timestamp')
# 		print('Start---> 222 <<<<<<<<<<<<')
# 		item = LazyNotificationEncoder()
# 		print('Start---> ==+== <<<<<<<<<<<<')
# 		data['notifications'] = item.serialize(notifications)
# 	else:
# 		raise RuntimeError("User must be authenticated to get notifications.") #TODO:

# 	return json.dumps(data) 