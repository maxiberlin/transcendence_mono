from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from user.models import UserAccount
from other_chat.models import OtherChatParticipation, OtherChatMessageData, OtherChatConversationData, OtherChatConversation, OtherChatMessage
from channels_redis.core import RedisChannelLayer
from typing import TypedDict, Literal, Union, Optional, Callable
from dataclasses import dataclass
from datetime import datetime
from . import chat_types as ct
from .base import command, BaseHandler, event
from django.core.paginator import Paginator, InvalidPage, Page
from channels.layers import get_channel_layer




@dataclass(slots=True)
class ParticipationItem:
    id: int
    channel_name: str
    participant: OtherChatParticipation
    
# pages = Paginator(notifications, DEFAULT_NOTIFICATION_PAGE_SIZE)
#         try:
#             page = pages.page(page_number)
#             return {
#                 "general_msg_type": NotificationMessages.GENERAL_MSG_TYPE_NOTIFICATIONS_DATA.value,
#                 "notifications": [ e.get_notification_data() for e in page.object_list if isinstance(e, Notification)],
#                 "new_page_number": page_number + 1
#             }
#         except InvalidPage:
#             return {
#                 "general_msg_type": NotificationMessages.GENERAL_MSG_TYPE_PAGINATION_EXHAUSTED.value,
#             }

# @database_sync_to_async
# def get_participartions(user: UserAccount) -> list[ParticipationItem]:
async def get_participartions(user: UserAccount) -> list[ParticipationItem]:
    query = OtherChatParticipation.participants.get_user_participations(user)
    pages = Paginator(query, 10)
    return [ParticipationItem(
            id=q.conversation.pk,
            channel_name=q.conversation.channel_name,
            participant=q)
                for q in query]
    

# @database_sync_to_async
# def get_conversation_data(user: UserAccount) -> list[ChatConversationData]:
async def get_conversation_data(user: UserAccount, page_number: int) -> list[OtherChatConversationData] | None:
    query = OtherChatParticipation.participants.get_user_participations(user)
    try:
        pages = Paginator(query, 10)
        page = pages.page(page_number)
        return [ q.conversation.get_conversation_data() for q in page.object_list if isinstance(q, OtherChatParticipation)]
    except InvalidPage:
        return None
    

# @database_sync_to_async
# def get_conversation_data(user: UserAccount) -> list[ChatConversationData]:
async def get_conversation_messages(channel_name: str, page_number: int) -> list[OtherChatMessageData] | None:
    try:
        conv = OtherChatConversation.conversations.get(channel_name=channel_name)
    except OtherChatConversation.DoesNotExist:
        raise ValueError("No conversation found for this ident")
    try:
        query = OtherChatMessage.messages.get_conversation_messages(conv)
        pages = Paginator(query, 10)
        page = pages.page(page_number)
        return [ q.get_message_data() for q in page.object_list if isinstance(q, OtherChatMessage)]
    except InvalidPage:
        return None

# @database_sync_to_async
# def add_message_to_conversation(p: ChatParticipation, message: str) -> ChatMessageData:
async def add_message_to_conversation(p: OtherChatParticipation, message: str) -> OtherChatMessageData:
    return p.add_message_and_get_message_data(message=message)



class ChatHandler(BaseHandler):
    
    def __init__(self, user: UserAccount):
        super().__init__(user)
        self.channel_layer = get_channel_layer()
    
    async def on_connect(self):
        await super().on_connect()
        self.participations: list[ParticipationItem] = await get_participartions(self.user)
    
    # @event(ct.EventTypes.NEW_CONVERSATION_ACTIVITY)
    # async def send_conversation_activity(self) -> ct.EventNewConversationActivity:
    #     ...
    
    # @command(ct.CommandTypes.POST__CONVERSATION_PARTICIPANT_ACTION)
    

    @command(ct.CommandTypes.POST_CONVERSATION_MESSAGE)
    async def handle_new_message(self, command: ct.CommandPostChatMessage) -> ct.CommandResponse:
        data = [q for q in self.participations if q.channel_name == command["conversation_ident"]]
        if len(data) != 1:
            return self.get_cmd_res(command, False, "invalid conversation_ident")

        ident: str = data[0].channel_name
        d: OtherChatMessageData = await add_message_to_conversation(data[0].participant, ident)
        msg: ct.EventNewChatMessage = {
            "msg_type": ct.EventTypes.NEW_CONVERSATION_MESSAGE,
            "conversation_ident": ident,
            "message": d
        }
        await self.push_to_group(ident, msg)
        return self.get_cmd_res(command, True, d)


    @command(ct.CommandTypes.GET_CHAT_CONVERSATIONS)
    async def get_conversations(self, command: ct.CommandGetChatConversations) -> ct.CommandResponse:
        page = command.get("page")
        if not page or not isinstance(page, int):
            return self.get_cmd_res(command, False, "invalid page")
        payload: ct.CommandResponseDataGetChatConversations = {
            "conversations": await get_conversation_data(self.user, page),
            "next_page": page + 1
        }
        return self.get_cmd_res(command, True, payload)
        

    @command(ct.CommandTypes.GET_CONVERSATION_MESSAGES)
    async def get_conversation_messages(self, command: ct.CommandGetConversationMessages) -> ct.CommandResponse:
        try:
            page = command.get("page")
            if not page or not isinstance(page, int):
                return self.get_cmd_res(command, False, "invalid page")
            ident = command.get("conversation_ident")
            if not ident or not isinstance(ident, int):
                return self.get_cmd_res(command, False, "conversation_ident")
            payload: ct.CommandResponseDataGetConversationMessages = {
                "conversation_ident": command["conversation_ident"],
                "messages": await get_conversation_messages(command.get("conversation_ident"), page),
                "next_page": command["page"] + 1
            }
            return self.get_cmd_res(command, True, payload)
        except Exception as e:
            return self.get_cmd_res(command, False, str(e))
            


# @dataclass(slots=True)
# class ConversationData:
#     id: int
#     channel_name: str
#     participant: ChatParticipation

# @database_sync_to_async
# def get_conversation_data(user: UserAccount) -> list[ConversationData]:
#     query = ChatParticipation.participants.get_user_participations(user)
#     return [ConversationData(id=q.conversation.pk, channel_name=q.conversation.channel_name, participant=q) for q in query]

# @database_sync_to_async
# def add_message_to_conversation(p: ChatParticipation, message: str) -> ChatMessageData:
#     return p.add_message_and_get_message_data(message=message)


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

#     async def receive_json(self, content: ct.ChatCommands):
#         if content["type"] == "chat_message":
#             data = [q for q in self.conversations_data if q.channel_name == content["chat_id"]]
#             if len(data) != 1:
#                 raise RuntimeError("Invalid Number of channels found?!")
#             d: ChatMessageData = await add_message_to_conversation(data[0].participant, content["message"])
#             m: ct.ChatPostMessage = {"message": d, "type":"post_message_to_client"}
#             await self.channel_layer.group_send(data[0].channel_name, m)
#         pass

#     async def post_message_to_client(self, d: ct.ChatPostMessage):
#         await self.send_json(d)
