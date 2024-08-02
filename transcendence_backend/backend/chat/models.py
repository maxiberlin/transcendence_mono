from django.db import models
from user.models import UserAccount, BasicUserData
from django.conf import settings
from typing import Literal,TypedDict



class ChatRoomData(TypedDict):
    room_id: int
    type: Literal['tournament', 'private', 'UNKNOWN']
    users: list[BasicUserData]

    # msg_type: str
class ChatMessageData(TypedDict):
    user_id: int
    username: str
    message: str
    avatar: str
    timestamp: int

 

class ChatRoom(models.Model):
    title = models.CharField(max_length=255, unique=True, blank=False,)
    type = models.CharField(max_length=30, blank=False)
    is_active = models.BooleanField(default=True)
    users = models.ManyToManyField(settings.AUTH_USER_MODEL, help_text="users who are connected to chat room.")

    def __str__(self):
        return self.title
    

    def connect_user(self, user):
        is_user_added = False
        if not user in self.users.all():
            self.users.add(user)
            self.save()
            is_user_added = True
        elif user in self.users.all():
            is_user_added = True
        return is_user_added 


    def disconnect_user(self, user):
        is_user_removed = False
        if user in self.users.all():
            self.users.remove(user)
            self.save()
            is_user_removed = True
        return is_user_removed 

    def get_room_data(self) -> ChatRoomData:
        users = self.users.all()
        userdata = [u.get_basic_user_data() for u in users if isinstance(u, UserAccount)]
        return {
            'room_id': str(self.pk),
            'type': str(self.type), # type: ignore
            'users': userdata
        }


    @property
    def group_name(self):
        """
        Returns the Channels Group name that sockets should subscribe to to get sent messages as they are generated."""
        return f'{self.type}-chatroom-{self.pk}'


class ChatMessageManager(models.Manager["ChatMessage"]):
    def by_room(self, room):
        # qs = ChatMessage.objects.filter(room=room).order_by("-timestamp")
        qs = ChatMessage.objects.filter(room=room, room__is_active=True).order_by("-timestamp")
        return qs


class ChatMessage(models.Model):
    user = models.ForeignKey(UserAccount, on_delete=models.CASCADE)
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)
    content = models.TextField(unique=False, blank=False)

    messages = ChatMessageManager()
    objects = models.Manager()

    def __str__(self):
        return self.content
    
    def get_message_data(self) -> ChatMessageData:
        userdata = self.user.get_basic_user_data()
        return {
            'user_id': userdata['id'],
            'avatar': userdata['avatar'],
            'username': userdata['username'],
            'timestamp': int(self.timestamp.timestamp()),
            'message': str(self.content)
        }
    
# class MessageUser(models.Model):
#     user = models.ForeignKey(UserAccount, related_name='user_messages', on_delete=models.CASCADE)
#     message = models.ForeignKey(ChatMessage, related_name='message_users', on_delete=models.CASCADE)
#     read = models.BooleanField(default=False)
#     read_timestamp = models.DateTimeField(null=True, blank=True)