from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from user.models import UserAccount
from chat.models import ChatParticipation, ChatConversation, ChatMessageData, ChatConversationData
from notification.models import BasicUserData
from channels_redis.core import RedisChannelLayer
from typing import TypedDict, Literal, Union, Any, TypeAlias, Type
from dataclasses import dataclass
from datetime import datetime
from enum import IntEnum, Enum, StrEnum
from .base_types import BaseCommand, CommandResponse, BaseEvent



class ModuleTypes(StrEnum):
    CHAT_MOUDLE = "chat"
    NOTIFICATION_MOUDLE = "notification"

class CommandTypes(StrEnum):
    GET_CHAT_CONVERSATIONS = "get_chat_conversations"
    GET_CONVERSATION_MESSAGES = "get_conversation_messages"
    POST_CONVERSATION_MESSAGE = "post_conversation_message"
    POST__CONVERSATION_PARTICIPANT_ACTION = "post_conversation_participant_action"

class EventTypes(StrEnum):
    NEW_CONVERSATION_ACTIVITY = "new_conversation_activity"
    NEW_CONVERSATION_MESSAGE = "new_conversation_message"



# COMMAND GET: chat conversations
class CommandGetChatConversations(BaseCommand):
    page: int

class CommandResponseDataGetChatConversations(TypedDict):
    conversations: list[ChatConversationData] | None
    next_page: int

ConversationActivityTypes: TypeAlias = Literal["new_member", "new_message"]

class EventNewConversationActivity(TypedDict):
    conversation: ChatConversationData
    action: ConversationActivityTypes


# COMMAND GET: chat messages
class CommandGetConversationMessages(BaseCommand):
    conversation_ident: str
    page: int

class CommandResponseDataGetConversationMessages(TypedDict):
    conversation_ident: str
    messages: list[ChatMessageData] | None
    next_page: int

# EVENT: new chat message
class EventPageExhaused(BaseEvent):
    conversation_ident: str

# COMMAND POST: chat message
class CommandPostChatMessage(BaseCommand):
    conversation_ident: str
    message: str


# EVENT: new chat message
class EventNewChatMessage(BaseEvent):
    conversation_ident: str
    message: ChatMessageData


# POST: chat participant action
ParticipantActionType: TypeAlias = Literal["add", "remove"]

class CommandParticipantAction(BaseCommand):
    conversation_ident: str
    user_id: int
    action: ParticipantActionType

# EVENT chat participant action
class EventParticipantAction(BaseEvent):
    action: ParticipantActionType


ChatCommands = Union[CommandPostChatMessage, CommandParticipantAction, CommandGetChatConversations, CommandGetConversationMessages]
ChatEvents = Union[EventNewChatMessage, EventParticipantAction]


# JSONValue: TypeAlias = str | None | int | float | "JSONArray" | "JSONObject"
# JSONArray: TypeAlias = list[JSONValue]
# JSONObject: TypeAlias = dict[str, JSONValue]


# class CommandTypes(StrEnum):
#     GET_CHAT_CONVERSATIONS = "get_chat_conversations"
#     GET_CONVERSATION_MESSAGES = "get_conversation_messages"
#     POST_CONVERSATION_MESSAGE = "post_conversation_message"
#     POST_CHAT_CONVERSATION_MESSAGES = "conversation_participant_action"

# class BaseCommand(TypedDict):
#     command: str

# class CommandResponse(TypedDict):
#     success: bool
#     command: str
#     payload: JSONObject | None

# ChatModuleType: TypeAlias = Literal['chat']

# # ChatHH: TypeAlias = Literal[ChatModuleType + 'get_msg']

# # COMMAND GET: chat conversations
# class GetChatConversations(TypedDict):
#     command: Literal['chat.get_chat_conversations']
#     page: int

# class GetChatConversationsResponse(CommandResponse):
#     command: Literal['chat.get_chat_conversations']
#     payload: "GetChatConversationsResponseData"

# class ChatConversationData(TypedDict):
#     conversation_ident: str
#     users: list[BasicUserData]
#     created_at: datetime
#     type: Literal["single", "group"]

# class GetChatConversationsResponseData(TypedDict):
#     conversations: list[ChatConversationData]
#     next_page: int


# # COMMAND GET: chat messages
# class GetConversationMessages(TypedDict):
#     command: Literal['chat.get_conversation_messages']
#     page: int

# class GetConversationMessagesResponse(CommandResponse):
#     command: Literal['chat.get_conversation_messages']
#     payload: "GetConversationMessagesResponseData"

# class GetConversationMessagesResponseData(TypedDict):
#     conversation_ident: str
#     messages: list[ChatMessageData]
#     next_page: int


# # COMMAND POST: chat message
# class PostChatMessage(TypedDict):
#     command: Literal["chat.post_chat_message"]
#     conversation_ident: str
#     message: str

# class PostChatMessageResponse(CommandResponse):
#     command: Literal["chat.post_chat_message"]


# # EVENT: new chat message
# class NewChatMessage(TypedDict):
#     type: Literal["new_chat_message"]
#     conversation_ident: str
#     message: ChatMessageData


# # POST: chat participant action
# ParticipantActionType: TypeAlias = Literal["add", "remove"]

# class ParticipantAction(TypedDict):
#     command: Literal["chat.conversation_participant_action"]
#     conversation_ident: str
#     user_id: int
#     action: ParticipantActionType

# class ParticipantActionResponse(CommandResponse):
#     command: Literal["add_conversation_participant"]

# # EVENT chat participant action
# class ParticipantEvent(TypedDict):
#     type: Literal["participant-event"]
#     action: ParticipantActionType


# ChatCommands = Union[PostChatMessage, GetChatConversations, GetConversationMessages]
# ChatEvents = Union[NewChatMessage, ParticipantEvent]


# class ChatConsumer(AsyncJsonWebsocketConsumer):

#     async def connect(self) -> None:
#         self.user = self.scope["user"] if "user" in self.scope else None
#         self.channel_layer: RedisChannelLayer

#         if not isinstance(self.user, UserAccount):
#             await self.close()

#         self.conversations_data: list[ConversationData] = await get_conversation_data(user=self.user)
#         for conv in self.conversations_data:
#             await self.channel_layer.group_add(conv.channel_name, self.channel_name)

#         await self.accept()

#     async def receive_json(self, content: ChatCommands):
#         if content["type"] == "chat_message":
#             data = [q for q in self.conversations_data if q.channel_name == content["chat_id"]]
#             if len(data) != 1:
#                 raise RuntimeError("Invalid Number of channels found?!")
#             d: ChatMessageData = await add_message_to_conversation(data[0].participant, content["message"])
#             m: ChatPostMessage = {"message": d, "type":"post_message_to_client"}
#             await self.channel_layer.group_send(data[0].channel_name, m)
#         pass

#     async def post_message_to_client(self, d: ChatPostMessage):
#         await self.send_json(d)
