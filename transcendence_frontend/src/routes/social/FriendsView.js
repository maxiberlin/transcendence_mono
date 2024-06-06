import { BaseElement, html } from '../../lib_templ/BaseElement.js';
import { sessionService } from '../../services/api/API.js';
import { actions, renderDropdow } from '../../components/ActionButtons.js';
import router from '../../services/router.js';

export default class FriendsView extends BaseElement {
    static get lAll() {
        return 'fv$all';
    }

    static get lReceived() {
        return 'fv$rec';
    }

    static get lSent() {
        return 'fv$sent';
    }

    static get lBlocked() {
        return 'fv$blocked';
    }

    isAll = (str) =>
        str ? str === FriendsView.lAll : this.#lCurr === FriendsView.lAll;

    isReceived = (str) =>
        str ?
            str === FriendsView.lReceived
        :   this.#lCurr === FriendsView.lReceived;

    isBlocked = (str) =>
        str ?
            str === FriendsView.lBlocked
        :   this.#lCurr === FriendsView.lBlocked;

    isSent = (str) =>
        str ? str === FriendsView.lSent : this.#lCurr === FriendsView.lSent;

    isRequest = (str) => this.isReceived(str) || this.isSent(str);

    #listsMap = new Map([
        [FriendsView.lAll, { title: 'All Friends', prop: 'friends' }],
        [
            FriendsView.lReceived,
            { title: 'Incoming Requests', prop: 'requestsReceived' },
        ],
        [
            FriendsView.lSent,
            { title: 'Outgoing Requests', prop: 'requestsSent' },
        ],
        [FriendsView.lBlocked, { title: 'Blocked Users', prop: 'blocked' }],
    ]);

    #lCurr;

    constructor() {
        super(false, false);
        /** @type {Array<APITypes.UserData> | string | undefined} */
        this.userData = 'inptEmpty';

        this.sessionUser = sessionService.subscribe(this, true);
    }

    /**
     * @param {string} route
     * @returns {Promise<symbol | void>}
     */
    async onBeforeMount(route) {
        if (!sessionService.isLoggedIn) {
            return router.redirect('/');
        }
        if (route === '/social') return router.redirect('/social/friends');
        sessionService.refetchSessionUserData();
        // this.#lCurr = FriendsView.lAll;
        if (route === '/social/friends') this.#lCurr = FriendsView.lAll;
        else if (route === '/social/requests-received')
            this.#lCurr = FriendsView.lReceived;
        else if (route === '/social/requests-sent')
            this.#lCurr = FriendsView.lSent;
        else if (route === '/social/blocked-users')
            this.#lCurr = FriendsView.lBlocked;
        return undefined;
        // this.#currType = Symbol.for(FriendsView.#listTypes.all);
    }

    onRouteChange(route) {
        if (route === '/social/friends') this.#lCurr = FriendsView.lAll;
        else if (route === '/social/requests-received')
            this.#lCurr = FriendsView.lReceived;
        else if (route === '/social/requests-sent')
            this.#lCurr = FriendsView.lSent;
        else if (route === '/social/blocked-users')
            this.#lCurr = FriendsView.lBlocked;
        super.requestUpdate();
    }

    getUserBtn = (data) => {
        if (this.isReceived())
            return html`
                ${actions.acceptFriendRequest(data.request_id, {
                    host: this,
                    radius: 'circle',
                    showText: false,
                })}
                ${actions.rejectFriendRequest(data.request_id, { host: this })}
            `;
        if (this.isSent())
            return actions.cancelFriendRequest(data.id, { host: this });
        if (this.isBlocked())
            return actions.unBlockUser(data.id, { host: this });
        return html`
            ${sessionService.getInvited(data.id) !== undefined ?
                ''
            :   actions.sendGameInvitation(data.id, {
                    host: this,
                    radius: 'circle',
                    showText: false,
                })}
            ${renderDropdow(
                { color: 'dark', outline: true, icon: 'ellipsis-vertical' },
                [
                    actions.removeFriend(data.id, {
                        host: this,
                        dropdownitem: true,
                    }),
                    actions.blockUser(data.id, {
                        cb: () => {
                            router.redirect(`/profile/${data.id}`);
                        },
                        dropdownitem: true,
                    }),
                ],
            )}
        `;
    };

    buttonGroupSelectHandler(e) {
        const ct = e.currentTarget;
        let t = e.target;
        if (ct === t) return;
        if (t.tagName === 'I') t = t.parentElement;
        if (this.#lCurr === t.dataset.list) {
            sessionService.refetchSessionUserData();
        } else {
            this.#lCurr = t.dataset.list;
            if (t.dataset.list === FriendsView.lAll)
                router.go('/social/friends');
            else if (t.dataset.list === FriendsView.lReceived)
                router.go('/social/requests-received');
            else if (t.dataset.list === FriendsView.lSent)
                router.go('/social/requests-sent');
            else if (t.dataset.list === FriendsView.lBlocked)
                router.go('/social/blocked-users');

            // super.requestUpdate();
        }
    }

    /**
     * @param {object} userData
     * @returns {import('../../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
     */
    renderFriendlistEntry = (userData) => {
        return html`
            <li class="list-group-item text-body-secondary fs-6">
                <div
                    class="w-100 row text-center align-items-center justify-content-between"
                >
                    <div class=" col-5 d-block p-0 m-2">
                        <a
                            href="/profile/${userData.id}"
                            class="pw-3 m-0 link-body-emphasis link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover"
                        >
                            <avatar-component
                                radius="3"
                                src="${userData.avatar}"
                                size="40"
                            >
                                <span class="m-2 text-truncate" slot="after"
                                    >${userData.username}</span
                                >
                            </avatar-component>
                        </a>
                    </div>
                    <div class=" col-auto p-0">
                        ${this.getUserBtn(userData)}
                    </div>
                </div>
            </li>
        `;
    };

    renderFriendsList = () => {
        const listO = this.#listsMap.get(this.#lCurr);
        if (!listO) return '';
        const list = this.sessionUser.value[listO.prop];

        return html`
            <h5 class="mt-3 mb-2">${listO.title}</h5>
            ${!list || list.length === 0 ?
                'Empty'
            :   html`
                    <ul class="list-group w-100">
                        ${list.map((data) => this.renderFriendlistEntry(data))}
                    </ul>
                `}
        `;
    };

    static getTabBtn = (listType, icon, text, activeCondition) =>
        html` <button
            data-list="${listType}"
            type="button"
            class="btn btn-outline-dark rounded-5 text-center mx-1
                ${activeCondition ? 'active' : ''}"
        >
            <i class="fa-solid ${icon} me-2"></i>${text}
        </button>`;

    render() {
        // console.log('RENDER FRIENDSLIST MAINN');

        const listO = this.#listsMap.get(this.#lCurr);

        const list = !listO ? undefined : this.sessionUser.value[listO.prop];

        return html`
            <div class="container p-3 h-100">
                <profile-search></profile-search>
                <br />
                <div
                    @click=${this.buttonGroupSelectHandler.bind(this)}
                    class="btn-group w-100  z-2"
                    role="group"
                    aria-label="Basic outlined example"
                >
                    ${FriendsView.getTabBtn(
                        FriendsView.lAll,
                        'fa-user-check',
                        'Friends',
                        this.isAll(),
                    )}
                    ${FriendsView.getTabBtn(
                        FriendsView.lReceived,
                        'fa-user-plus',
                        'Requests',
                        this.isRequest(),
                    )}
                    ${FriendsView.getTabBtn(
                        FriendsView.lBlocked,
                        'fa-ban',
                        'Blocked',
                        false,
                    )}
                </div>

                <div class="mt-3">
                    ${html`
                        <div>
                            ${!this.isRequest() ?
                                ''
                            :   html`
                                    <div
                                        @click=${this.buttonGroupSelectHandler.bind(
                                            this,
                                        )}
                                        class="btn-group w-100  z-2"
                                        role="group"
                                        aria-label="Basic outlined example"
                                    >
                                        ${FriendsView.getTabBtn(
                                            FriendsView.lReceived,
                                            'fa-envelope',
                                            'received',
                                            this.isReceived(),
                                        )}
                                        ${FriendsView.getTabBtn(
                                            FriendsView.lSent,
                                            'fa-paper-plane',
                                            'sent',
                                            this.isSent(),
                                        )}
                                    </div>
                                `}
                            ${!listO ? '' : (
                                html`
                                    <div>
                                        <h5 class="mt-3 mb-2">
                                            ${listO.title}
                                        </h5>
                                        ${!list || list.length === 0 ?
                                            'Empty'
                                        :   html`
                                                <ul class="list-group w-100">
                                                    ${list.map((data) =>
                                                        this.renderFriendlistEntry(
                                                            data,
                                                        ),
                                                    )}
                                                </ul>
                                            `}
                                    </div>
                                `
                            )}
                        </div>
                    `}
                </div>
            </div>
        `;
    }
}
customElements.define('friends-view', FriendsView);
