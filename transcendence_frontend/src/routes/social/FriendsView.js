import { BaseElement, html } from '../../lib_templ/BaseElement.js';
import { sessionService } from '../../services/api/API_new.js';
import { actions, actionButtonDropdowns } from '../../components/ActionButtons.js';
import router from '../../services/router.js';
import { avatarLink } from '../../components/bootstrap/AvatarComponent.js';

/**
 * @typedef {"fv$friends" | "fv$rec" | "fv$sent" | "fv$blocked"} ListType
 */

/**
 * @typedef {APITypes.BlockedUserData[] | APITypes.FriendUserData[] | APITypes.FriendRequestItem[]} SocialUserDataList
 */
/**
 * @typedef {APITypes.BlockedUserData | APITypes.FriendUserData | APITypes.FriendRequestItem} SocialUserData
 */

export default class FriendsView extends BaseElement {

    /** @type {Map<ListType, { title: string, getList: () => APITypes.BlockedUserData[] | APITypes.FriendUserData[] | APITypes.FriendRequestItem[] | undefined }>} */
    #listsMap = new Map([
        [ "fv$friends", { title: 'All Friends', getList: () => this.sessionUser.value?.user?.friends } ],
        [ "fv$rec", { title: 'Incoming Requests', getList: () => this.sessionUser.value?.friend_requests_received } ],
        [ "fv$sent", { title: 'Outgoing Requests', getList: () => this.sessionUser.value?.friend_requests_sent } ],
        [ "fv$blocked", { title: 'Blocked Users', getList: () => this.sessionUser.value?.user?.blocked } ],
    ]);

    /** @type {ListType} */
    #lCurr = "fv$friends"

    constructor() {
        super(false, false);
        // /** @type {Array<APITypes.UserData> | string | undefined} */
        // this.userData = 'inptEmpty';

        this.sessionUser = sessionService.subscribe(this, true);
    }

    /**
     * @param {string} route
     * @returns {symbol | void}
     */
    onBeforeMount(route) {
        if (!sessionService.isLoggedIn) {
            return router.redirect('/');
        }
        if (route === '/social')
            return router.redirect('/social/friends');
        sessionService.updateData(["all"]);
        this.selectRoute(route);
        return undefined;
    }

    onRouteChange(route) {
        this.selectRoute(route);
        super.requestUpdate();
    }

    selectRoute(route) {
        if (route === '/social/friends')
            this.#lCurr = "fv$friends";
        else if (route === '/social/requests-received')
            this.#lCurr = "fv$rec";
        else if (route === '/social/requests-sent')
            this.#lCurr = "fv$sent";
        else if (route === '/social/blocked-users')
            this.#lCurr = "fv$blocked";
    }

    /**
     * @param {APITypes.FriendRequestItem} data 
     * @returns 
     */
    getFriendRequestAction = (data) => {
        
    }


    /**
     * @param {SocialUserData} data 
     * @returns 
     */
    getUserBtn = (data) => {
        // console.log('sent 1vs1 game invitations: ', sessionService.getSentGameInvitations(data.id, "1vs1"));
        // console.log('sent all game invitations: ', sessionService.getSentGameInvitations(data.id, "all"));
        // console.log('sent tournament game invitations: ', sessionService.getSentGameInvitations(data.id, "tournament"));
        // console.log('received 1vs1 game invitations: ', sessionService.getReceivedGameInvitations(data.id, "1vs1"));
        // console.log('received all game invitations: ', sessionService.getReceivedGameInvitations(data.id, "all"));
        // console.log('received tournament game invitations: ', sessionService.getReceivedGameInvitations(data.id, "tournament"));
        if (this.#lCurr === "fv$rec" && 'request_id' in data && typeof data.request_id === "number")
            return html`
                <div class="d-flex">
                    ${actions.acceptFriendRequest(data.request_id, { host: this, showText: false } ) }
                    ${actions.rejectFriendRequest(data.request_id, { host: this, showText: false } ) }
                </div>
            `;
        if (this.#lCurr === "fv$sent"  && 'request_id' in data && typeof data.request_id === "number")
            return actions.cancelFriendRequest(data.request_id, { host: this, showText: true } );
        if (this.#lCurr === "fv$blocked")
            return actions.unBlockUser(data.id, { host: this });
        
        if (this.#lCurr === "fv$friends")
            return html`
                <div class="d-flex" >
                    ${sessionService.canSend1vs1GameInvitation(data.id) === false ? '' :
                        actions.sendGameInvitation(data.id, { host: this, showText: false })}
                    ${actionButtonDropdowns.friendActions(data.id)}
                </div>
            `;
    };

    buttonGroupSelectHandler(e) {
        const ct = e.currentTarget;
        let t = e.target;
        if (ct === t) return;
        if (t.tagName === 'I') t = t.parentElement;
        if (this.#lCurr === t.dataset.list) {
            sessionService.updateData(["all"]);
        } else {
            this.#lCurr = t.dataset.list;
            if (this.#lCurr === "fv$friends")
                router.go('/social/friends');
            else if (this.#lCurr === "fv$rec")
                router.go('/social/requests-received');
            else if (this.#lCurr === "fv$sent")
                router.go('/social/requests-sent');
            else if (this.#lCurr === "fv$blocked")
                router.go('/social/blocked-users');
        }
    }

    /**
     * @param {SocialUserData} userData
     * @returns {import('../../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
     */
    renderFriendlistEntry = (userData) => {
        return html`
            <li class="list-group-item text-body-secondary fs-6">
                <div class="w-100 row text-center align-items-center justify-content-between">
                    <div class=" col-5 d-block p-0 m-2">
                        ${avatarLink(userData, true)}
                    </div>
                    <div class=" col-auto p-0">
                        ${this.getUserBtn(userData)}
                    </div>
                </div>
            </li>
        `;
    };

    /**
     * 
     * @param {ListType} listType 
     * @param {string} icon 
     * @param {string} text 
     * @param {boolean} [isActive] 
     * @returns 
     */
    getTabBtn = (listType, icon, text, isActive) => {
        return html`
            <button
                data-list="${listType}"
                type="button"
                class="btn btn-outline-dark rounded-5 mx-1
                    ${(this.#lCurr === listType || isActive) ? 'active' : ''}"
            >
                <i class="fa-solid ${icon} me-2"></i>${text}
            </button>
    `};

    render() {
        // console.log('RENDER FRIENDSLIST MAINN');

        const listO = this.#listsMap.get(this.#lCurr);
        const list = listO?.getList();

        return html`
            <div class="container p-3 h-100">
                <profile-search followlink ></profile-search>
                <br />
                <div
                    @click=${this.buttonGroupSelectHandler.bind(this)}
                    class="btn-group w-100  z-2"
                    role="group"
                    aria-label="Basic outlined example"
                >
                    ${ this.getTabBtn( 'fv$friends', 'fa-user-check', 'Friends' ) }
                    ${ this.getTabBtn( 'fv$rec', 'fa-user-plus', 'Requests', this.#lCurr === "fv$rec" || this.#lCurr === "fv$sent" ) }
                    ${ this.getTabBtn( 'fv$blocked', 'fa-ban', 'Blocked' ) }
                </div>

                <div class="mt-3">
                    ${html`
                        <div>
                            ${!(this.#lCurr === "fv$rec" || this.#lCurr === "fv$sent") ? '' : html`
                                <div
                                    @click=${(e) => {this.buttonGroupSelectHandler(e)}}
                                    class="btn-group w-100  z-2"
                                    role="group"
                                    aria-label="Basic outlined example"
                                >
                                    ${ this.getTabBtn( 'fv$rec', 'fa-envelope', 'received' ) }
                                    ${ this.getTabBtn( 'fv$sent', 'fa-paper-plane', 'sent' ) }
                                </div>
                            `}
                            ${!listO ? '' : html`
                                <div>
                                    <h5 class="mt-3 mb-2">${listO.title}</h5>
                                    ${!list || list.length === 0 ? 'Empty' : html`
                                            <ul class="list-group w-100">
                                                ${ list.map( (data) => this.renderFriendlistEntry(data) ) }
                                            </ul>
                                    `}
                                </div>
                            `}
                        </div>
                    `}
                </div>
            </div>
        `;
    }
}
customElements.define('friends-view', FriendsView);
