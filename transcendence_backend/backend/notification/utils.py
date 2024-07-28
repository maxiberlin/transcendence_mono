from django.core.serializers.python import Serializer
from django.contrib.humanize.templatetags.humanize import naturaltime
from .models import Notification
from friends.views2 import get_friend_request_item
from friends.models import FriendRequest
import time
import datetime
from django.db import models
from django.core.serializers import serialize


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

class LazyNotificationEncoder(Serializer):
	"""
	Serialize a Notification into JSON. 
	"""
	def get_dump_object(self, obj: models.Model):
		if not isinstance(obj, Notification):
			return {}
		if obj.content_object is None:
			return
		dump_object = {}
		if (obj.get_content_object_type() == "FriendRequest" or obj.get_content_object_type() == "GameRequest") and obj.from_user:
			dump_object.update({'notification_type': obj.get_content_object_type()})
			dump_object.update({'notification_id': obj.pk})
			dump_object.update({'description': obj.description})
			dump_object.update({'is_active': obj.content_object.is_active})
			dump_object.update({'is_read': obj.read})
			
			dump_object.update({'natural_timestamp': str(naturaltime(obj.timestamp))})
			dump_object.update({'timestamp': str(int(obj.timestamp.timestamp())) })
			data: FriendRequest = obj.content_object
			item = get_friend_request_item(data.pk, obj.from_user)
			dump_object.update({
				'actions': {
					'redirect_url': obj.redirect_url.rstrip('/') if obj.redirect_url else "",
				},
				"item": item
			})
		if obj.get_content_object_type() == "FriendList" and obj.from_user:
			
			dump_object.update({'notification_type': obj.get_content_object_type()})
			dump_object.update({'notification_id': obj.pk})
			dump_object.update({'description': obj.description})
			dump_object.update({'natural_timestamp': str(naturaltime(obj.timestamp))})
			dump_object.update({'is_read': obj.read})
			dump_object.update({'timestamp': str(int(obj.timestamp.timestamp())) })

			data: FriendRequest = obj.content_object
			item = get_friend_request_item(data.pk, obj.from_user)
			dump_object.update({
				'actions': {
					'redirect_url': obj.redirect_url.rstrip('/') if obj.redirect_url else "",
				},
				"item": item
			})
		return dump_object