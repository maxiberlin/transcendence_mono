import { avatarInfo } from '../../components/bootstrap/AvatarComponent.js';
import { renderCard, renderListCard } from '../../components/bootstrap/BsCard.js';
import { ToastNotificationErrorEvent } from '../../components/bootstrap/BsToasts.js';
import { BaseElement, createRef, html, ifDefined, ref } from '../../lib_templ/BaseElement.js';
import PubSubConsumer from '../../lib_templ/reactivity/PubSubConsumer.js';
import { TemplateAsLiteral } from '../../lib_templ/templ/TemplateAsLiteral.js';
import { sessionService } from '../../services/api/API_new.js';
import router from '../../services/router.js';

export default class ChatView extends BaseElement {
    static observedAttributes = [];
    constructor() {
        super(false, false);
        this.chatsMap = sessionService.messageSocket?.subscribeChats(this);
        this.session = sessionService.subscribe(this);
        /** @type {import('../../lib_templ/templ/nodes/FuncNode.js').Ref<HTMLElement>} */
        this.inputRef = createRef();
    }

    mountChat(params) {
        if (params === undefined) return true;
        if (typeof params === 'object' && Object.hasOwn(params, 'chatroom_name') && typeof params.chatroom_name === 'string') {
            const currentChatName = decodeURI(params.chatroom_name);
            this.roomId = sessionService.messageSocket?.getRoomId(currentChatName);
            if (this.roomId != undefined) {
                console.log('OK ROOM: ', this.roomId);
                return true;
            }
        }
        document.dispatchEvent(new ToastNotificationErrorEvent("unknown chat room"))
        return false;
    }

    onBeforeMount(route, params, url) {
        if (!sessionService.isLoggedIn)
            return router.redirect("/");
        if (!this.mountChat(params))
            return router.redirect("/");
    }

    onRouteChange(route, params, url) {
        if (!this.mountChat(params))
            return router.redirect("/");
        super.requestUpdate();
    }


    /** @param {APITypes.ChatRoomData} [chatroom] */
    renderChatsListEntry = (chatroom) => !chatroom ? '' : html`
        <a
            class="chat-user-list-item list-group-item list-group-item-action text-body-secondary fs-6"
            href="/chat/${encodeURI(chatroom.title)}">
            <div class="w-100 row text-center align-items-center justify-content-between">
                ${chatroom.type === 'private' ? html`
                    ${avatarInfo(chatroom.users.find(u => u.id !== this.session.value.user?.id))}
                ` : html`
                    TOURNAMENT CHAT
                `}
            </div>
        </a>
    `
// this.chatsMap.value.forEach((v, k) => {})
    renderChatsList = () => !this.chatsMap ? '' : html`
            <div class="list-group list-group-flush chat-user-list">
                ${ Array.from(this.chatsMap.value, ([room_id, data]) => this.renderChatsListEntry(data.messages.room)) }
            </div>
       
    `
    

    render() {
        console.log('render chatScreen, roomid: ', this.roomId);
        
        // return html`
        //     <div class="chat-grid mt-4">
        //         <div class="chat-grid-item-a" style="${"height: 80vh;"}">
        //             ${this.renderChatsList()}
        //         </div>
        //         <div class="chat-grid-item-b" style="${"height: 80vh;"}" >
        //             <single-chat-view .chatroom_id=${this.roomId}></single-chat-view>
        //         </div>
        //     </div>
        // `
        // if (this.roomId == undefined)
        //     this.roomId = this.chatsMap?.value.entries().next().value.messages.room.room_id;
        return html`
            <div class="row g-0 w-100 px-2 mt-4">
                <div class="col-3 card bg-light-subtle">
                    ${this.renderChatsList()}
                </div>
                <div class="col d-flex flex-column" >
                    <single-chat-view .chatroom_id=${this.roomId}></single-chat-view>
                </div>
            </div>
        `
        // return html`
        //     <div class="row g-0 w-100 px-2">
        //         <div class="col-3 card bg-light-subtle" >
        //             ${this.renderChatsList()}
        //         </div>
        //         <div class="col d-flex flex-column" style="${"height: 70vh"}">
        //             <single-chat-view .chatroom_id=${this.roomId}></single-chat-view>
        //         </div>
        //     </div>
        // `
    }
}
customElements.define("chat-view", ChatView);
