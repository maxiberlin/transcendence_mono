declare namespace NotificationTypes {
    export interface AcceptFriendRequest {
        command: 'accept_friend_request';
        notification_id: number;
    }
    export interface RejectFriendRequest {
        command: 'reject_friend_request';
        notification_id: number;
    }
    export interface AcceptGameInvitation {
        command: 'accept_game_invitation';
        notification_id: number;
    }
    export interface RejectGameInvitation {
        command: 'reject_game_invitation';
        notification_id: number;
    }
    export interface GetGeneralNotifications {
        command: 'get_general_notifications';
        page_number: number;
    }
    export interface GetNewGeneralNotifications {
        command: 'get_new_general_notifications';
        newest_timestamp: number;
    }
    export interface RefreshGeneralNotifications {
        command: 'refresh_general_notifications';
        oldest_timestamp: number;
        newest_timestamp: number;
    }
    export interface GetUnreadNotificationCount {
        command: 'get_unread_general_notifications_count';
    }
    export interface MarkAllNotificationsAsRead {
        command: 'mark_notifications_read';
        oldestTimestamp: number;
    }
    export type NotificationCommand =
        | AcceptFriendRequest
        | RejectFriendRequest
        | AcceptGameInvitation
        | RejectGameInvitation
        | GetGeneralNotifications
        | GetNewGeneralNotifications
        | RefreshGeneralNotifications
        | GetUnreadNotificationCount
        | MarkAllNotificationsAsRead;

    // export interface NotificationData {
    //     notification_type: string;
    //     notification_id: number;
    //     description: string;
    //     is_active?: boolean;
    //     is_read: number;
    //     natural_timestamp: number;
    //     timestamp: number;
    //     actions: {
    //         redirect_url: string;
    //     };
    //     from: {
    //         image_url: string;
    //     };
    // }
    export interface NotificationData {
        notification_type: string;
        notification_id: number;
        description: string;
        is_active: boolean;
        is_read: number;
        natural_timestamp: number;
        timestamp: number;
        actions: {
            redirect_url: string;
        };
        user: APITypes.BasicUserData;
    }

    export interface GetChatConversations {
        command: 'chat.get_chat_conversations';
        page: number;
    }
}

declare namespace NotificationMessageTypes {
    // eslint-disable-next-line no-shadow
    export enum NotificationMessageEnum {
        GENERAL_MSG_TYPE_NOTIFICATIONS_DATA = 0, // New 'general' notifications data payload incoming
        GENERAL_MSG_TYPE_PAGINATION_EXHAUSTED = 1, // No more 'general' notifications to retrieve
        GENERAL_MSG_TYPE_NOTIFICATIONS_REFRESH_PAYLOAD = 2, // Retrieved all 'general' notifications newer than the oldest visible on screen
        GENERAL_MSG_TYPE_GET_NEW_GENERAL_NOTIFICATIONS = 3, // Get any new notifications
        GENERAL_MSG_TYPE_GET_UNREAD_NOTIFICATIONS_COUNT = 4, // Send the number of unread "general" notifications to the template
        GENERAL_MSG_TYPE_UPDATED_NOTIFICATION = 5, // Update a notification that has been altered
    }

    export interface NotificationsList {
        general_msg_type: NotificationMessageEnum.GENERAL_MSG_TYPE_NOTIFICATIONS_DATA;
        notifications: NotificationTypes.NotificationData[];
        new_page_number: number;
    }
    export interface RefreshNotificationsList {
        general_msg_type: NotificationMessageEnum.GENERAL_MSG_TYPE_NOTIFICATIONS_REFRESH_PAYLOAD;
        notifications: NotificationTypes.NotificationData[];
    }
    export interface NewNotificationsList {
        general_msg_type: NotificationMessageEnum.GENERAL_MSG_TYPE_GET_NEW_GENERAL_NOTIFICATIONS;
        notifications: NotificationTypes.NotificationData[];
    }
    export interface NotificationUpdate {
        general_msg_type: NotificationMessageEnum.GENERAL_MSG_TYPE_UPDATED_NOTIFICATION;
        notification: NotificationTypes.NotificationData;
    }
    export interface PaginationExhausted {
        general_msg_type: NotificationMessageEnum.GENERAL_MSG_TYPE_PAGINATION_EXHAUSTED;
    }
    export interface NotificationCount {
        general_msg_type: NotificationMessageEnum.GENERAL_MSG_TYPE_GET_UNREAD_NOTIFICATIONS_COUNT;
        count: number;
    }
    export interface ProgressBarDisplay {
        progress_bar: boolean;
    }

    export type NotificationMessage =
        | NotificationsList
        | NewNotificationsList
        | NotificationCount
        | NotificationUpdate
        | RefreshNotificationsList
        | PaginationExhausted;

    export type NotificationMessageTags = NotificationMessage['general_msg_type'];

    type ChatConversationType = 'single' | 'group';

    export interface ChatConversation {
        conversation_ident: string;
        users: APITypes.BasicUserData[];
        created_at: string;
        type: ChatConversationType;
    }

    export interface GetChatConversationsResponse {
        msg_type: 'chat.get_chat_conversations_response';
        conversations: ChatConversation[];
        next_page: number;
    }
}
