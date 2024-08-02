from typing import TypedDict, Literal, Union
from enum import Enum
from notification.models import NotificationData
DEFAULT_NOTIFICATION_PAGE_SIZE = 5

HEARTBEAT_INTERVAL_MS = 1000
HEARTBEAT_TIMEOUT_MS = 2000

GENERAL_MSG_TYPE_NOTIFICATIONS_DATA = 0  # New 'general' notifications data payload incoming
GENERAL_MSG_TYPE_PAGINATION_EXHAUSTED = 1  # No more 'general' notifications to retrieve
GENERAL_MSG_TYPE_NOTIFICATIONS_REFRESH_PAYLOAD = 2  # Retrieved all 'general' notifications newer than the oldest visible on screen
GENERAL_MSG_TYPE_GET_NEW_GENERAL_NOTIFICATIONS = 3
GENERAL_MSG_TYPE_GET_UNREAD_NOTIFICATIONS_COUNT = 4
GENERAL_MSG_TYPE_UPDATED_NOTIFICATION = 5 # Update a notification that has been altered


# class NotificationMessages(Enum):
#     GENERAL_MSG_TYPE_NOTIFICATIONS_DATA = Literal[0]
#     GENERAL_MSG_TYPE_PAGINATION_EXHAUSTED = Literal[1]
#     GENERAL_MSG_TYPE_NOTIFICATIONS_REFRESH_PAYLOAD = Literal[2]
#     GENERAL_MSG_TYPE_GET_NEW_GENERAL_NOTIFICATIONS = Literal[3]
#     GENERAL_MSG_TYPE_GET_UNREAD_NOTIFICATIONS_COUNT = Literal[4]
#     GENERAL_MSG_TYPE_UPDATED_NOTIFICATION = Literal[5]
    

class NotificationMessages(Enum):
    GENERAL_MSG_TYPE_NOTIFICATIONS_DATA = 0
    GENERAL_MSG_TYPE_PAGINATION_EXHAUSTED = 1
    GENERAL_MSG_TYPE_NOTIFICATIONS_REFRESH_PAYLOAD = 2
    GENERAL_MSG_TYPE_GET_NEW_GENERAL_NOTIFICATIONS = 3
    GENERAL_MSG_TYPE_GET_UNREAD_NOTIFICATIONS_COUNT = 4
    GENERAL_MSG_TYPE_UPDATED_NOTIFICATION = 5
    

class GeneralNotificationsData(TypedDict):
    general_msg_type: Literal[0]
    notifications: list[NotificationData]
    new_page_number: int

class PageinationExhausted(TypedDict):
    general_msg_type: Literal[1]

class NotificationsRefreshPayload(TypedDict):
    general_msg_type: Literal[2]
    notifications: list[NotificationData]

class NewGeneralNotifications(TypedDict):
    general_msg_type: Literal[3]
    notifications: list[NotificationData]

class GeneralNotoficationsUnreadCount(TypedDict):
    general_msg_type: Literal[4]
    count: int

class UpdatedNotification(TypedDict):
    general_msg_type: Literal[5]
    notification: NotificationData



class AcceptFriendRequest(TypedDict):
    command: Literal['accept_friend_request']
    notification_id: int

class RejectFriendRequest(TypedDict):
    command: Literal['reject_friend_request']
    notification_id: int

class AcceptGameInvitation(TypedDict):
    command: Literal['accept_game_invitation']
    notification_id: int

class RejectGameInvitation(TypedDict):
    command: Literal['reject_game_invitation']
    notification_id: int

class GetGeneralNotifications(TypedDict):
    command: Literal['get_general_notifications']
    page_number: int

class GetNewGeneralNotifications(TypedDict):
    command: Literal['get_new_general_notifications']
    newest_timestamp: int

class RefreshGeneralNotifications(TypedDict):
    command: Literal['refresh_general_notifications']
    oldest_timestamp: int
    newest_timestamp: int

class MarkAllNotificationsAsRead(TypedDict):
    command: Literal['mark_notifications_read']
    oldest_timestamp: int

class GetUnreadNotificationCount(TypedDict):
    command: Literal['get_unread_general_notifications_count']

ClientCommand = Union[
    AcceptFriendRequest,
    RejectFriendRequest,
    AcceptGameInvitation,
    RejectGameInvitation,
    GetGeneralNotifications,
    GetNewGeneralNotifications,
    RefreshGeneralNotifications,
    MarkAllNotificationsAsRead,
    GetUnreadNotificationCount
]
