from typing import TypedDict, Literal, Union, NotRequired
from enum import Enum, IntEnum

from django.contrib.auth.models import AnonymousUser

from asgiref.typing import Scope, WebSocketScope

from user.models import UserAccount
from notification.models import NotificationData
from chat.models import ChatMessageData, ChatRoomData

DEFAULT_NOTIFICATION_PAGE_SIZE = 5
DEFAULT_ROOM_CHAT_MESSAGE_PAGE_SIZE = 10

HEARTBEAT_INTERVAL_MS = 3000
HEARTBEAT_TIMEOUT_MS = 6000

MSG_TYPE_NOTIFICATION_PAGE = 0
MSG_TYPE_NOTIFICATION_PAGINATION_EXHAUSTED = 1
MSG_TYPE_NOTIFICATION_TIMESPAN = 2
MSG_TYPE_NOTIFICATION_NEW = 3
MSG_TYPE_NOTIFICATION_UNREAD_COUNT = 4
MSG_TYPE_NOTIFICATION_UPDATED = 5

MSG_TYPE_CHAT_ROOM_ADD = 100
MSG_TYPE_CHAT_ROOM_REMOVE = 101
MSG_TYPE_CHAT_USER_ADD = 102
MSG_TYPE_CHAT_USER_REMOVE = 103
MSG_TYPE_CHAT_MESSAGE_NEW = 104
MSG_TYPE_CHAT_MESSAGE_UPDATED = 105
MSG_TYPE_CHAT_MESSAGE_UNREAD_COUNT = 106
MSG_TYPE_CHAT_MESSAGE_PAGINATION_EXHAUSTED = 107
MSG_TYPE_CHAT_MESSAGE_PAGE = 108

class InternalCommandChatRoom(TypedDict):
    type: Literal['chat.room.add', 'chat.room.remove']
    group_name: str
    data: ChatRoomData

class InternalCommandChatMessageNew(TypedDict):
    type: Literal['chat.message.new']
    room_id: int
    data: ChatMessageData
    
InternalCommand = Union[
    InternalCommandChatRoom,
    InternalCommandChatMessageNew,
]



class PayloadRoomId(TypedDict):
    room_id: int
    
class PayloadChatMessage(PayloadRoomId):
    chat_message: ChatMessageData

class PayloadChatMessageList(PayloadRoomId):
    chat_messages: list[ChatMessageData]

class PayloadChatMessagePageList(PayloadChatMessageList):
    new_page_number: int

class PayloadChatMessagesUnreadCount(PayloadRoomId):
    count: int
    

class PayloadChatRoom(TypedDict):
    chat_room: ChatRoomData


class PayloadNotification(TypedDict):
    notification: NotificationData

class PayloadNotificationsList(TypedDict):
    notifications: list[NotificationData] | None

class PayloadNotificationsPageList(PayloadNotificationsList):
    new_page_number: int

class PayloadNotificationsUnreadCount(TypedDict):
    count: int


MessagePayload = Union[
    PayloadRoomId,
    PayloadChatMessage,
    PayloadChatMessageList,
    PayloadChatMessagePageList,
    PayloadChatMessagesUnreadCount,
    PayloadChatRoom,
    PayloadNotification,
    PayloadNotificationsList,
    PayloadNotificationsPageList,
    PayloadNotificationsUnreadCount,
]

class CommandChatBase(TypedDict):
    module: Literal['chat']


class CommandSendChatMessage(CommandChatBase):
    command: Literal['send_chat_message']
    room_id: int
    message: str
    
class CommandGetChatMessagesPage(CommandChatBase):
    command: Literal['get_chatmessages_page']
    room_id: int
    page_number: int
    

class CommandGetChatMessagesTimespan(CommandChatBase):
    command: Literal['get_chatmessages_timespan']
    room_id: int
    oldest_timestamp: int
    newest_timestamp: int

class CommandMarkAllChatMessagesAsRead(CommandChatBase):
    command: Literal['mark_chatmessages_read']
    room_id: int
    oldest_timestamp: int

class CommandGetUnreadChatMessagesCount(CommandChatBase):
    command: Literal['get_unread_chatmessages_count']


class CommandNotificationBase(TypedDict):
    module: Literal['notification']

class GetGeneralNotifications(CommandNotificationBase):
    command: Literal['get_general_notifications']
    page_number: int

class RefreshGeneralNotifications(CommandNotificationBase):
    command: Literal['refresh_general_notifications']
    oldest_timestamp: int
    newest_timestamp: int

class MarkAllNotificationsAsRead(CommandNotificationBase):
    command: Literal['mark_notifications_read']
    oldest_timestamp: int

class GetUnreadNotificationCount(CommandNotificationBase):
    command: Literal['get_unread_general_notifications_count']


ClientCommand = Union[
    CommandSendChatMessage,
    CommandGetChatMessagesPage,
    CommandGetChatMessagesTimespan,
    CommandMarkAllChatMessagesAsRead,
    CommandGetUnreadChatMessagesCount,
    GetGeneralNotifications,
    RefreshGeneralNotifications,
    MarkAllNotificationsAsRead,
    GetUnreadNotificationCount
]


class AuthenticatedWebsocketScope(WebSocketScope):
    user: AnonymousUser | UserAccount

class WebsocketCloseCodes(IntEnum):
    NOT_AUTHENTICATED = 4100
