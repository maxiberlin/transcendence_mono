import { actionButtonGroups, actions, configs, getBtn } from '../../components/ActionButtons';
import { avatarLink } from '../../components/bootstrap/AvatarComponent.js';
import { BaseElement, html } from '../../lib_templ/BaseElement.js';
import { sessionService } from '../../services/api/API_new';
import { Popover } from 'bootstrap';

const GENERAL_NOTIFICATION_INTERVAL = 4000
const GENERAL_NOTIFICATION_TIMEOUT = 5000

const DEFAULT_NOTIFICATION_PAGE_SIZE = 5

const GENERAL_MSG_TYPE_NOTIFICATIONS_DATA = 0  // New 'general' notifications data payload incoming
const GENERAL_MSG_TYPE_PAGINATION_EXHAUSTED = 1  // No more 'general' notifications to retrieve
const GENERAL_MSG_TYPE_NOTIFICATIONS_REFRESH_PAYLOAD = 2  // Retrieved all 'general' notifications newer than the oldest visible on screen
const GENERAL_MSG_TYPE_GET_NEW_GENERAL_NOTIFICATIONS = 3  // Get any new notifications
const GENERAL_MSG_TYPE_GET_UNREAD_NOTIFICATIONS_COUNT = 4  // Send the number of unread "general" notifications to the template
const GENERAL_MSG_TYPE_UPDATED_NOTIFICATION = 5 // Update a notification that has been altered


export class NotificationView extends BaseElement {
    static observedAttributes = [];
    constructor() {
        super();
    }
    /** @type {NotificationTypes.NotificationData[]} */
    #notificationDataList = [];
    /** @type {WebSocket | null} */
    #notificationSocket = null;
    #pageNo = 1;
    #oldesTimeStamp = Math.round(Date.now() / 1000);
    #newestTmeStamp = Math.round(Date.now() / 1000);
    #unreadCount = 0;

    /** @param {NotificationTypes.NotificationData} notification @param {boolean} [front]  */
    setNotification(notification, front=false) {
        const i = this.#notificationDataList.findIndex(i => i.notification_id === notification.notification_id)
        console.log('set Notification: ', notification);
        console.log('set Notification index: ', i);
        if (i === -1 && !front) this.#notificationDataList.push(notification);
        else if (i === -1 && front) this.#notificationDataList.unshift(notification);
        else this.#notificationDataList[i] = notification;
    }

    /** @param {number} timestamp */
    updateTimeStamps(timestamp) {
        this.#newestTmeStamp = Math.max(timestamp, this.#newestTmeStamp);
        this.#oldesTimeStamp = Math.min(timestamp, this.#oldesTimeStamp);
    }

    /** @param {Event} e */
    onNotificationSocketMessage = (e) => {
        console.log("Got notification websocket message.");
        if (!(e instanceof MessageEvent)) return;
        /** @type {NotificationMessageTypes.NotificationMessage} */
        const data = JSON.parse(e.data);
        console.log(data);
        if (!data) return;
        if(data.general_msg_type === GENERAL_MSG_TYPE_NOTIFICATIONS_DATA) {
            data.notifications.forEach(notification => {
                this.setNotification(notification);
                this.updateTimeStamps(notification.timestamp);
            });
            console.log('old page: ', this.#pageNo);
            this.#pageNo = data.new_page_number;
            console.log('new page: ', this.#pageNo);
        } else if(data.general_msg_type === GENERAL_MSG_TYPE_GET_NEW_GENERAL_NOTIFICATIONS) {
            data.notifications.forEach(notification => {
                this.setNotification(notification, true);
                if (this.DrowdownIsOpen === true)
                    this.#unreadCount = 0;
                else
                    this.#unreadCount = data.count ?? this.#unreadCount;
                this.updateTimeStamps(notification.timestamp);
            });
        } else if(data.general_msg_type === GENERAL_MSG_TYPE_NOTIFICATIONS_REFRESH_PAYLOAD) {
            data.notifications.forEach(notification => {
                this.setNotification(notification);
                this.updateTimeStamps(notification.timestamp);
            });
        } else if(data.general_msg_type === GENERAL_MSG_TYPE_PAGINATION_EXHAUSTED) {
            this.#pageNo = -1;
        } else if(data.general_msg_type === GENERAL_MSG_TYPE_GET_UNREAD_NOTIFICATIONS_COUNT) {
            this.#unreadCount = data.count;
        } else if(data.general_msg_type === GENERAL_MSG_TYPE_UPDATED_NOTIFICATION) {
            this.setNotification(data.notification);
        }

        super.requestUpdate();
    }

    connectedCallback() {
        super.connectedCallback();

        sessionService.addNotificationMessageHandler("message", this.onNotificationSocketMessage);
        sessionService.addNotificationMessageHandler("error", (e) => { console.log('Notification Socket error', e) });
        sessionService.addNotificationMessageHandler("open", (e) => {
            console.log("Notification Socket on open: " + e)
            sessionService.pushToNotificationSocket({
                command: "get_general_notifications",
                page_number: this.#pageNo}
            );
            sessionService.pushToNotificationSocket({
                command: "get_unread_general_notifications_count"
            });
        });
        sessionService.addNotificationMessageHandler("close", (e) => {
        });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.#notificationSocket?.close();
    }

    /**
     * @param {NotificationTypes.NotificationData} notification 
     */
    renderNotificationItem = (notification) =>  {
        // console.log('notification render: ', notification);
        // console.log('active?!?!: ', notification.is_active);
        // console.log('typeof: ', typeof notification.is_active);
        return html`
        <a 
            href="/profile/${notification.user.id}"
            class="dropdown-item m-0 p-0 d-flex flex-column flex-column align-items-start p-3 w-100">
            <div class="d-flex flex-column align-items-start w-100" >
                ${avatarLink(notification.user)}
                ${(notification.is_active === true && notification.action_id !== -1) ? html`
                    <div class="d-flex flex-column ">
                        <span class="text-truncate">
                            ${notification.description}
                        </span>
                        <div class="d-flex ms-2">
                            ${
                                notification.notification_type === "friendrequest" ? actionButtonGroups.receivedFriendInvitation(notification.action_id, true)
                                : notification.notification_type === "gamerequest" ? actionButtonGroups.receivedGameInvitation(notification.action_id, true)
                                : ''
                            }
                        </div>
                    </div>
                ` : html`
                    <span class="text-truncate">
                        ${notification.description}
                    </span>
                ` }
            </div>
            <p class="small m-0 pt-2 timestamp-text">
                ${notification.natural_timestamp}
            </p>
        </a>
    `}

    renderNoNotification = () => html`
        <div class="d-flex flex-row align-items-start" >
            <span class="align-items-start pt-1 m-auto">You have no notifications.</span>
        </div>
    `

    scrolltimeout
    /** @param {Event} e */
    onMenuScroll = (e) => {
        if (this.#pageNo === -1 || this.scrolltimeout !== undefined)
            return;
        const menu = e.currentTarget;
        this.scrolltimeout = setTimeout(() => {
            if (menu && menu instanceof HTMLElement && menu.scrollTop + 10 >= menu.scrollHeight - menu.offsetHeight)
                sessionService.pushToNotificationSocket({command: "get_general_notifications", page_number: this.#pageNo})
            this.scrolltimeout = undefined;
          }, 300);
    }
    // btn-group dropend
    render() {
        console.log('render: notification list data: ', this.#notificationDataList);
        const isMobile = window.innerWidth <= 576;
        return html`
        <div class=" ${isMobile ? 'btn-group dropup' : 'dropdown'} ">

        
            <button
                @shown.bs.dropdown=${ () => {
                    console.log('DROPDOWN SHOWN -> MARK AS READ');
                    this.DrowdownIsOpen = true;
                    sessionService.pushToNotificationSocket({command: "mark_notifications_read", oldest_timestamp: this.#newestTmeStamp});
                    document.body.classList.add("overflow-hidden");
                } }
                @hidden.bs.dropdown=${ () => {
                    this.DrowdownIsOpen = false;
                    document.body.classList.remove("overflow-hidden");
                } }
                
                class="btn btn-dark dropdown-toggle position-relative px-3 w-100 h-100"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
            >
                <i class="fa-solid fa-bell"></i>
                ${this.#notificationDataList.length === 0 ? '' : html`
                    <span class="position-absolute top-0 start-100 px-1 translate-middle badge rounded-pill bg-danger">
                        ${this.#unreadCount}
                        <span class="visually-hidden">unread notifications</span>
                    </span>
                `}
            </button>
            <div
                @scroll=${ (e) => { this.onMenuScroll(e) } }
                style="${"max-width: 100vw; max-height: 30em;"}"
                class="overflow-scroll dropdown-menu scrollable-menu"
                aria-labelledby="id_notification_dropdown_toggle"
            >
                ${this.#notificationDataList.length === 0 ? this.renderNoNotification()
                    :  this.#notificationDataList.map((n) => this.renderNotificationItem(n))
                }
            </div>

        </div>
        `
    }

    /**
     * @typedef {import('../../components/ActionButtons').ActionBtnData} ActionBtnData
     */

    /**
     * @typedef {import('../../components/ActionButtons').TplLit} TplLit
     */

    /**
     * @typedef {Object} WebsocketActionButtons
     * @property {(id: number, conf?: ActionBtnData) => TplLit} sendFriendRequest
     * @property {(id: number, conf?: ActionBtnData) => TplLit} cancelFriendRequest
     * @property {(id: number, conf?: ActionBtnData) => TplLit} acceptFriendRequest
     * @property {(id: number, conf?: ActionBtnData) => TplLit} rejectFriendRequest
     * @property {(id: number, conf?: ActionBtnData) => TplLit} sendGameInvitation
     * @property {(id: number, conf?: ActionBtnData) => TplLit} cancelGameInvitation
     * @property {(id: number, conf?: ActionBtnData) => TplLit} acceptGameInvitation
     * @property {(id: number, conf?: ActionBtnData) => TplLit} rejectGameInvitation
     */

    /** @type {WebsocketActionButtons} */
    websocketActions = {
        sendFriendRequest: (userId, conf) =>
            getBtn(sessionService.handleRequestWebsocket.bind(sessionService, "friend-cancel", userId), configs.addFriend, conf),
        cancelFriendRequest: (requestId, conf) =>
            getBtn(sessionService.handleRequestWebsocket.bind(sessionService, "friend-cancel", requestId), configs.cancelReq, conf),
        acceptFriendRequest: (requestId, conf) =>
            getBtn(sessionService.handleRequestWebsocket.bind(sessionService, "friend-accept", requestId),configs.acceptReq, conf),
        rejectFriendRequest: (requestId, conf) =>
            getBtn(sessionService.handleRequestWebsocket.bind(sessionService, "friend-reject", requestId),configs.rejectReq, conf),
        sendGameInvitation: (userId, conf) =>
            getBtn(sessionService.sendGameInvitation.bind(sessionService, userId),configs.sendGameInvite, conf),
        cancelGameInvitation: (invitationId, conf) =>
            getBtn(sessionService.handleRequestWebsocket.bind(sessionService, "game-cancel", invitationId), configs.cancelReq, conf),
        acceptGameInvitation: (invitationId, conf) =>
            getBtn(sessionService.handleRequestWebsocket.bind(sessionService, "game-accept", invitationId), configs.acceptReq, conf),
        rejectGameInvitation: (invitationId, conf) =>
            getBtn(sessionService.handleRequestWebsocket.bind(sessionService, "game-reject", invitationId), configs.rejectReq, conf),
    };

    /**
     * @typedef {Object} WebsocketActionButtonGroups
     * @property {(id: number, showText: boolean) => TplLit} receivedGameInvitation
     * @property {(id: number, showText: boolean) => TplLit} receivedFriendInvitation
     */

    /** @type {WebsocketActionButtonGroups} */
    websocketActionButtonGroups = {
        receivedGameInvitation: (invitationId, showText) => html`
            <div>
                ${this.websocketActions.acceptGameInvitation(invitationId, { showText })}
                ${this.websocketActions.rejectGameInvitation(invitationId, { showText })}
            </div>
        `,
        receivedFriendInvitation: (requestId, showText) => html`
            <div>
                ${this.websocketActions.acceptFriendRequest(requestId, { showText })}
                ${this.websocketActions.rejectFriendRequest(requestId, { showText })}
            </div>
        `
    }

}
customElements.define("notification-view", NotificationView);







// class NotificationView extends BaseElement {
//     static observedAttributes = [];
//     constructor() {
//         super();
//     }
//     /** @type {NotificationTypes.NotificationData[]} */
//     #notificationDataList = [];
//     /** @type {WebSocket | null} */
//     #notificationSocket = null;
//     #pageNo = 1;
//     #oldesTimeStamp = Date.now()
//     #newestTmeStamp = Date.now()
//     #unreadCount = 0;

//     /** @param {NotificationTypes.NotificationData} notification @param {boolean} [front]  */
//     setNotification(notification, front=false) {
//         const i = this.#notificationDataList.findIndex(i => i.notification_id === notification.notification_id)
//         if (i === -1 && !front) this.#notificationDataList.push(notification);
//         else if (i === -1 && front) this.#notificationDataList.unshift(notification);
//         else this.#notificationDataList[i] = notification;
//     }

//     /** @param {number} timestamp */
//     updateTimeStamps(timestamp) {
//         this.#newestTmeStamp = Math.max(timestamp, this.#newestTmeStamp);
//         this.#oldesTimeStamp = Math.min(timestamp, this.#oldesTimeStamp);
//     }

//     /** @param {MessageEvent} e */
//     onNotificationSocketMessage = (e) => {
//         console.log("Got notification websocket message.");
//         /** @type {NotificationMessageTypes.NotificationMessage} */
//         const data = JSON.parse(e.data);
//         console.log(data);
//         if(data.general_msg_type == 'GENERAL_MSG_TYPE_NOTIFICATIONS_DATA') {
//             data.notifications.forEach(notification => {
//                 this.setNotification(notification);
//                 this.updateTimeStamps(notification.timestamp);
//             });
//             this.#pageNo = data.new_page_number;
//         } else if(data.general_msg_type == 'GENERAL_MSG_TYPE_GET_NEW_GENERAL_NOTIFICATIONS') {
//             data.notifications.forEach(notification => {
//                 this.setNotification(notification, true);
//                 this.updateTimeStamps(notification.timestamp);
//             });
//         } else if(data.general_msg_type == 'GENERAL_MSG_TYPE_NOTIFICATIONS_REFRESH_PAYLOAD') {
//             data.notifications.forEach(notification => {
//                 this.setNotification(notification);
//                 this.updateTimeStamps(notification.timestamp);
//             });
//         } else if(data.general_msg_type == 'GENERAL_MSG_TYPE_PAGINATION_EXHAUSTED') {
//             this.#pageNo = -1;
//         } else if(data.general_msg_type == 'GENERAL_MSG_TYPE_GET_UNREAD_NOTIFICATIONS_COUNT') {
//             this.#unreadCount = data.count;
//         } else if(data.general_msg_type == 'GENERAL_MSG_TYPE_UPDATED_NOTIFICATION') {
//             this.setNotification(data.notification);
//         }
//         super.requestUpdate();
//     }

//     connectedCallback() {
//         super.connectedCallback();

//         this.#notificationSocket = new WebSocket(`wss://api.${window.location.host}/`);
//         if (this.#notificationSocket.readyState == WebSocket.OPEN)
//             console.log("Notification Socket OPEN complete.")
//         else if (this.#notificationSocket.readyState == WebSocket.CONNECTING)
//             console.log("Notification Socket connecting..")

//         this.#notificationSocket.onmessage = this.onNotificationSocketMessage;
//         this.#notificationSocket.onerror = (e) => { console.log('Notification Socket error', e) }
//         const refreshNotifications = () => {
//             this.pushToNotificationSocket({
//                 command: "refresh_general_notifications",
//                 oldest_timestamp: this.#oldesTimeStamp,
//                 newest_timestamp: this.#newestTmeStamp,
//             })
//         };
//         const getNewNotifications = () => {
//             this.pushToNotificationSocket({
//                 command: "get_new_general_notifications",
//                 newest_timestamp: this.#newestTmeStamp,
//             })
//         };
//         const getUnreadNotificationCount = () => {
//             this.pushToNotificationSocket({
//                 command: "get_unread_general_notifications_count"
//             });
//         };
//         let refreshtInterval, getInterval, getCountInterval;
//         this.#notificationSocket.onopen = (e) => {
//             console.log("Notification Socket on open: " + e)
//             this.pushToNotificationSocket({command: "get_general_notifications", page_number: this.#pageNo});
//             refreshtInterval = setInterval(refreshNotifications, GENERAL_NOTIFICATION_INTERVAL)
// 			getInterval = setInterval(getNewNotifications, GENERAL_NOTIFICATION_INTERVAL)
// 			getCountInterval = setInterval(getUnreadNotificationCount, GENERAL_NOTIFICATION_INTERVAL)
//         }
//         this.#notificationSocket.onclose = (e) => {
//             console.error('Notification Socket closed');
//             clearInterval(refreshtInterval);
//             clearInterval(getInterval);
//             clearInterval(getCountInterval);
//         };
//     }

//     disconnectedCallback() {
//         super.disconnectedCallback();
//         this.#notificationSocket?.close();
//     }

//     /**
//      * @param {NotificationTypes.NotificationData} notification 
//      */
//     renderNotificationItem = (notification) =>  html`
//         <div class="d-flex flex-column align-items-start general-card p-4">
//             <div class="d-flex flex-row align-items-start">
//                 ${avatarLink(notification.item)}
//                 ${notification.is_active ? html`
//                     <div class="d-flex flex-grow-1 align-items-center justify-content-between">
//                         <span class="m-auto">
//                             ${notification.description}
//                         </span>
//                         <div class="d-flex ms-2">
//                             ${actionButtonGroups.receivedFriendInvitation(notification.item.id, true)}
//                         </div>
//                     </div>
//                 ` : html`
//                     <span class="m-auto">
//                         ${notification.description}
//                     </span>
//                 `}
//             </div>
//             <p class="small pt-2 timestamp-text">
//                 ${notification.natural_timestamp}
//             </p>
//         </div>
//     `

//     renderNoNotification = () => html`
//         <div class="d-flex flex-row align-items-start" >
//             <span class="align-items-start pt-1 m-auto">You have no notifications.</span>
//         </div>
//     `

//     /** @param {Event} e */
//     onMenuScroll = (e) => {
//         const menu = e.currentTarget;
//         if (menu && menu instanceof HTMLDivElement && menu.scrollTop >= menu.scrollHeight - menu.offsetHeight) {
//             // const pageNumber = document.getElementById("id_general_page_number").innerHTML
//             const pageNumber = -1;
//             // -1 means exhausted or a query is currently in progress
//             if(pageNumber !== -1)
//                 pushToNotificationSocket({command: "get_general_notifications", page_number: pageNumber})
//         }
//     }

//     render() {
//         return html`
//             <div class="btn-group dropleft">
//                 <div class="d-flex notifications-icon-container rounded-circle align-items-center mr-3"
//                     id="id_notification_dropdown_toggle" data-bs-toggle="dropdown">
//                     <!--onclick="setGeneralNotificationsAsRead()"-->
//                     <span  class="notify-badge"></span>
//                     <span
//                         class="d-flex material-icons notifications-material-icon m-auto align-items-center">notifications</span>
//                 </div>
//                 <div @scroll=${ this.onMenuScroll }
//                     class="dropdown-menu scrollable-menu" aria-labelledby="id_notification_dropdown_toggle" >
//                     ${this.notificationList.length === 0 ? this.renderNoNotification()
//                         :  this.notificationList.map((n) => this.renderNotificationItem(n))
//                     }
//                 </div>
//             </div>
//         `
//     }


//     /** @param {NotificationTypes.NotificationCommand} command */
//     pushToNotificationSocket(command) {
//         if (this.#notificationSocket)
//             this.#notificationSocket.send(JSON.stringify(command));
//     }



//     /**
//      * @typedef {import('../../components/ActionButtons').ActionBtnData} ActionBtnData
//      */

//     /**
//      * @typedef {import('../../components/ActionButtons').TplLit} TplLit
//      */

//     /**
//      * @typedef {Object} WebsocketActionButtons
//      * @property {(id: number, conf?: ActionBtnData) => TplLit} sendFriendRequest
//      * @property {(id: number, conf?: ActionBtnData) => TplLit} cancelFriendRequest
//      * @property {(id: number, conf?: ActionBtnData) => TplLit} acceptFriendRequest
//      * @property {(id: number, conf?: ActionBtnData) => TplLit} rejectFriendRequest
//      * @property {(id: number, conf?: ActionBtnData) => TplLit} sendGameInvitation
//      * @property {(id: number, conf?: ActionBtnData) => TplLit} cancelGameInvitation
//      * @property {(id: number, conf?: ActionBtnData) => TplLit} acceptGameInvitation
//      * @property {(id: number, conf?: ActionBtnData) => TplLit} rejectGameInvitation
//      */

//     /** @type {WebsocketActionButtons} */
//     websocketActions = {
//         sendFriendRequest: (userId, conf) =>
//             getBtn((e) => {this.pushToNotificationSocket({command: "accept_friend_request", notification_id})}, configs.addFriend, conf),
//         cancelFriendRequest: (requestId, conf) =>
//             getBtn(sessionService.handleRequest.bind(sessionService, "friend-cancel", requestId), configs.cancelReq, conf),
//         acceptFriendRequest: (requestId, conf) =>
//             getBtn(sessionService.handleRequest.bind(sessionService, "friend-accept", requestId),configs.acceptReq, conf),
//         rejectFriendRequest: (requestId, conf) =>
//             getBtn(sessionService.handleRequest.bind(sessionService, "friend-reject", requestId),configs.rejectReq, conf),
//         sendGameInvitation: (userId, conf) =>
//             getBtn(sessionService.sendGameInvitation.bind(sessionService, userId, "1vs1", 0),configs.rejectReq, conf),
//         cancelGameInvitation: (invitationId, conf) =>
//             getBtn(sessionService.handleRequest.bind(sessionService, "game-cancel", invitationId), configs.cancelReq, conf),
//         acceptGameInvitation: (invitationId, conf) =>
//             getBtn(sessionService.handleRequest.bind(sessionService, "game-accept", invitationId), configs.acceptReq, conf),
//         rejectGameInvitation: (invitationId, conf) =>
//             getBtn(sessionService.handleRequest.bind(sessionService, "game-reject", invitationId), configs.rejectReq, conf),
//     };

//     /**
//      * @typedef {Object} WebsocketActionButtonGroups
//      * @property {(id: number, showText: boolean) => TplLit} receivedGameInvitation
//      * @property {(id: number, showText: boolean) => TplLit} receivedFriendInvitation
//      */

//     /** @type {WebsocketActionButtonGroups} */
//     websocketActionButtonGroups = {
//         receivedGameInvitation: (invitationId, showText) => html`
//             <div>
//                 ${this.websocketActions.acceptGameInvitation(invitationId, { showText })}
//                 ${this.websocketActions.rejectGameInvitation(invitationId, { showText })}
//             </div>
//         `,
//         receivedFriendInvitation: (requestId, showText) => html`
//             <div>
//                 ${this.websocketActions.acceptFriendRequest(requestId, { showText })}
//                 ${this.websocketActions.rejectFriendRequest(requestId, { showText })}
//             </div>
//         `
//     }

// }
// customElements.define("notification-view", NotificationView);
