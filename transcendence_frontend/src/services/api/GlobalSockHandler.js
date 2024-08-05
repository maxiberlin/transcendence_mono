import BaseBase from '../../lib_templ/BaseBase.js';
import PubSub from '../../lib_templ/reactivity/PubSub.js';
import PubSubConsumer from '../../lib_templ/reactivity/PubSubConsumer.js';
import { fetcher, sessionService } from './API_new.js';
import { ReconnectingSocket } from './Socket.js';

const chatErrors = {
    EMPTY_STRING: "EMPTY_STRING",
    ERROR_GET_MESSAGES: "ERROR_GET_MESSAGES",
    AUTH_ERROR: "AUTH_ERROR",
    ROOM_ACCESS_DENIED: "ROOM_ACCESS_DENIED",
    ACCESS_DENIED: "ACCESS_DENIED",
    ROOM_INVALID: "ROOM_INVALID",
}

const MSG_TYPE_NOTIFICATION_PAGE = 0
const MSG_TYPE_NOTIFICATION_PAGINATION_EXHAUSTED = 1
const MSG_TYPE_NOTIFICATION_TIMESPAN = 2
const MSG_TYPE_NOTIFICATION_NEW = 3
const MSG_TYPE_NOTIFICATION_UNREAD_COUNT = 4
const MSG_TYPE_NOTIFICATION_UPDATED = 5

const MSG_TYPE_CHAT_ROOM_ADD = 100
const MSG_TYPE_CHAT_ROOM_REMOVE = 101
const MSG_TYPE_CHAT_USER_ADD = 102
const MSG_TYPE_CHAT_USER_REMOVE = 103
const MSG_TYPE_CHAT_MESSAGE_NEW = 104
const MSG_TYPE_CHAT_MESSAGE_UPDATED = 105
const MSG_TYPE_CHAT_MESSAGE_UNREAD_COUNT = 106
const MSG_TYPE_CHAT_MESSAGE_PAGINATION_EXHAUSTED = 107
const MSG_TYPE_CHAT_MESSAGE_PAGE = 108



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


/**
 * @template T
 * @template K
 */
export class MessageDataHandle {
    /** 
     * @param {MessageData<T>} msgData
     * @param {K | undefined} [roomInfo]
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
    get fetchingPage() {
        return this.#msgData.fetchingPage;
    }
}

/**
 * @template T
 * @template K
 */
class MessageData {
    /** @param {K | undefined} [roomInfo] */
    constructor(roomInfo) {
        this.#handle = new MessageDataHandle(this, roomInfo);
        this.room = roomInfo;
    }
    room;
    unreadCount = 0;
    lastReadTimestamp = 0;
    currentPage = 1;
    /** @type {T[]} */
    messages = [];
    fetchingPage = false;

    #handle;
    getHandle() {
        // return new MessageDataHandle(this);
        return this.#handle;
    }

    /**
     *  data array needs to be in descending order of timestamps
     * @param {*} data 
     * @param {*} newPage 
     */
    addEnd(data, newPage) {
        console.log('ADD FRONT: ', data);
        // if (newPage !== this.currentPage + 1) return;
        if (newPage !== -1 && data) {
            if (data instanceof Array) {
                for (let i = 0; i < data.length; ++i) {
                    this.messages.push( data[i]);
                }
            } else {
                this.messages.push(data);
            }
        }
        if (typeof newPage === "number")
            this.currentPage = newPage;
    }
    /**
     *  data array needs to be in descending order of timestamps
     * @param {*} data 
     * @param {number} newPage 
     */
    addFront(data, newPage) {
        console.log('ADD FRONT: ', data);
        if (newPage === this.currentPage) return;
        if (data instanceof Array) {
            for (let i = data.length - 1; i >= 0; i--) {
                this.messages.unshift( data[i]);
            }
        } else {
            this.messages.unshift(data);
        }
        if (typeof newPage === "number")
            this.currentPage = newPage;
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
 */

/**
 * @typedef {Map< number, { pubsub: PubSub<MessageData<APITypes.ChatMessageData, APITypes.ChatRoomData>>,  messages: MessageData<APITypes.ChatMessageData, APITypes.ChatRoomData> } >} ChatsMap
 */

class GlobalSockHandler {
    constructor() {
        this.session = sessionService.subscribe(undefined, true);
    }

    initNotifications() {
        this.#sendCommand({module: "notification", command: "get_notifications", page_number: this.#notifications.currentPage});
        this.#sendCommand({module: "notification", command: "get_unread_notifications_count"})
    }

    async initChats() {
        /** @type {APITypes.ApiResponse<APITypes.ChatRoomData[]>} */
        const data =  await fetcher.$get('/chat/rooms');
        if (data.success !== true) return;
        /** @type {Promise<APITypes.ApiResponse<APITypes.ChatMessageList>>[]} */
        const chatMessagePromises = [];
        data.data.forEach((room) => {
            console.log('room: ', room);
            const messages = new MessageData(room);
            const p = fetcher.$get('/chat/messages', {searchParams: new URLSearchParams({
                room_id: room.room_id.toString(),
                page: '1',
            })});
            chatMessagePromises.push(p);
            console.log('typeof roomid: ', typeof room.room_id);
            this.#chatsMap.set(room.room_id, {messages, pubsub: new PubSub() });
            this.#chatsMapLookup.set(room.title, room.room_id);
        });
        const res = await Promise.all(chatMessagePromises);
        res.forEach((messageResponse) => {
            console.log('message response: ', messageResponse);
            if (messageResponse.success) {
                const d = messageResponse.data;
                console.log('');
                this.#chatsMap.get(d.room_id)?.messages.addEnd(d.messages.reverse(), d.next_page);
            } else {
                console.log('invalid chatmessage response: ', messageResponse.message);
            }
        });
    }

    async init() {
        this.#socket = new ReconnectingSocket(`wss://api.${window.location.host}/ws/`)
        this.#socket.addHandler("initial_connected", () => {
            console.log('INITIAL CONNECTED');
            this.#initialized = true;
            this.initNotifications()
        });
        this.#socket.addHandler('error_json', (e) => {
            console.log('json error: ', e);
            
        })
        this.#socket.addHandler("message", this.handleSocketMessage);
        await this.initChats()
        // this.#notificationsHandle = new MessageDataHandle(this.#notifications);
        // this.#notificationsHandle

        
    }
    /** @type {ChatsMap} */
    #chatsMap = new Map();

    /** @type {Map<string, number>} */
    #chatsMapLookup = new Map();

    #initialized = false;
    /** @type {ReconnectingSocket | undefined} */
    #socket;

    /** @type {MessageData<MessageSocketTypes.NotificationData>} */
    #notifications = new MessageData();

    /** @param {MessageSocketTypes.ChatEvents} data */
    handleSocketChatEvent(data) {
        if (data.msg_type === MSG_TYPE_CHAT_MESSAGE_NEW) {
            console.log('OKOK');
            const chat = this.#chatsMap.get(data.payload.room_id);
            console.log('chat: ', chat);
            chat?.messages.addEnd(data.payload.chat_message, chat.messages.unreadCount+1);
            chat?.pubsub.publish(chat.messages);
            this.#pubsubChat.publish(this.#chatsMap);
            return;
        } else if (data.msg_type === MSG_TYPE_CHAT_MESSAGE_PAGE) {
            const c = this.#chatsMap.get(data.payload.room_id);
            if (c) {
                console.log('new page: ', data.payload.new_page_number);
                
                c.messages.addFront(data.payload.chat_messages.reverse(), data.payload.new_page_number);
                console.log('new messages: ', c.messages.messages);
                c.messages.fetchingPage = false;
                c.pubsub.publish(c.messages);
                this.#pubsubChat.publish(this.#chatsMap);
            }
        }
    }
    /** @param {MessageSocketTypes.NotificationMessages} data */
    handleSocketNotificationEvent(data) {
        if(data.msg_type === MSG_TYPE_NOTIFICATION_PAGE) {
            this.#notifications.addEnd(data.payload.notifications, data.payload.new_page_number);
        } else if(data.msg_type === MSG_TYPE_NOTIFICATION_NEW) {
            this.#notifications.addFront(data.payload.notification, data.payload.count);
        } else if(data.msg_type === MSG_TYPE_NOTIFICATION_PAGINATION_EXHAUSTED) {
            this.#notifications.currentPage = -1;
        } else if(data.msg_type === MSG_TYPE_NOTIFICATION_UNREAD_COUNT) {
            this.#notifications.unreadCount = data.payload.count;
        } else if(data.msg_type === MSG_TYPE_NOTIFICATION_UPDATED) {
            this.#notifications.updateMessage(data, 'notification_id');
        }
        this.#pubsubNotification.publish(this.#notifications.getHandle())
    }

    /** @param {MessageSocketTypes.NotificationMessages | MessageSocketTypes.ChatEvents} data */
    handleSocketMessage = (data) => {
        if (!this.#initialized) return;
        console.log('new message: ', data);
        if (data.module === 'chat') this.handleSocketChatEvent(data);
        else if (data.module === 'notification') this.handleSocketNotificationEvent(data);
    }

    /** @param {number} [room_id]  */
    getNextMessagePage(room_id) {
        if (!this.#initialized) return;
        if (typeof room_id === 'number') {
            const c = this.#chatsMap.get(room_id);
            if (c && c.messages.currentPage !== -1 && c.messages.fetchingPage === false) {
                c.messages.fetchingPage = true;
                this.#sendCommand({module: 'chat', command: 'get_chatmessages_page', page_number: c.messages.currentPage, room_id});
            }

        } else if (this.#notifications.currentPage !== -1 && this.#notifications.fetchingPage === false) {
            this.#notifications.fetchingPage = true;
            this.#sendCommand({module: 'notification', command: "get_notifications", page_number: this.#notifications.currentPage});
            this.#sendCommand({module: 'notification', command: "get_unread_notifications_count"})
        }
    }

    updateNotificationNaturalTime() {
        const now = Date.now() / 1000;
        this.#notifications.messages.forEach((m) => {
            // console.log('prev: ', m.natural_timestamp, ', now: ', detailedTimeAgo(now, m.timestamp));
            m.natural_timestamp = detailedTimeAgo(now, m.timestamp);
        })
        this.#pubsubNotification.publish(this.#notifications.getHandle());
    }

    /** @param {number} timestamp */
    setNotificationsAsReadUntil(timestamp) {
        if (!this.#initialized) return;
        if (typeof timestamp === "number" && !isNaN(timestamp) && timestamp > this.#notifications.lastReadTimestamp) {
            this.#sendCommand({module: 'notification', command: "mark_notifications_read", oldest_timestamp: timestamp});
            this.#notifications.lastReadTimestamp = timestamp;
        }
    }

    /**
     * @param {number} room_id 
     * @param {string} message 
     */
    sendChatMessage(room_id, message) {
        this.#sendCommand({module: 'chat', command: 'send_chat_message', room_id, message})
    }

    /** @type {PubSub<MessageDataHandle<MessageSocketTypes.NotificationData> >} */
    #pubsubNotification = new PubSub();

    /** @param {BaseBase} [host] @param {boolean} [force]  */
    subscribeNotifications(host, force) {
        return this.#pubsubNotification.subscribe(this.#notifications.getHandle(), host, force);
    }

    /** @type {PubSub<ChatsMap>} */
    #pubsubChat = new PubSub();

    /** @param {BaseBase} [host] @param {boolean} [force] */
    subscribeChats(host, force) {
        return this.#pubsubChat.subscribe(this.#chatsMap, host, force);
    }

    // /** @type {Map<number, PubSub<MessageData<APITypes.ChatMessageData, APITypes.ChatRoomData>> >} */
    // #pubsubChatsMap = new Map();

    /**
     * @param {APITypes.BasicUserData | APITypes.TournamentData} userOrTournament
     * @param {BaseBase} host
     * @param {(msg_type: keyof MessageSocketTypes.ChatEventTypes) => void} callback
     */
    subscribeSingleChat(userOrTournament, host, callback) {
        let v;
        console.log('subscribe chats');
        
        if (typeof userOrTournament.username === 'string') {
            v = this.#chatsMapLookup.get(`${this.session.value.user?.username}.${userOrTournament.username}`);
            if (v === undefined) v = this.#chatsMapLookup.get(`${userOrTournament.username}.${this.session.value.user?.username}`);
            return
        } else if (typeof userOrTournament.name === 'string') {
            v = this.#chatsMapLookup.get(userOrTournament.name);
        }
        if (v) {
            const d = this.#chatsMap.get(v);
            console.log('GlobakSockHandler: subscribeSingleChat: data: ', d);
            return d?.pubsub.subscribe(d.messages, host, true);
        }
    }



    /** @param {MessageSocketTypes.ChatCommands | MessageSocketTypes.NotificationCommands} command */
    #sendCommand = (command) => {
        if (!this.#initialized) return;
        if (!this.#socket || !this.#socket.isConnected())
            return false;
        this.#socket.sendMessage(command);
        return true;
    }
}

export const messageSocketService = new GlobalSockHandler();