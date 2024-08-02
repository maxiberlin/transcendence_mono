from django.db import models
from user.models import UserAccount
from django_stubs_ext.db.models import TypedModelMeta
from django.db.models.query import QuerySet
from typing import TypedDict, Literal
import uuid
from django.contrib.humanize.templatetags.humanize import naturaltime
from datetime import datetime
from notification.models import BasicUserData


# class ChatConversationData(TypedDict):
#     conversation_ident: str
#     users: list[BasicUserData]
#     created_at: str
#     last_activity: str
#     type: Literal["single", "group"]

# class ChatMessageData(TypedDict):
#     user_id: int
#     message_ident: str
#     message: str
#     natural_timestamp: str


# class ChatConversationsManager(models.Manager["ChatConversation"]):
#     sequence_no = 0

#     @classmethod
#     def __get_channel_name(cls):
#         s = uuid.uuid1(cls.sequence_no)
#         cls.sequence_no += 1
#         return f"chat_conversation_channel_{str(s)}"

#     def create_conversation(self, title: str, creator: UserAccount, first_participant: UserAccount) -> "ChatConversation":
#         conv = super().create(
#             title=title,
#             creator=creator,
#             channel_name=ChatConversationsManager.__get_channel_name(),
#         )
#         conv.add_participant(creator)
#         conv.add_participant(first_participant)
#         return conv

# class ChatConversation(models.Model):
#     title = models.CharField(max_length=40)
#     creator = models.ForeignKey(UserAccount, on_delete=models.CASCADE)
#     channel_name = models.CharField(max_length=40, unique=True)
#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at =  models.DateTimeField(auto_now=True)
#     last_activity = models.DateTimeField(auto_now_add=True)
#     deleted_at = models.DateTimeField(null=True)

#     conversations = ChatConversationsManager()

#     def add_participant(self, user: UserAccount):
#         if ChatParticipation.participants.user_is_in_conversation(self, user):
#             raise RuntimeError("participant is already part of the conversation")
#         ChatParticipation.participants.create_and_add_participant(self, user)
        
#     def get_conversation_data(self) -> ChatConversationData:
#         participants = ChatParticipation.participants.get_conversation_participants(self)
#         return {
#             "created_at": str(self.created_at),
#             "last_activity": str(self.last_activity),
#             "conversation_ident": self.channel_name,
#             "type": "single" if len(participants) == 2 else "group",
#             "users": [{"id":p.user.pk, "avatar": p.user.avatar.url, "username": p.user.username} for p in participants]
#         }
#         pass



# class ChatParticipationManager(models.Manager["ChatParticipation"]):
#     def create_and_add_participant(self, conv: ChatConversation, user: UserAccount) -> "ChatParticipation":
#         if self.user_is_in_conversation(conv, user):
#             raise RuntimeError("participant is already part of the conversation")
#         return super().create(conversation=conv, user=user)

#     def user_is_in_conversation(self, conv: ChatConversation, user: UserAccount):
#         return super(ChatParticipationManager, self).get_queryset().filter(conversation=conv, user=user).exists()
    
#     def get_conversation_participants(self, conv: ChatConversation) -> QuerySet["ChatParticipation"]:
#         return super(ChatParticipationManager, self).get_queryset().filter(conversation=conv)

#     def get_user_participations(self, user: UserAccount) -> QuerySet["ChatParticipation"]:
#         return super(ChatParticipationManager, self).get_queryset().filter(user=user).order_by("-conversation__last_activity")

#     def get_user_conversations(self, user: UserAccount) -> list[ChatConversation]:
#         query = self.get_user_participations(user)
#         return [p.conversation for p in query]

#     def get_user_conversation_channels(self, user: UserAccount):
#         query = self.get_user_participations(user)
#         return [p.conversation.channel_name for p in query]


# class ChatParticipation(models.Model):
#     class ChatParticipationType(models.TextChoices):
#         SINGLE = 'single', 'single'
#         GROUP = 'group', 'group'
#     conversation = models.ForeignKey(ChatConversation, on_delete=models.CASCADE)
#     user = models.OneToOneField(UserAccount, on_delete=models.CASCADE)
#     type = models.CharField(choices=ChatParticipationType.choices)
#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at =  models.DateTimeField(auto_now=True)

#     participants = ChatParticipationManager()

#     def add_message_and_get_message_data(self, message: str) -> "ChatMessageData":
#         choice = ChatMessage.MessageType.TEXT
#         m = ChatMessage.objects.create(
#             guid=uuid.uuid4(),
#             conversation=self.conversation,
#             sender=self.user,
#             message_type=choice,
#             message=message,
#         )
#         return m.get_message_data()
        





# class ChatMessageManager(models.Manager):
#     def get_conversation_messages(self, conv: ChatConversation) -> QuerySet["ChatMessage"]:
#         return super().get_queryset().filter(conversation=conv).order_by("-created_at")

#     def get_user_messages(self, user: UserAccount):
#         super().get_queryset().filter(sender=user).order_by("-created_at")


# class ChatMessage(models.Model):
#     class MessageType(models.IntegerChoices):
#         TEXT = 0
#     guid = models.UUIDField()
#     conversation = models.ForeignKey(ChatConversation, on_delete=models.CASCADE)
#     sender = models.ForeignKey(UserAccount, on_delete=models.CASCADE)
#     message_type = models.IntegerField(choices=MessageType.choices)
#     message = models.CharField(max_length=255)
#     created_at = models.DateTimeField(auto_now_add=True)
#     deleted_at = models.DateTimeField(null=True)

#     messages = ChatMessageManager()
#     objects = models.Manager()

#     def get_message_data(self) -> ChatMessageData:
#         return {
#             "user_id": self.sender.pk,
#             "message_ident": str(self.guid),
#             "message": self.message,
#             "natural_timestamp": naturaltime(self.created_at),
#         }
