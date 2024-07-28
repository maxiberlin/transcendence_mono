from django.db import models
from user.models import UserAccount
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType, ContentTypeManager
from typing import TypeVar, Protocol, Generic, TypedDict
from django.contrib.humanize.templatetags.humanize import naturaltime
import abc

class BasicUserData(TypedDict):
    id: int
    username: str
    avatar: str

class NotificationData(TypedDict):
    notification_type: str
    notification_id: int
    description: str
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

    def get_content_object_type(self) -> str:
        if self.content_object and hasattr(self.content_object, "get_cname"):
            return str(self.content_object.get_cname)
        return "unknown"
    
    def get_notification_data(self) -> "NotificationData":
        model = self.content_object
        notification_type = "unkown"
        if isinstance(model, models.Model):
            notification_type = str(model._meta.model_name)
        item = None
        if self.content_object and hasattr(self.content_object, "get_notification_data"):
            item = self.content_object.get_notification_data(self)
        is_active = False
        if self.content_object and hasattr(self.content_object, "has_active_action"):
            is_active = self.content_object.has_active_action
        userdata: BasicUserData | None = {
                "id": self.from_user.pk,
                "avatar": self.from_user.avatar.url,
                "username": self.from_user.username
            } if self.from_user else None
        return {
            "notification_id": self.pk,
            "notification_type": notification_type,
            "description": str(self.description),
            "is_read": self.read,
            "timestamp": int(self.timestamp.timestamp()),
            "natural_timestamp": naturaltime(self.timestamp),
            "is_active": is_active,
            "redirect_url": self.redirect_url.rstrip('/') if self.redirect_url else None,
            "user": userdata
        }


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
    
