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
const MSG_TYPE_CHAT_ROOM_UPDATE = 102
const MSG_TYPE_CHAT_MESSAGE_NEW = 104
const MSG_TYPE_CHAT_MESSAGE_UPDATED = 105
const MSG_TYPE_CHAT_MESSAGE_UNREAD_COUNT = 106
const MSG_TYPE_CHAT_MESSAGE_PAGINATION_EXHAUSTED = 107
const MSG_TYPE_CHAT_MESSAGE_PAGE = 108

const MSG_TYPE_FRIEND_STATUS_CHANGED = 201

// export class UserStatusChangeEvent extends Event {
//     static type = 'user-status-changed-event';
//     constructor(user_status) {
//         super(UserStatusChangeEvent.type, {bubbles: true});
//         console.log('UserStatusChangeEvent constructor');
        
//         this.user_status = user_status;
//     }
// }

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
 * @template {MessageSocketTypes.NotificationData | APITypes.ChatMessageData} T
 * @template {APITypes.ChatRoomData} K
 */
export class MessageDataHandle {
    /** 
     * @param {MessageData<T>} msgData
     * @param {K | undefined} [roomInfo]
     */
    constructor(msgData, roomInfo) {
        this.#msgData = msgData;
    }
    #msgData;
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
        return this.#msgData.room;
    }
    get fetchingPage() {
        return this.#msgData.fetchingPage;
    }
}


/**
 * @template {MessageSocketTypes.NotificationData | APITypes.ChatMessageData} T
 * @template {APITypes.ChatRoomData} K
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
     * @param {T | T[]} data 
     * @param {number} [newPage] 
     */
    addEnd(data, newPage) {
        // console.log('ADD END: ', data, ', current Page: ', this.currentPage, ', new Page: ', newPage);
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
     * @param {T | T[]} data 
     * @param {number} [newPage] 
     */
    addFront(data, newPage) {
        // console.log('ADD FRONT: ', data, ', current Page: ', this.currentPage, ', new Page: ', newPage);
        // if (newPage === this.currentPage) return;
        if (data && newPage !== -1) {
            if (data instanceof Array) {
                for (let i = data.length - 1; i >= 0; i--) {
                    this.messages.unshift( data[i]);
                }
            } else {
                this.messages.unshift(data);
            }
        }
        if (typeof newPage === "number")
            this.currentPage = newPage;
    }
    /** @param {T} data @param {keyof T} lookup  */
    updateMessage(data, lookup) {
        const i = this.messages.findIndex(i => i[lookup] === data[lookup]);
        console.log('update message: ', data, ', lookup: ', lookup, ' , index: ', i);
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


class ChatMap {
    /** @param {string} sessionUserName  */
    constructor(sessionUserName) {
        this.sessionUserName = sessionUserName;
    }
    sessionUserName;

    /** @param {string} username */
    getRoomForUser = (username) => this.privateChatLookup.get(username);

    /** @param {any} roomIdOrTitle */
    getRoomId = (roomIdOrTitle) => typeof roomIdOrTitle === 'number' ? roomIdOrTitle
        : typeof roomIdOrTitle === 'string' ? this.chatsMapLookup.get(roomIdOrTitle)
        : undefined

    /** @param {APITypes.TournamentData | APITypes.BasicUserData | string | number} data  */
    getChatroomHandle(data) {
        let roomId = this.getRoomId(data);
        if (typeof roomId === 'number') return this.chatsMap.get(roomId);
        if (typeof data !== 'object') return undefined;
        if (typeof data.username === 'string') {
            roomId = this.getRoomId(`${this.sessionUserName}.${data.username}`);
            if (roomId == undefined) roomId = this.getRoomId(`${data.username}.${this.sessionUserName}`);
        } else if (typeof data.name === 'string') {
            roomId = this.getRoomId(data.name);
        }
        if (roomId != undefined)
            return this.chatsMap.get(roomId);
    }

    /**
     * @param {number | string} roomIdOrTitle
     * @param {APITypes.ChatMessageData} message
     */
    addNewMessageBottom(roomIdOrTitle, message) {
        console.log('ADD NEW MESSAGE');
        
        const roomId = this.getRoomId(roomIdOrTitle);
        console.log('ADD NEW MESSAGE: room_id: ', roomId);
        if (typeof roomId === 'number') {
            console.log('ADD NEW MESSAGE: room_id is number: ');
            const chat = this.chatsMap.get(roomId);
            if (chat) {
                console.log('ADD NEW MESSAGE: has chat handle: ');
                chat.messages.addEnd(message);
                chat.pubsub.publish(chat.messages);
                this.pubsubChat.publish(this.chatsMap);
                return true;
            }
        }
        return false;
    }

    /**
     * @param {number | string} roomIdOrTitle
     * @param {APITypes.ChatMessageData[]} messageList
     * @param {number} newPage 
     */
    pushMessagePageToTop(roomIdOrTitle, messageList, newPage) {
        const roomId = this.getRoomId(roomIdOrTitle);
        if (typeof roomId === 'number') {
            const chat = this.chatsMap.get(roomId);
            // console.log('ChatMap: pushMessagePageToTop: roomId: ', roomId, ', chat: ', chat);
            
            if (chat) {
                chat.messages.addFront(messageList.reverse());
                chat.messages.currentPage = newPage;
                chat.messages.fetchingPage = false;
                // console.log('ChatMap: pushMessagePageToTop DONE publish: roomId: ', roomId, ', chat: ', chat);
                chat.pubsub.publish(chat.messages);
                this.pubsubChat.publish(this.chatsMap);
                return true;
            }
        }
        return false;
    }

    /**
     * @param {number | string} roomIdOrTitle
     */
    setChatRoomPageExhausted(roomIdOrTitle) {
        const roomId = this.getRoomId(roomIdOrTitle);
        if (typeof roomId === 'number') {
            const chat = this.chatsMap.get(roomId);
            if (chat) chat.messages.currentPage = -1;
            return true;
        }
        return false;
    }

    /**
     * @param {number | string} roomIdOrTitle
     * @returns {null | MessageSocketTypes.CommandGetChatMessagesPage | false}
     */
    setFetchNewChatMessagePage(roomIdOrTitle) {
        const roomId = this.getRoomId(roomIdOrTitle);
        if (typeof roomId !== 'number') return false;
            const chat = this.chatsMap.get(roomId);
            if (chat == undefined) return false;
            if (chat.messages.fetchingPage == true || chat.messages.currentPage === -1) return null;
            chat.messages.fetchingPage = true;
            return {module: 'chat', command: 'get_chatmessages_page', room_id: roomId, page_number: chat.messages.currentPage};
    }

    /** @param {APITypes.ChatRoomData} chatRoom  */
    addOrUpdateChat(chatRoom) {
        this.chatsMap.set(chatRoom.room_id, { messages: new MessageData(chatRoom), pubsub: new PubSub() });
        this.chatsMapLookup.set(chatRoom.title, chatRoom.room_id);
        if (chatRoom.type === 'private') {
            const u = chatRoom.users.find(u => u.username !== this.sessionUserName);
            if (u) this.privateChatLookup.set(u.username, chatRoom.title);
        }
        this.pubsubChat.publish(this.chatsMap);
    }

    /** @param {APITypes.ChatRoomData} chatRoom */
    removeChat(chatRoom) {
        this.chatsMap.delete(chatRoom.room_id);
        this.chatsMapLookup.delete(chatRoom.title);
        if (chatRoom.type === 'private') {
            const u = chatRoom.users.find(u => u.username !== this.sessionUserName);
            if (u) this.privateChatLookup.delete(u.username);
        }
        this.pubsubChat.publish(this.chatsMap);
    }

    /** @param {string} chatRoomName  */
    isValidChatByRoomName(chatRoomName) {
        return this.chatsMapLookup.has(chatRoomName);
    }

    /** @type {ChatsMap} */
    chatsMap = new Map;
    /** @type {Map<string, number>} */
    chatsMapLookup = new Map();
    /** @type {PubSub<ChatsMap>} */
    pubsubChat = new PubSub();
    /** @type {Map<string, string>} */
    privateChatLookup = new Map();
}


/**
 * @typedef {Map< number, { pubsub: PubSub<MessageData<APITypes.ChatMessageData, APITypes.ChatRoomData>>,  messages: MessageData<APITypes.ChatMessageData, APITypes.ChatRoomData> } >} ChatsMap
 */

export class GlobalSockHandler {
    /** @param {APITypes.UserData} userData  */
    constructor(userData) {
        this.userData = userData;
        this.#chatsMap = new ChatMap(userData.username);
    }

    closeSocket() {
        this.#initialized = false;
        this.#socket?.close();
    }

    async init() {
        this.#socket = new ReconnectingSocket(`wss://api.${window.location.host}/ws/`)
        this.#socket.addHandler("initial_connected", () => {
            console.log('INITIAL CONNECTED');
            this.#initialized = true;
            this.#sendCommand({module: "notification", command: "get_notifications", page_number: this.#notifications.currentPage});
            this.#sendCommand({module: "notification", command: "get_unread_notifications_count"})
            this.#chatsMap.chatsMap.forEach((v, room_id) => {
                const cmd = this.#chatsMap.setFetchNewChatMessagePage(room_id);
                if (cmd !== null && cmd !== false) {
                    this.#sendCommand(cmd);
                }
            })
        });
        this.#socket.addHandler('error_json', (e) => {
            console.log('json error: ', e);
            
        })
        this.#socket.addHandler("message", this.handleSocketMessage);
         /** @type {APITypes.ApiResponse<APITypes.ChatRoomData[]>} */
         const data =  await fetcher.$get('/chat/rooms');
         if (data.success !== true) return;
         /** @type {Promise<APITypes.ApiResponse<APITypes.ChatMessageList>>[]} */
         const chatMessagePromises = [];
         data.data.forEach((room) => {
             console.log('room: ', room);
             this.#chatsMap.addOrUpdateChat(room);
         });
    }
    #chatsMap;
    

    #initialized = false;
    /** @type {ReconnectingSocket | undefined} */
    #socket;


    

    /** @type {MessageData<MessageSocketTypes.NotificationData>} */
    #notifications = new MessageData();

    /** @param {MessageSocketTypes.ChatEvents} data */
    handleSocketChatEvent(data) {
        if (data.msg_type ===  MSG_TYPE_CHAT_ROOM_ADD) {
            this.#chatsMap.addOrUpdateChat(data.payload.chat_room);
            this.#sendCommand({module: 'chat', command: 'get_chatmessages_page', room_id: data.payload.chat_room.room_id, page_number: 1});
        } else if (data.msg_type === MSG_TYPE_CHAT_ROOM_REMOVE) {
            this.#chatsMap.removeChat(data.payload.chat_room);
        } else if (data.msg_type === MSG_TYPE_CHAT_ROOM_UPDATE) {
            this.#chatsMap.addOrUpdateChat(data.payload.chat_room);
        } else if (data.msg_type === MSG_TYPE_CHAT_MESSAGE_NEW) {
            this.#chatsMap.addNewMessageBottom(data.payload.room_id, data.payload.chat_message);
        } else if (data.msg_type === MSG_TYPE_CHAT_MESSAGE_PAGE) {
            this.#chatsMap.pushMessagePageToTop(data.payload.room_id, data.payload.chat_messages, data.payload.new_page_number);
        } else if (data.msg_type === MSG_TYPE_CHAT_MESSAGE_PAGINATION_EXHAUSTED) {
            this.#chatsMap.setChatRoomPageExhausted(data.payload.room_id);
        }
    }

    /** @param {MessageSocketTypes.NotificationContentTypes} type  */
    updateSessionUserDataByNotificationContentType(type) {
        switch (type) {
            case 'friendlist':
                sessionService.updateData(['user']);
                break;
            case 'friendrequest':
                sessionService.updateData(['friend_requests_received', 'friend_requests_sent'])
                break;
            case 'gamerequest':
                sessionService.updateData(['game_invitations_received', 'game_invitations_sent', 'tournaments'])
                break;
            default:
                break;
        }
    }

    /** @param {MessageSocketTypes.NotificationEvents} data */
    handleSocketNotificationEvent(data) {
        if (!this.#initialized) return;
        if(data.msg_type === MSG_TYPE_NOTIFICATION_PAGE) {
            this.#notifications.addEnd(data.payload.notifications, data.payload.new_page_number);
        } else if(data.msg_type === MSG_TYPE_NOTIFICATION_NEW) {
            this.#notifications.addFront(data.payload.notification);
            this.#notifications.unreadCount += 1;
            this.updateSessionUserDataByNotificationContentType(data.payload.notification.notification_type)
        } else if(data.msg_type === MSG_TYPE_NOTIFICATION_PAGINATION_EXHAUSTED) {
            this.#notifications.currentPage = -1;
        } else if(data.msg_type === MSG_TYPE_NOTIFICATION_UNREAD_COUNT) {
            this.#notifications.unreadCount = data.payload.count;
        } else if(data.msg_type === MSG_TYPE_NOTIFICATION_UPDATED) {
            this.#notifications.updateMessage(data.payload.notification, 'notification_id');
            this.updateSessionUserDataByNotificationContentType(data.payload.notification.notification_type)
        }
        this.#pubsubNotification.publish(this.#notifications.getHandle())
    }

    /** @param {MessageSocketTypes.MessageSocketEvents} data */
    handleSocketMessage = (data) => {
        if (!this.#initialized) return;
        console.log('new message: ', data);
        if (data.msg_type === MSG_TYPE_FRIEND_STATUS_CHANGED) {
            userStatusMap.set(data.payload.user_id, data.payload.status);
            console.log('dispatch event: UserStatusChangeEvent');
            
            this.#pubsubStatus.publish(data.payload.status);
        } else if (data.module === 'chat') {
            this.handleSocketChatEvent(data)
        } else if (data.module === 'notification') {
            this.handleSocketNotificationEvent(data);
        }
    }

    /** @param {number} [room_id]  */
    getNextMessagePage(room_id) {
        if (!this.#initialized) return;
        if (typeof room_id === 'number') {
            const cmd = this.#chatsMap.setFetchNewChatMessagePage(room_id);
            if (cmd !== null && cmd !== false)
                this.#sendCommand(cmd)
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

    getRoomId = (value) => this.#chatsMap.getRoomId(value);
    
    
    /** @param {string} chatroom_name  */
    isValidChat = (chatroom_name) => this.#chatsMap.isValidChatByRoomName(chatroom_name); 

    /** @param {string} username */
    getChatRoomForUser = (username) => this.#chatsMap.getRoomForUser(username);

    /**
     * @param {number} room_id 
     * @param {string} message 
     */
    sendChatMessage(room_id, message) {
        if (this.getRoomId !== undefined)
            this.#sendCommand({module: 'chat', command: 'send_chat_message', room_id, message})
    }

    /** @type {PubSub<MessageDataHandle<MessageSocketTypes.NotificationData> >} */
    #pubsubNotification = new PubSub();

    /** @param {BaseBase} [host] @param {boolean} [force]  */
    subscribeNotifications(host, force) {
        return this.#pubsubNotification.subscribe(this.#notifications.getHandle(), host, force);
    }

    // /** @type {PubSub<ChatsMap>} */
    // #pubsubChat = new PubSub();

    /** @param {BaseBase} [host] @param {boolean} [force] */
    subscribeChats(host, force) {
        return this.#chatsMap.pubsubChat.subscribe(this.#chatsMap.chatsMap, host, force);
        // return this.#pubsubChat.subscribe(this.#chatsMap, host, force);
    }

    #pubsubStatus = new PubSub();
    /** @param {BaseBase} [host] @param {boolean} [force] */
    subscribeUserStatusChange(host, force) {
        return this.#pubsubStatus.subscribe(undefined, host, force);
    }


    /**
     * @param {APITypes.BasicUserData | APITypes.TournamentData | number} userOrTournament
     * @param {BaseBase} host
     * @param {(msg_type: keyof MessageSocketTypes.ChatEventTypes) => void} callback
     */
    subscribeSingleChat(userOrTournament, host, callback) {
        const handle = this.#chatsMap.getChatroomHandle(userOrTournament);
        console.log('HANDLE OF ROOM: ', userOrTournament, ': ', handle);
        
        if (handle) return handle.pubsub.subscribe(handle.messages, host, true);
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

/** @type {Map<number, 'online' | 'offline' | 'none'>} */
export const userStatusMap = new Map();
