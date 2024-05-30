from django.db import models
from user.models import UserAccount

class ChatRoom(models.Model):
    name = models.CharField(max_length=255, unique=True)
    initiator = models.ForeignKey(UserAccount, on_delete=models.CASCADE)
    created_at = models.DateTimeField(verbose_name='message created at', auto_now_add=True)
    deleted_at = models.DateTimeField(verbose_name='message deleted at')

    def __str__(self):
        return self.name


class Message(models.Model):
    message = models.CharField(max_length=255)
    created_at = models.DateTimeField(verbose_name='message created at', auto_now_add=True)
    deleted_at = models.DateTimeField(verbose_name='message deleted at')
    chat_room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE)
