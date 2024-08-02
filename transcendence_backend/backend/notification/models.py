from django.db import models
from user.models import UserAccount, BasicUserData
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType, ContentTypeManager
from typing import TypeVar, Protocol, Generic, TypedDict
from django.contrib.humanize.templatetags.humanize import naturaltime
from django.dispatch import receiver
from django.db.models.signals import post_save, pre_save
from channels.layers import get_channel_layer
from channels_redis.core import RedisChannelLayer
from asgiref.sync import async_to_sync
from django.utils import timezone



class NotificationData(TypedDict):
    notification_type: str
    notification_id: int
    description: str
    action_id: int
    is_active: bool
    is_read: bool
    natural_timestamp: str
    timestamp: int
    redirect_url: str | None
    user: BasicUserData | None


class Notification(models.Model):
    target = models.ForeignKey(UserAccount, on_delete=models.CASCADE)
    from_user = models.ForeignKey(UserAccount, on_delete=models.CASCADE, null=True, blank=True, related_name='from_user')
    redirect_url = models.URLField(max_length=500, unique=False, null=True, blank=True, help_text="redirection for when the notification is clicked")
    description = models.CharField(max_length=255, unique=False, blank=True, null=True)
    read = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id') # type: ignore

    def __str__(self):
        return self.description
    
    def save(self, send_notification=False, **kwargs):
        self.send_notification = send_notification
        super().save(**kwargs)
        print(f"CUSTOM SAVE - AFTER")
    
    def get_notification_data(self) -> "NotificationData":
        model = self.content_object
        notification_type = "unkown"
        active = False
        if self.content_object and hasattr(self.content_object, 'is_active') and isinstance(self.content_object.is_active, bool):
            active = self.content_object.is_active
        if isinstance(model, models.Model):
            notification_type = str(model._meta.model_name)
        # userdata: BasicUserData | None = {
        #         "id": int(self.from_user.pk),
        #         "avatar": str(self.from_user.avatar.url),
        #         "username": str(self.from_user.username)
        #     } if self.from_user else None
        
        return {
            "notification_id": int(self.pk),
            "notification_type": str(notification_type),
            "description": str(self.description),
            "is_read": bool(self.read),
            "timestamp": int(self.timestamp.timestamp()),
            "natural_timestamp": str(naturaltime(self.timestamp)),
            "action_id": int(model.pk if model and active else -1),
            "is_active": active,
            "redirect_url": str(self.redirect_url.rstrip('/')) if self.redirect_url else None,
            "user": self.from_user.get_basic_user_data() if self.from_user else None
        }


def get_user_notification_room(user: UserAccount):
    return f"user-room-{hash(user)}"


@receiver(post_save, sender=Notification)
def create_notification(sender, instance: Notification, created, **kwargs):
    room = get_user_notification_room(instance.target)
    layer = get_channel_layer()
    if not created and not instance.send_notification:
        return
    msg_type = "notification.new" if created else "notification.update"
    try:
        if isinstance(layer, RedisChannelLayer):
            async_to_sync(layer.group_send)(
                room,
                {
                    "type": msg_type,
                    "data": instance.get_notification_data()
                }
            )
    except Exception as e:
        print(f"error: {e}")





# class Notification(models.Model):
#     target = models.ForeignKey(UserAccount, on_delete=models.CASCADE)
#     from_user = models.ForeignKey(UserAccount, on_delete=models.CASCADE, null=True, blank=True, related_name='from_user')
#     redirect_url = models.URLField(max_length=500, unique=False, null=True, blank=True, help_text="redirection for when the notification is clicked")
#     description = models.CharField(max_length=255, unique=False, blank=True, null=True)
#     read = models.BooleanField(default=False)
#     timestamp = models.DateTimeField(auto_now_add=True)
#     content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
#     object_id = models.PositiveIntegerField()
#     content_object = GenericForeignKey()

#     def __str__(self):
#         return self.description
    
#     def get_content_object_type(self):
#         return str(self.content_object.get_cname) if self.content_object else "Unknown"
    
