from django.db import models
from user.models import UserAccount
from django_stubs_ext.db.models import TypedModelMeta
from django.db.models.query import QuerySet
from typing import TypedDict, Literal
import uuid
from django.contrib.humanize.templatetags.humanize import naturaltime
from datetime import datetime
from notification.models import BasicUserData


class OtherChatConversationData(TypedDict):
    conversation_ident: str
    users: list[BasicUserData]
    created_at: str
    last_activity: str
    type: Literal["single", "group"]

class OtherChatMessageData(TypedDict):
    user_id: int
    message_ident: str
    message: str
    natural_timestamp: str


class OtherChatConversationsManager(models.Manager["OtherChatConversation"]):
    sequence_no = 0

    @classmethod
    def __get_channel_name(cls):
        s = uuid.uuid1(cls.sequence_no)
        cls.sequence_no += 1
        return f"chat_conversation_channel_{str(s)}"

    def create_conversation(self, title: str, creator: UserAccount, first_participant: UserAccount) -> "OtherChatConversation":
        conv = super().create(
            title=title,
            creator=creator,
            channel_name=OtherChatConversationsManager.__get_channel_name(),
        )
        conv.add_participant(creator)
        conv.add_participant(first_participant)
        return conv

class OtherChatConversation(models.Model):
    title = models.CharField(max_length=40)
    creator = models.ForeignKey(UserAccount, on_delete=models.CASCADE)
    channel_name = models.CharField(max_length=40, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at =  models.DateTimeField(auto_now=True)
    last_activity = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True)

    conversations = OtherChatConversationsManager()

    def add_participant(self, user: UserAccount):
        if OtherChatParticipation.participants.user_is_in_conversation(self, user):
            raise RuntimeError("participant is already part of the conversation")
        OtherChatParticipation.participants.create_and_add_participant(self, user)
        
    def get_conversation_data(self) -> OtherChatConversationData:
        participants = OtherChatParticipation.participants.get_conversation_participants(self)
        return {
            "created_at": str(self.created_at),
            "last_activity": str(self.last_activity),
            "conversation_ident": self.channel_name,
            "type": "single" if len(participants) == 2 else "group",
            "users": [{"id":p.user.pk, "avatar": p.user.avatar.url, "username": p.user.username} for p in participants]
        }
        pass



class OtherChatParticipationManager(models.Manager["OtherChatParticipation"]):
    def create_and_add_participant(self, conv: OtherChatConversation, user: UserAccount) -> "OtherChatParticipation":
        if self.user_is_in_conversation(conv, user):
            raise RuntimeError("participant is already part of the conversation")
        return super().create(conversation=conv, user=user)

    def user_is_in_conversation(self, conv: OtherChatConversation, user: UserAccount):
        return super(OtherChatParticipationManager, self).get_queryset().filter(conversation=conv, user=user).exists()
    
    def get_conversation_participants(self, conv: OtherChatConversation) -> QuerySet["OtherChatParticipation"]:
        return super(OtherChatParticipationManager, self).get_queryset().filter(conversation=conv)

    def get_user_participations(self, user: UserAccount) -> QuerySet["OtherChatParticipation"]:
        return super(OtherChatParticipationManager, self).get_queryset().filter(user=user).order_by("-conversation__last_activity")

    def get_user_conversations(self, user: UserAccount) -> list[OtherChatConversation]:
        query = self.get_user_participations(user)
        return [p.conversation for p in query]

    def get_user_conversation_channels(self, user: UserAccount):
        query = self.get_user_participations(user)
        return [p.conversation.channel_name for p in query]


class OtherChatParticipation(models.Model):
    class OtherChatParticipationType(models.TextChoices):
        SINGLE = 'single', 'single'
        GROUP = 'group', 'group'
    conversation = models.ForeignKey(OtherChatConversation, on_delete=models.CASCADE)
    user = models.OneToOneField(UserAccount, on_delete=models.CASCADE)
    type = models.CharField(choices=OtherChatParticipationType.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at =  models.DateTimeField(auto_now=True)

    participants = OtherChatParticipationManager()

    def add_message_and_get_message_data(self, message: str) -> "OtherChatMessageData":
        choice = OtherChatMessage.MessageType.TEXT
        m = OtherChatMessage.objects.create(
            guid=uuid.uuid4(),
            conversation=self.conversation,
            sender=self.user,
            message_type=choice,
            message=message,
        )
        return m.get_message_data()
        





class OtherChatMessageManager(models.Manager):
    def get_conversation_messages(self, conv: OtherChatConversation) -> QuerySet["OtherChatMessage"]:
        return super().get_queryset().filter(conversation=conv).order_by("-created_at")

    def get_user_messages(self, user: UserAccount):
        super().get_queryset().filter(sender=user).order_by("-created_at")


class OtherChatMessage(models.Model):
    class MessageType(models.IntegerChoices):
        TEXT = 0
    guid = models.UUIDField()
    conversation = models.ForeignKey(OtherChatConversation, on_delete=models.CASCADE)
    sender = models.ForeignKey(UserAccount, on_delete=models.CASCADE)
    message_type = models.IntegerField(choices=MessageType.choices)
    message = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True)

    messages = OtherChatMessageManager()
    objects = models.Manager()

    def get_message_data(self) -> OtherChatMessageData:
        return {
            "user_id": self.sender.pk,
            "message_ident": str(self.guid),
            "message": self.message,
            "natural_timestamp": naturaltime(self.created_at),
        }
