from channels.layers import get_channel_layer
from channels_redis.core import RedisChannelLayer
from asgiref.sync import async_to_sync
from .constants import InternalCommand

# def get_user_notification_room(user):
#     return f"user-room-{hash(user)}"

# async def async_send_consumer_internal_command_user_room(user, msg: InternalCommand):
    
# def sync_send_consumer_internal_command_user_room(user, msg: InternalCommand):
#     sync_send_consumer_internal_command(get_user_notification_room)

# friends.models -> chat.utils -> notification.utils -> notifications.constants -> notfification.models -> notfification.utils
# notification.utils -> notifications.constants -> notfification.models -> notfification.utils

# notification.utils -> notification.constants -> notification.models, chat.models, user.models
# notification.constants -> notification.models, chat.models, user.models
# notification.models -> notification.utils

# from django.dispatch import receiver
# from django.db.models.signals import post_save, pre_save


# @receiver(post_save, sender=Notification)
# def create_notification(sender, instance: Notification, created, **kwargs):
#     # room = get_user_notification_room(instance.target)
#     # layer = get_channel_layer()
#     if not created and not instance.send_notification:
#         return

#     msg_type = "notification.new" if created else "notification.update"
#     try:
#         sync_send_consumer_internal_command(instance.target.get_user_room(), {
#             "type": msg_type,
#             "data": instance.get_notification_data()
#         })
#         # if isinstance(layer, RedisChannelLayer):
#         #     async_to_sync(layer.group_send)(
#         #         room,
#         #         {
                    
#         #         }
#         #     )
#     except Exception as e:
#         print(f"error: {e}")


async def async_send_consumer_internal_command(group_room_name: str, msg: InternalCommand):
    layer = get_channel_layer()
    if isinstance(layer, RedisChannelLayer):
        await layer.group_send( group_room_name, msg )
    else:
        print(f"invalid channel layer -> need redis")

def sync_send_consumer_internal_command(group_room_name: str, msg: InternalCommand):
    layer = get_channel_layer()
    if isinstance(layer, RedisChannelLayer):
        async_to_sync(layer.group_send)( group_room_name, msg )
    else:
        print(f"invalid channel layer -> need redis")


async def async_send_consumer_internal_command_list(data: list[tuple[str, InternalCommand]]):
    layer = get_channel_layer()
    if isinstance(layer, RedisChannelLayer):
        for d in data:
            await layer.group_send(d[0], d[1] )
    else:
        print(f"invalid channel layer -> need redis")


def sync_send_consumer_internal_command_list(data: list[tuple[str, InternalCommand]]):
    async_to_sync(async_send_consumer_internal_command_list)(data)


# from django.core.serializers.python import Serializer
# from django.contrib.humanize.templatetags.humanize import naturaltime
# from .models import Notification, NotificationData
# from user.models import UserAccount
# from friends.views2 import get_friend_request_item
# from friends.models import FriendRequest
# import time
# import datetime
# from django.db import models
# from django.core.serializers import serialize
# import json

# class LazyNotificationEncoder(Serializer):
# 	"""
# 	Serialize a Notification into JSON. 
# 	"""
# 	def get_dump_object(self, obj: Notification):
# 		if obj.content_object is None:
# 			return
# 		dump_object = {}
# 		if obj.get_content_object_type() == "FriendRequest" or obj.get_content_object_type() == "GameRequest":
# 			dump_object.update({'notification_type': obj.get_content_object_type()})
# 			dump_object.update({'notification_id': str(obj.pk)})
# 			dump_object.update({'description': obj.description})
# 			dump_object.update({'is_active': str(obj.content_object.is_active)})
# 			dump_object.update({'is_read': str(obj.read)})
# 			dump_object.update({'natural_timestamp': str(naturaltime(obj.timestamp))})
# 			dump_object.update({'timestamp': str(obj.timestamp)})
# 			dump_object.update({
# 				'actions': {
# 					'redirect_url': str(obj.redirect_url).rstrip('/'),
# 				},
# 				"from": {
# 					"image_url": str(obj.from_user.avatar.url) if obj.from_user else None
# 				}
# 			})
# 		if obj.get_content_object_type() == "FriendList":
# 			dump_object.update({'notification_type': obj.get_content_object_type()})
# 			dump_object.update({'notification_id': str(obj.pk)})
# 			dump_object.update({'description': obj.description})
# 			dump_object.update({'natural_timestamp': str(naturaltime(obj.timestamp))})
# 			dump_object.update({'is_read': str(obj.read)})
# 			dump_object.update({'timestamp': str(obj.timestamp)})
# 			dump_object.update({
# 				'actions': {
# 					'redirect_url': str(obj.redirect_url).rstrip('/'),
# 				},
# 				"from": {
# 					"image_url": str(obj.from_user.avatar.url) if obj.from_user else None
# 				}
# 			})
# 		return dump_object

# class LazyNotificationEncoder(Serializer):
# 	"""
# 	Serialize a Notification into JSON. 
# 	"""
# 	def get_dump_object(self, obj: models.Model):
# 		if not isinstance(obj, Notification):
# 			return {}
# 		if obj.content_object is None:
# 			return
# 		dump_object = {}
# 		if (obj.get_content_object_type() == "FriendRequest" or obj.get_content_object_type() == "GameRequest") and obj.from_user:
# 			dump_object.update({'notification_type': obj.get_content_object_type()})
# 			dump_object.update({'notification_id': obj.pk})
# 			dump_object.update({'description': obj.description})
# 			dump_object.update({'is_active': obj.content_object.is_active})
# 			dump_object.update({'is_read': obj.read})
            
# 			dump_object.update({'natural_timestamp': str(naturaltime(obj.timestamp))})
# 			dump_object.update({'timestamp': str(int(obj.timestamp.timestamp())) })
# 			data: FriendRequest = obj.content_object
# 			item = get_friend_request_item(data.pk, obj.from_user)
# 			dump_object.update({
# 				'actions': {
# 					'redirect_url': obj.redirect_url.rstrip('/') if obj.redirect_url else "",
# 				},
# 				"item": item
# 			})
# 		if obj.get_content_object_type() == "FriendList" and obj.from_user:
            
# 			dump_object.update({'notification_type': obj.get_content_object_type()})
# 			dump_object.update({'notification_id': obj.pk})
# 			dump_object.update({'description': obj.description})
# 			dump_object.update({'natural_timestamp': str(naturaltime(obj.timestamp))})
# 			dump_object.update({'is_read': obj.read})
# 			dump_object.update({'timestamp': str(int(obj.timestamp.timestamp())) })

# 			data: FriendRequest = obj.content_object
# 			item = get_friend_request_item(data.pk, obj.from_user)
# 			dump_object.update({
# 				'actions': {
# 					'redirect_url': obj.redirect_url.rstrip('/') if obj.redirect_url else "",
# 				},
# 				"item": item
# 			})
# 		return dump_object


# def get_user_notification_room(user: UserAccount):
# 	return f"user-room-{hash(user)}"

# async def send_notif(room: str, data):
# 	layer = get_channel_layer()
# 	print(f"channel_layer: {layer}")
# 	print(f"send to room2: {room}")
# 	print(f"send data2: {data}")
# 	await layer.group_send( room, { "type": "notification.new", "data": data } )

# def sync_send_notification_message(user: UserAccount, notification: Notification):
# 	room = get_user_notification_room(user)
# 	try:
# 		data = [notification.get_notification_data()]
# 		print(f"send to room1: {room}")
# 		print(f"send data1: {data}")
# 		async_to_sync(send_notif)(room, data)
# 	except Exception as e:
# 		print(f"error: {e}")

# def sync_send_notification(user_to_send_to: UserAccount, data):
# 	try:
# 		room = get_user_notification_room(user_to_send_to)
# 		layer = get_channel_layer()
# 		if isinstance(layer, RedisChannelLayer):
# 			async_to_sync(layer.group_send)(room, { "type": "notification.new", "data": data } )
# 	except Exception as e:
# 		print(f"error: {e}")
