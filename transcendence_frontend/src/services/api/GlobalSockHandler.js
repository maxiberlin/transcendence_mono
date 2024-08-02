import BaseBase from '../../lib_templ/BaseBase.js';
import PubSub from '../../lib_templ/reactivity/PubSub.js';
import PubSubConsumer from '../../lib_templ/reactivity/PubSubConsumer.js';
import { fetcher } from './API_new.js';
import { ReconnectingSocket } from './Socket.js';

const chatErrors = {
    EMPTY_STRING: "EMPTY_STRING",
    ERROR_GET_MESSAGES: "ERROR_GET_MESSAGES",
    AUTH_ERROR: "AUTH_ERROR",
    ROOM_ACCESS_DENIED: "ROOM_ACCESS_DENIED",
    ACCESS_DENIED: "ACCESS_DENIED",
    ROOM_INVALID: "ROOM_INVALID",
}

const GENERAL_MSG_TYPE_NOTIFICATIONS_DATA = 0  // New 'general' notifications data payload incoming
const GENERAL_MSG_TYPE_PAGINATION_EXHAUSTED = 1  // No more 'general' notifications to retrieve
const GENERAL_MSG_TYPE_NEW_NOTIFICATION = 3  // Get any new notifications
const GENERAL_MSG_TYPE_UNREAD_NOTIFICATIONS_COUNT = 4  // Send the number of unread "general" notifications to the template
const GENERAL_MSG_TYPE_UPDATED_NOTIFICATION = 5 // Update a notification that has been altered





function detailedTimeAgo(now, timestamp) {
    const secondsPast = Math.floor(now - timestamp);
  
    const days = Math.floor(secondsPast / (3600 * 24));
    const hours = Math.floor((secondsPast % (3600 * 24)) / 3600);
    const minutes = Math.floor((secondsPast % 3600) / 60);
    const seconds = secondsPast % 60;
  
    let result = "";
    if (days > 0) result += `${days} day${days > 1 ? "s" : ""} `;
    if (hours > 0) result += `${hours} hour${hours > 1 ? "s" : ""} `;
    if (minutes > 0) result += `${minutes} minute${minutes > 1 ? "s" : ""} `;
    // if (seconds > 0) result += `${seconds} second${seconds > 1 ? "s" : ""} `;
  
    return result.trim() + " ago";
}


class ChatHandle {
    /** @param {() => (command: ChatTypes.ChatCommands) => boolean} sendMessage  */
    constructor(sendMessage) {
        this.#sendChatCommand = sendMessage();
    }
    #sendChatCommand;
    /** @type {number | null} */
    #room_id = null;

    /** @param {string} message */
    sendMessage = (message) =>
        (this.#room_id == null || typeof message !== "string" || message.trim().length === 0) ? false
        : this.#sendChatCommand({command: "send", room_id: this.#room_id, message});

    leave = () =>
        this.#room_id == null ? false : this.#sendChatCommand({command: "leave", room: this.#room_id});


    async joinChat(userId, onNewMessageCallback) {
        /**  @type {APITypes.ApiResponse<{room_id: number}>} */
        const data = await fetcher.$get(`/chat/room/${userId}`);
        if (!data.success)
            return data.statuscode;
        this.#sendChatCommand({command: "join", room: data.data.room_id, type: "private"});
    }

    /** @param {ChatTypes.ChatServerMessages} data */
    handleSocketMessage = (data) => {
        if ('messages_data' in data) {
        }
    }

    getConversations() {
        return
    }
}

/**
 * @template T
 */
class MessageDataHandle {
    /** 
     * @param {MessageData<T>} msgData
     * @param {undefined} [roomInfo]
     */
    constructor(msgData, roomInfo) {
        this.#msgData = msgData;
        this.#roomInfo = roomInfo;
    }
    #msgData;
    #roomInfo;
    get messages() {
        return this.#msgData.messages;
    }
    get lastReadTimestamp() {
        return this.#msgData.lastReadTimestamp;
    }
    get unreadCount() {
        return this.#msgData.unreadCount;
    }
    get room() {
        return this.#roomInfo;
    }
}

/**
 * @template T
 */
class MessageData {
    constructor() {
        
    }
    unreadCount = 0;
    lastReadTimestamp = 0;
    currentPage = 1;
    /** @type {T[]} */
    messages = [];

    getHandle() {
        return new MessageDataHandle(this);
    }

    /**
     *  data array needs to be in descending order of timestamps
     * @param {*} data 
     * @param {*} newPage 
     */
    addEnd(data, newPage) {
        if (data instanceof Array) {
            for (let i = 0; i < data.length; ++i) {
                this.messages.push( data[i]);
            }
        } else {
            this.messages.push(data);
        }
        if (typeof newPage === "number")
            this.currentPage = newPage;
    }
    /**
     *  data array needs to be in descending order of timestamps
     * @param {*} data 
     */
    addFront(data, unreadCount) {
        if (data instanceof Array) {
            for (let i = data.length - 1; i >= 0; i--) {
                this.messages.unshift( data[i]);
            }
        } else {
            this.messages.unshift(data);
        }
        if (typeof unreadCount === "number")
            this.unreadCount = unreadCount;
    }
    updateMessage(data, loopkup) {
        const i = this.messages.findIndex(i => i[loopkup] === data[loopkup]);
        console.log('update message: ', data, ', lookup: ', loopkup, ' , index: ', i);
        if (i !== -1) this.messages[i] = data;
    }
    insertMessages() {}
}

//  * @typedef {{room: APITypes.ChatRoomData, messages: MessageData<APITypes.ChatMessageData> , handle: MessageDataHandle<APITypes.ChatMessageData> }} Chat
/**
 * @typedef {object} Chat
 * @property {APITypes.ChatRoomData} room
 * @property {MessageData<APITypes.ChatMessageData>} messages
 * @property {MessageDataHandle<APITypes.ChatMessageData> } handle
 */

class GlobalSockHandler {
    constructor() {
        
    }

    initialSocketCommands() {
        this.#sendCommand({command: "get_general_notifications", page_number: this.#notifications.currentPage});
        this.#sendCommand({command: "get_unread_general_notifications_count"})
    }

    async init() {
        this.#socket = new ReconnectingSocket(`wss://api.${window.location.host}/ws/`)
        this.#socket.addHandler("initial_connected", () => {
            console.log('INITIAL CONNECTED');
            this.#initialized = true;
            this.initialSocketCommands()
        });
        this.#socket.addHandler("message", this.handleSocketMessage);
        this.#notificationsHandle = new MessageDataHandle(this.#notifications);
        this.#notificationsHandle

        /** @type {APITypes.ApiResponse<APITypes.ChatRoomData[]>} */
        const data =  await fetcher.$get('/chat/rooms');
        if (data.success !== true) return;
        /** @type {Promise<APITypes.ApiResponse<APITypes.ChatMessageList>>[]} */
        const chatMessagePromises = [];
        data.data.forEach((room) => {
            const messages = new MessageData();
            const handle = messages.getHandle();
            const p = fetcher.$get('/chat/messages', {searchParams: new URLSearchParams({
                room: room.room_id.toString(),
                page: '1',
            })});
            chatMessagePromises.push(p);
            this.#chatsMap.set(room.room_id, {room, messages, handle});
        });
        const res = await Promise.all(chatMessagePromises);
        res.forEach((messageResponse) => {
            console.log('message response: ', messageResponse);
        });
        console.log('received chat rooms: ', data);
    }
    /** @type {Map< number, Chat > } */
    #chatsMap = new Map();

    #initialized = false;
    /** @type {ReconnectingSocket | undefined} */
    #socket;

    /** @type {MessageData<MessageSocketTypes.NotificationData>} */
    #notifications = new MessageData();
    #notificationsHandle;
    /** @param {MessageSocketTypes.NotificationMessages} data */
    handleSocketMessage = (data) => {
        if (!this.#initialized) throw new Error("GLOBAL SOCKET NOT YET IITIALIZED");
        console.log('new message: ', data);
        if(data.general_msg_type === GENERAL_MSG_TYPE_NOTIFICATIONS_DATA) {
            this.#notifications.addEnd(data.notifications, data.new_page_number);
        } else if(data.general_msg_type === GENERAL_MSG_TYPE_NEW_NOTIFICATION) {
            this.#notifications.addFront(data.notification, data.count);
        } else if(data.general_msg_type === GENERAL_MSG_TYPE_PAGINATION_EXHAUSTED) {
            this.#notifications.currentPage = -1;
        } else if(data.general_msg_type === GENERAL_MSG_TYPE_UNREAD_NOTIFICATIONS_COUNT) {
            this.#notifications.unreadCount = data.count;
        } else if(data.general_msg_type === GENERAL_MSG_TYPE_UPDATED_NOTIFICATION) {
            this.#notifications.updateMessage(data, 'notification_id');
        }
        this.#pubsubNotification.publish(this.#notificationsHandle)
    }

    getNextMessagePage() {
        if (!this.#initialized) throw new Error("GLOBAL SOCKET NOT YET IITIALIZED");
        if (this.#notifications.currentPage !== -1) {
            this.#sendCommand({command: "get_general_notifications", page_number: this.#notifications.currentPage});
            this.#sendCommand({command: "get_unread_general_notifications_count"})
        }
    }

    updateNotificationNaturalTime() {
        const now = Date.now() / 1000;
        this.#notifications.messages.forEach((m) => {
            // console.log('prev: ', m.natural_timestamp, ', now: ', detailedTimeAgo(now, m.timestamp));
            m.natural_timestamp = detailedTimeAgo(now, m.timestamp);
        })
        this.#pubsubNotification.publish(this.#notificationsHandle);
    }

    /** @param {number} timestamp */
    setNotificationsAsReadUntil(timestamp) {
        if (!this.#initialized) return;
        if (typeof timestamp === "number" && !isNaN(timestamp) && timestamp > this.#notifications.lastReadTimestamp) {
            this.#sendCommand({command: "mark_notifications_read", oldest_timestamp: timestamp});
            this.#notifications.lastReadTimestamp = timestamp;
        }
    }

    /**
     * @param {BaseBase} [host]
     * @param {boolean} [force] 
     * @returns {PubSubConsumer<MessageDataHandle<MessageSocketTypes.NotificationData>> | undefined}
     */
    subscribeNotifications(host, force) {
        // if (!this.#initialized) throw new Error("GLOBAL SOCKET NOT YET IITIALIZED");
        /** @type {PubSubConsumer<MessageDataHandle<MessageSocketTypes.NotificationData>>} */
        const d = this.#pubsubNotification.subscribe(this.#notificationsHandle, host, force);
        return d;
    }
    /** @type {PubSub<MessageDataHandle<MessageSocketTypes.NotificationData> >} */
    #pubsubNotification = new PubSub();
    /**
     * @param {BaseBase} [host]
     * @param {boolean} [force] 
     * @returns {PubSubConsumer<MessageDataHandle<MessageSocketTypes.NotificationData>> | undefined}
     */
    subscribeChats(host, force) {
        // if (!this.#initialized) throw new Error("GLOBAL SOCKET NOT YET IITIALIZED");
        /** @type {PubSubConsumer<MessageDataHandle<MessageSocketTypes.NotificationData>>} */
        const d = this.#pubsubNotification.subscribe(this.#notificationsHandle, host, force);
        return d;
    }
    /** @type {PubSub<MessageDataHandle<APITypes.ChatMessageData, APITypes.ChatRoomData > >} */
    #pubsubChat = new PubSub();



    /** @param {ChatTypes.ChatCommands | MessageSocketTypes.NotificationCommands} command */
    #sendCommand = (command) => {
        if (!this.#initialized) throw new Error("GLOBAL SOCKET NOT YET IITIALIZED");
        if (!this.#socket || !this.#socket.isConnected())
            return false;
        this.#socket.sendMessage(command);
        return true;
    }
}

export const messageSocketService = new GlobalSockHandler();