/* eslint-disable max-classes-per-file */

import { actions, actionButtonDropdowns, actionButtonGroups } from '../../components/ActionButtons.js';
import {
    renderListItem,
    renderCard,
    renderCardInfo,
    renderListCard,
} from '../../components/bootstrap/BsCard.js';
import { avatarLink, getUserStatus } from '../../components/bootstrap/AvatarComponent.js';
import { BaseElement, createRef, html, ref } from '../../lib_templ/BaseElement.js';
import { fetcher, gameAPI, sessionService, userAPI } from '../../services/api/API_new.js';
import router from '../../services/router.js';
import { ToastNotificationErrorEvent } from '../../components/bootstrap/BsToasts.js';
import { humanizedDate } from '../../components/utils.js';

export class ProfileView extends BaseElement {
    constructor() {
        super(false, false);
        this.sessionUser = sessionService.subscribe(this, true);
        this.onResize = () => {
            super.requestUpdate();
        }
    }
    /** @type {APITypes.ApiResponse<APITypes.UserData> | undefined} */
    profileResponse;
    /** @type {APITypes.UserData | undefined} */
    profileUserData;
    /** @type {APITypes.GameResultItem[] | undefined} */
    profileUserGameResults
    /** @type {number | undefined} */
    profileUserId;

    connectedCallback() {
        super.connectedCallback();
        // if (this.gameStatImage) {
        //     // this.gameStatImage.width = 100;
        //     // this.gameStatImage.height = 100;
        //     this.gameStatImage.style.maxWidth = "100%";
        //     this.gameStatImage.style.maxHeight = "100%";
        //     this.statsImageWrapperRef.value?.append(this.gameStatImage);
        //     console.log('ref2: ', this.statsImageWrapperRef.value);
        // }
        window.addEventListener('resize', this.onResize);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('resize', this.onResize);
    }


    // /**
    //  * @param {number} [userId] 
    //  * @param {boolean} [shouldRerender] 
    //  */
    // async fetchProfileData(userId, shouldRerender) {
    //     try {
    //         if (userId == undefined) return;
    //         console.log('fetch deb1');
    //         this.profileResponse = await userAPI.getProfile(userId);
    //         if (!this.profileResponse.success && this.profileResponse.statuscode !== 403) {
    //             document.dispatchEvent( new ToastNotificationErrorEvent(this.profileResponse.message) );
    //             return false;
    //         }
    //         console.log('fetch deb2');
    //         this.profileUserData = this.profileResponse.data;
    //         const gameHistoryResponse = await gameAPI.getHistory(this.profileUserData.username)
    //         if (!gameHistoryResponse.success) {
    //             document.dispatchEvent( new ToastNotificationErrorEvent(gameHistoryResponse.message) );
    //             return false;
    //         }
    //         this.profileUserGameResults = gameHistoryResponse.data;
    //         console.log('fetch deb3');
    //         this.profileUserData = this.profileResponse.data;
    //         this.profileUserId = userId;
    //         const statsRes = await gameAPI.getStats();
    //         if (!statsRes.success || typeof statsRes.data !== "string") {
    //             document.dispatchEvent( new ToastNotificationErrorEvent(statsRes.message) );
    //             return false;
    //         }
    //         this.imageData = statsRes.data;
    //         // console.log('fetch deb4');
    //         // this.gameStatImage = new Image();
    //         // this.gameStatImage.src = 'data:image/png;base64, ' + statsRes.data;
    //         // console.log(this.gameStatImage);


    //         // super.requestUpdate();
    //         // this.statsImageWrapperRef.value?.append(this.gameStatImage);
            
            
    //         if (shouldRerender) super.requestUpdate();
    //         return true;
    //     } catch (error) {
    //         sessionService.handleFetchError(error);
    //         return false;
    //     }
    // }

    fetchProfileStats() {
        this.getProfileStatsPromise = gameAPI.getStats().then((statsRes) => {
            if (!statsRes.success || typeof statsRes.data !== "string") {
                document.dispatchEvent( new ToastNotificationErrorEvent(statsRes.message) );
                Promise.reject()
            } else {
                this.imageData = statsRes.data;
                this.allLoaded = true;
                
                super.requestUpdate();
            }
        })
    }

    /**
     * @param {number} [userId] 
     * @param {boolean} [shouldRerender] 
     */
    fetchProfileData(userId, shouldRerender) {
        try {
            if (userId == undefined) return;
            console.log('fetch deb1');
            this.getProfilePromise = userAPI.getProfile(userId).then((value) => {
                this.profileResponse = value;
                if (!this.profileResponse.success && this.profileResponse.statuscode !== 403) {
                    document.dispatchEvent( new ToastNotificationErrorEvent(this.profileResponse.message) );
                    Promise.reject()
                    router.redirect("/")
                    // history.back();
                } else {
                    this.profileUserData = this.profileResponse.data;
                    this.profileUserId = userId;
                    
                    super.requestUpdate();
                    console.log('fetch deb2');
                    this.getProfileHistoryPromise = gameAPI.getHistory(this.profileUserData.username).then((historyRes) => {
                        if (!historyRes.success) {
                            document.dispatchEvent( new ToastNotificationErrorEvent(historyRes.message) );
                            Promise.reject()
                        } else {
                            this.profileUserGameResults = historyRes.data;
                            super.requestUpdate();
                            console.log('fetch deb3');
                            this.fetchProfileStats();
                        }
                        
                    })
                }
            })
            // console.log('fetch deb4');
            // this.gameStatImage = new Image();
            // this.gameStatImage.src = 'data:image/png;base64, ' + statsRes.data;
            // console.log(this.gameStatImage);


            // super.requestUpdate();
            // this.statsImageWrapperRef.value?.append(this.gameStatImage);
            
            
            if (shouldRerender) super.requestUpdate();
            return true;
        } catch (error) {
            sessionService.handleFetchError(error);
            return false;
        }
    }

    // /**
    //  * @param {{pk: string | undefined}} a
    //  * @param {boolean} shouldRerender
    //  */
    // async handleUrlParams({pk}, shouldRerender) {
    //     // this.routerParams = params;
    //     const sessionUserId = this.sessionUser.value?.user?.id;

    //     const user_id = Number(pk)
    //     if ((pk == undefined && sessionUserId != undefined) || sessionUserId === pk) {
    //         this.profileUserData = this.sessionUser.value?.user;
    //         this.profileUserGameResults = this.sessionUser.value?.game_results;
    //         if (shouldRerender) super.requestUpdate();
    //         return true;
    //     } else if (pk == undefined || isNaN(user_id)) {
    //         document.dispatchEvent( new ToastNotificationErrorEvent("Profile not found") );
    //         return false;
    //     } else {
    //         await this.fetchProfileData(user_id, shouldRerender);
    //         return true;
    //     }
    // }
    /**
     * @param {{pk: string | undefined}} a
     * @param {boolean} shouldRerender
     */
    handleUrlParams({pk}, shouldRerender) {
        // this.routerParams = params;
        const sessionUserId = this.sessionUser.value?.user?.id;

        const user_id = Number(pk)
        if ((pk == undefined && sessionUserId != undefined) || sessionUserId === pk) {
            this.profileUserData = this.sessionUser.value?.user;
            this.profileUserGameResults = this.sessionUser.value?.game_results;
            this.fetchProfileStats();
            if (shouldRerender) super.requestUpdate();
            return true;
        } else if (pk == undefined || isNaN(user_id)) {
            document.dispatchEvent( new ToastNotificationErrorEvent("Profile not found") );
            return false;
        } else {
            this.fetchProfileData(user_id, shouldRerender);
            return true;
        }
    }
    /**
     * @param {string} route
     * @param {object} params
     * @param {URL} url
     * @returns {symbol | void}
     */
    onBeforeMount(route, params, url) {
        // console.log("onBeforeMount");
        if (!sessionService.isLoggedIn) {
            return router.redirect('/');
        }
        // const success = await this.handleUrlParams(params, true);
        const success = this.handleUrlParams(params, true);
        if (!success) return router.redirect("/");
    }

    onRouteChange(route, params, url) {
        // console.log("onRouteChange, params: ", params);
        this.handleUrlParams(params, false);
        
        super.requestUpdate();
    }

    onBeforeUnMount() {
        console.log('onBeforeUnMount: profilePromise: ', this.getProfilePromise);
        console.log('onBeforeUnMount: profileHistoryPromise: ', this.getProfileHistoryPromise);
        console.log('onBeforeUnMount: profileStatsPromise: ', this.getProfileStatsPromise);
        
    }

    /**
     * @returns {import('../../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral | string}
     */
    getActionButtons = () => {
        // console.log(userData);
        if (this.profileUserData == undefined) return "";
        if (this.profileUserData.is_self)
            return html`
                <a
                    href="/profile/settings"
                    class="btn btn-outline-primary px-4 p-2 mx-2 rounded-4"
                >
                    <i class="fa-solid fa-pen-to-square pe-2"></i>
                    Edit Profile
                </a>
                <a href="/logout" class="btn btn-danger px-4 p-2 mx-2 rounded-4">
                    <i class="fa-solid fa-right-from-bracket pe-2"></i>
                    Logout
                </a>
            `;
        let data;
        // console.log('profile view: userdata: ', userData);
        console.log('rerender Profile, friendrequests all: ', this.sessionUser.value.friend_requests_received);
        console.log('rerender Profile, friendrequests of user: ', sessionService.getReceivedFriendRequest(this.profileUserData.id));
        
        if ((data = sessionService.getFriend(this.profileUserData.id)) !== undefined)
            return html`
                <button disabled class="btn btn-dark me-1">
                    <i class="fa-solid fa-user-check"></i>
                </button>
                ${sessionService.canSend1vs1GameInvitation(this.profileUserData.id) === false ? '' :
                        actions.sendGameInvitation(this.profileUserData.id, { host: this, showText: false })}
                <single-chat-view color="success" icon="paper-plane" .user_or_tournament=${this.profileUserData} ></single-chat-view>
                ${actionButtonDropdowns.friendActions(this.profileUserData.id, () => { this.fetchProfileData(this.profileUserData?.id, true); })}
            `;
        if ((data = sessionService.getReceivedFriendRequest(this.profileUserData.id)) !== undefined)
            return html`
                <button disabled class="btn btn-dark me-1">
                    <i class="fa-solid fa-user-clock"></i>
                </button>
                ${actionButtonGroups.receivedFriendInvitation(data.request_id, true)}
                ${actionButtonDropdowns.userActions(data.id, () => { this.fetchProfileData(this.profileUserData?.id, true); })}
            `;
        if ((data = sessionService.getSentFriendRequest(this.profileUserData.id)) !== undefined)
            return html`
                <button disabled class="btn btn-dark me-1">
                    <i class="fa-solid fa-user-clock"></i>
                </button>
                ${actions.cancelFriendRequest(data.request_id)}
                ${actionButtonDropdowns.userActions(this.profileUserData.id, () => { this.fetchProfileData(this.profileUserData?.id, true); })}
            `;
        return html`
            ${actions.sendFriendRequest(this.profileUserData.id)}
            ${actionButtonDropdowns.userActions(this.profileUserData.id, () => { this.fetchProfileData(this.profileUserData?.id, true); })}
        `;
    };

    renderProfileHeader = () => html`
        <div class="profile-grid-item-header card p-4 bg-light-subtle ">
            <div class="card-body">
                <div class="profile-header-body" >
                    <div class="d-flex flex-column align-items-center justify-content-between">
                        <avatar-component
                            status=${getUserStatus(this.profileUserData, this.profileUserData?.is_self ? false : true)}
                            statusborder
                            radius="5"
                            src="${this.profileUserData?.avatar ?? ""}"
                            size="150"
                        ></avatar-component>
                        <div class="mt-3 d-flex flex-column align-items-center">
                            <h6 class="text-body-secondary"> @${this.profileUserData?.username ?? ""} </h6>
                            <small class="text-body-secondary"
                                >${this.profileUserData?.first_name ?? ""}
                                ${this.profileUserData?.last_name ?? ""}
                            </small>
                        </div>
                    </div>
                    <div class="profile-header-text ms-3">
                        <h3 class="display-5 m-0"> ${this.profileUserData?.alias ?? ""} </h3>
                        <p class="lead mb-3 fs-6 text-wrap">
                            This is a lead paragraph. It stands out from regular
                            paragraphs. This is a lead paragraph. It stands out from
                            regular paragraphs. This is a lead paragraph. It stands
                            out from regular paragraphs. This is a lead paragraph. It
                            stands out from regular paragraphs.
                        </p>
                        <div class="h-100 d-flex flex-row align-items-end justify-content-center" >
                            ${this.getActionButtons()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `

    renderFundamentalStats = () => html`
        
    `

    /** @param {APITypes.GameResultItem} data */
    renderGameHistoryItem = (data) => {
        const winnerProfile = data.player_one_score > data.player_two_score ? data.player_one : data.player_two;
        const profileUserIsWinner = winnerProfile.id === this.profileUserData?.id;
        return html`
        <div class="d-flex w-100 px-2 align-items-center justify-content-between border-start border-4
                ${ profileUserIsWinner ? 'border-success-subtle' : 'border-danger-subtle'}"
            >
                ${ avatarLink(data.player_one.id === this.profileUserData?.id ? data.player_two : data.player_one, true) }
                ${ renderCardInfo('Score', `${data.player_one_score} : ${data.player_two_score}` ) }
                ${ renderCardInfo( 'Date',  new Date(data.date).toLocaleDateString( 'de-DE', { dateStyle: 'short' } ) ) }
            </div>
        `
    }

    renderGameHistory = () =>  html`
        
    `


    renderBlockedPage = () => html`
        <div class="alert alert-danger" role="alert">
            <h4 class="alert-heading">${this.profileResponse?.message ?? ""}</h4>
            <hr />
            ${!this.profileUserId ? '' :
                actions.unBlockUser(this.profileUserId, { cb: () => { this.fetchProfileData(this.profileUserId??0, true); } })
            }
        </div>
    `

    statsImageWrapperRef = createRef();
    render() {
        return html`
            <div class="w-100 h-100 opacity-transition ${this.allLoaded ? 'content-loaded' : ''}">
                ${this.profileResponse?.statuscode === 403 ? this.renderBlockedPage() : html`
                <div class="mt-3 profile-grid px-3">
                    ${this.renderProfileHeader()}
                    <div class="profile-grid-item-a">
                        ${renderCard('', '', renderCardInfo('Rank',  this.profileUserData?.ranking ?? '-' ) )}
                    </div>
                    <div class="profile-grid-item-b">
                        ${renderCard( '', '', renderCardInfo('Member since', humanizedDate(this.profileUserData?.date_joined) ) )}
                    </div>
                    <div class="profile-grid-item-c">
                        ${renderCard( 'Game Stats', 'chart-simple', html`
                            <div class="d-flex justify-content-evenly">
                                <div class="border-bottom border-3 border-success-subtle" >
                                    ${renderCardInfo( 'Wins', this.profileUserData?.wins ?? '-' )}
                                </div>
                                <div class="border-bottom border-3">
                                    ${renderCardInfo( 'Total', this.profileUserData?.games_played ?? '-' )}
                                </div>
                                <div class="border-bottom border-3 border-danger-subtle" >
                                    ${renderCardInfo( 'Losses', this.profileUserData?.losses ?? '-', )}
                                </div>
                            </div>
                        `)}
                    </div>
                    <div class="profile-grid-item-d card text-center bg-light-subtle">
                        <div class="card-body">
                            <img style="${"filter: invert(70%); max-width: 100%; max-heigh: 100%"}" src="data:image/png;base64, ${this.imageData}" >
                        </div>
                    </div>
                    <div class="profile-grid-item-e overflow-scroll">
                        ${renderListCard( 'Match History', 'scroll',
                            this.profileUserGameResults?.map( data => renderListItem(this.renderGameHistoryItem(data)) ),
                        )}
                    </div>
                </div>
                `}
            </div>
        `;
        // return html`
        //     <div class="w-100">
        //         ${this.profileResponse?.statuscode === 403 ? this.renderBlockedPage() : html`
        //         ${this.renderProfileHeader()}
        //         <div class="mt-3 container-fluid text-center">
        //             <div class="row">
        //                 <div class="col-12 col-md-6 mt-3 f-flex flex-column">
        //                     <div class="row g-3">
        //                         ${this.renderFundamentalStats()}
        //                     </div>
        //                     <div class="row g-3">
        //                         ${this.renderGameHistory()}
        //                     </div>
        //                 </div>
        //             </div>
        //         </div>
        //         `}
        //     </div>
        // `;
    }
}
customElements.define('profile-view', ProfileView);

// import { actions, actionButtonDropdowns, actionButtonGroups } from '../../components/ActionButtons.js';
// import {
//     rendListItem,
//     renderCard,
//     renderCardInfo,
//     renderListCard,
// } from '../../components/bootstrap/BsCard.js';
// import { avatarLink } from '../../components/bootstrap/AvatarComponent.js';
// import { BaseElement, html } from '../../lib_templ/BaseElement.js';
// import { fetcher, gameAPI, sessionService, userAPI } from '../../services/api/API_new.js';
// import router from '../../services/router.js';
// import { ToastNotificationErrorEvent } from '../../components/bootstrap/BsToasts.js';
// import { humanizedDate } from '../../components/utils.js';

// export class ProfileView extends BaseElement {
//     constructor() {
//         super(false, false);
//         this.sessionUser = sessionService.subscribe(this, true);
//     }
//     /** @type {APITypes.ApiResponse<APITypes.UserData> | undefined} */
//     profileResponse;
//     /** @type {APITypes.UserData | undefined} */
//     profileUserData;
//     /** @type {APITypes.GameResultItem[] | undefined} */
//     profileUserGameResults
//     /** @type {number | undefined} */
//     profileUserId;


//     /**
//      * @param {number} userId 
//      * @param {boolean} shouldRerender 
//      */
//     async fetchProfileData(userId, shouldRerender) {
//         try {
//             this.profileResponse = await userAPI.getProfile(userId);
//             if (!this.profileResponse.success && this.profileResponse.statuscode !== 403) {
//                 document.dispatchEvent( new ToastNotificationErrorEvent(this.profileResponse.message) );
//                 return false;
//             }
//             this.profileUserData = this.profileResponse.data;
//             const gameHistoryResponse = await gameAPI.getHistory(this.profileUserData.username)
//             if (!gameHistoryResponse.success) {
//                 document.dispatchEvent( new ToastNotificationErrorEvent(gameHistoryResponse.message) );
//                 return false;
//             }
//             this.profileUserGameResults = gameHistoryResponse.data;
//             this.profileUserId = userId;
//             if (shouldRerender) super.requestUpdate();
//             return true;
//         } catch (error) {
//             sessionService.handleFetchError(error);
//             return false;
//         }
//     }

//     /**
//      * @param {{pk: string | undefined}} a
//      * @param {boolean} shouldRerender
//      */
//     async handleUrlParams({pk}, shouldRerender) {
//         // this.routerParams = params;
//         const sessionUserId = this.sessionUser.value?.user?.id;

//         const user_id = Number(pk)
//         if ((pk == undefined && sessionUserId != undefined) || sessionUserId === pk) {
//             this.profileUserData = this.sessionUser.value?.user;
//             this.profileUserGameResults = this.sessionUser.value?.game_results;
//             if (shouldRerender) super.requestUpdate();
//             return true;
//         } else if (pk == undefined || isNaN(user_id)) {
//             document.dispatchEvent( new ToastNotificationErrorEvent("Profile not found") );
//             return false;
//         } else {
//             await this.fetchProfileData(user_id, shouldRerender);
//             return true;
//         }
//     }
//     /**
//      * @param {string} route
//      * @param {object} params
//      * @param {URL} url
//      * @returns {Promise<symbol | void>}
//      */
//     async onBeforeMount(route, params, url) {
//         // console.log("onBeforeMount");
//         if (!sessionService.isLoggedIn) {
//             return router.redirect('/');
//         }
//         const success = await this.handleUrlParams(params, true);
//         if (!success) return router.redirect("/");
//     }

//     async onRouteChange(route, params, url) {
//         // console.log("onRouteChange, params: ", params);
//         await this.handleUrlParams(params, false);
        
//         super.requestUpdate();
//     }

//     /**
//      * @param {APITypes.UserData | undefined} userData
//      * @returns {import('../../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral | string}
//      */
//     getActionButtons = (userData) => {
//         // console.log(userData);
//         if (!userData) return "";
//         if (userData.is_self)
//             return html`
//                 <a
//                     href="/profile/settings"
//                     class="btn btn-outline-primary px-4 p-2 m-2 rounded-4"
//                 >
//                     <i class="fa-solid fa-pen-to-square pe-2"></i>Edit Profile
//                 </a>
//                 <a href="/logout" class="btn btn-danger px-4 p-2 m-2 rounded-4">
//                     <i class="fa-solid fa-right-from-bracket pe-2"></i>Logout
//                 </a>
//             `;
//         let data;
//         // console.log('profile view: userdata: ', userData);
//         if ((data = sessionService.getFriend(userData.id)) !== undefined)
//             return html`
//                 <button disabled class="btn btn-dark me-1">
//                     <i class="fa-solid fa-user-check"></i>
//                 </button>
//                 ${actionButtonDropdowns.friendActions(userData.id, () => { this.fetchProfileData(userData.id, true); })}
//             `;
//         if ((data = sessionService.getReceivedFriendRequest(userData.id)) !== undefined)
//             return html`
//                 <button disabled class="btn btn-dark me-1">
//                     <i class="fa-solid fa-user-clock"></i>
//                 </button>
//                 ${actionButtonGroups.receivedFriendInvitation(data.request_id, true)}
//                 ${actionButtonDropdowns.userActions(data.id, () => { this.fetchProfileData(userData.id, true); })}
//             `;
//         if ((data = sessionService.getSentFriendRequest(userData.id)) !== undefined)
//             return html`
//                 <button disabled class="btn btn-dark me-1">
//                     <i class="fa-solid fa-user-clock"></i>
//                 </button>
//                 ${actions.cancelFriendRequest(data.request_id)}
//                 ${actionButtonDropdowns.userActions(userData.id, () => { this.fetchProfileData(userData.id, true); })}
//             `;
//         return html`
//             ${actions.sendFriendRequest(userData.id)}
//             ${actionButtonDropdowns.userActions(userData.id, () => { this.fetchProfileData(userData.id, true); })}
//         `;
//     };

//     renderProfileHeader = () => html`
//         <div class="py-4 bg-light-subtle border-0 rounded-0">
//             <div class="card-body">
//                 <div class="row">
//                     <div class="col-12 col-md-3  d-flex justify-content-center  align-items-center" >
//                         <avatar-component
//                             status="online"
//                             statusborder
//                             radius="5"
//                             src="${this.profileUserData?.avatar ?? ""}"
//                             size="150"
//                         ></avatar-component>
//                     </div>
//                     <div class="col text-center text-md-start mt-3 mt-md-0">
//                         <div class="position-relative">
//                             <div class="mb-2">
//                                 <h6 class="text-body-secondary">
//                                     @${this.profileUserData?.username ?? ""}
//                                 </h6>
//                                 <h3 class="display-5 m-0">
//                                     ${this.profileUserData?.alias ?? ""}
//                                 </h3>
//                                 <small class="text-body-secondary"
//                                     >${this.profileUserData?.first_name ?? ""}
//                                     ${this.profileUserData?.last_name ?? ""}
//                                 </small>
//                             </div>
//                             <p class="lead mb-3 fs-6 text-wrap">
//                                 This is a lead paragraph. It stands out from regular
//                                 paragraphs. This is a lead paragraph. It stands out from
//                                 regular paragraphs. This is a lead paragraph. It stands
//                                 out from regular paragraphs. This is a lead paragraph. It
//                                 stands out from regular paragraphs.
//                             </p>
//                         </div>
//                     </div>
//                     <div class="col-12 ">
//                         <div class="h-100 d-flex flex-row align-items-center justify-content-center" >
//                             ${this.getActionButtons(this.profileUserData)}
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     `

//     renderFundamentalStats = () => html`
//         <div class="col-4">
//             ${renderCard('', '', renderCardInfo('Rank',  this.profileUserData?.ranking ?? '-' ) )}
//         </div>
//         <div class="col-8">
//             ${renderCard( '', '', renderCardInfo('Member since', humanizedDate(this.profileUserData?.date_joined) ) )}
//         </div>
//         <div class="col-12">
//             ${renderCard( 'Game Stats', 'chart-simple', html`
//                 <div class="row gx-4">
//                     <div class="col-4 border-bottom border-3 border-success-subtle" >
//                         ${renderCardInfo( 'Wins', this.profileUserData?.wins ?? '-' )}
//                     </div>
//                     <div class="col-4 border-bottom border-3">
//                         ${renderCardInfo( 'Total', this.profileUserData?.games_played ?? '-' )}
//                     </div>
//                     <div class="col-4 border-bottom border-3 border-danger-subtle" >
//                         ${renderCardInfo( 'Losses', this.profileUserData?.losses ?? '-', )}
//                     </div>
//                 </div>
//             `)}
//         </div>
//     `

//     /** @param {APITypes.GameResultItem} data */
//     renderGameHistoryItem = (data) => {
//         const winnerProfile = data.player_one_score > data.player_two_score ? data.player_one : data.player_two;
//         const profileUserIsWinner = winnerProfile.id === this.profileUserData?.id;
//         return html`
//         <div class="d-flex w-100 px-2 align-items-center justify-content-between border-start border-4
//                 ${ profileUserIsWinner ? 'border-success-subtle' : 'border-danger-subtle'}"
//             >
//                 ${ avatarLink(data.player_one.id === this.profileUserData?.id ? data.player_two : data.player_one) }
//                 ${ renderCardInfo('Score', `${data.player_one_score} : ${data.player_two_score}` ) }
//                 ${ renderCardInfo( 'Date',  new Date(data.date).toLocaleDateString( 'de-DE', { dateStyle: 'short' } ) ) }
//             </div>
//         `
//     }

//     renderGameHistory = () =>  html`
//         <div class="col-12 pb-3">
//             ${renderListCard( 'Match History', 'scroll',
//                 this.profileUserGameResults?.map( data => rendListItem(this.renderGameHistoryItem(data)) ),
//             )}
//         </div>
//     `


//     renderBlockedPage = () => html`
//         <div class="alert alert-danger" role="alert">
//             <h4 class="alert-heading">${this.profileResponse?.message ?? ""}</h4>
//             <hr />
//             ${!this.profileUserId ? '' :
//                 actions.unBlockUser(this.profileUserId, { cb: () => { this.fetchProfileData(this.profileUserId??0, true); } })
//             }
//         </div>
//     `

//     render() {
//         return html`
//             <div class="w-100">
//                 ${this.profileResponse?.statuscode === 403 ? this.renderBlockedPage() : html`
//                 ${this.renderProfileHeader()}
//                 <div class="mt-3 profile-grid">
//                     <div class="">
//                         <div class="">
//                             <div class="">
//                                 ${this.renderFundamentalStats()}
//                             </div>
//                             <div class="">
//                                 ${this.renderGameHistory()}
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//                 `}
//             </div>
//         `;
//         // return html`
//         //     <div class="w-100">
//         //         ${this.profileResponse?.statuscode === 403 ? this.renderBlockedPage() : html`
//         //         ${this.renderProfileHeader()}
//         //         <div class="mt-3 container-fluid text-center">
//         //             <div class="row">
//         //                 <div class="col-12 col-md-6 mt-3 f-flex flex-column">
//         //                     <div class="row g-3">
//         //                         ${this.renderFundamentalStats()}
//         //                     </div>
//         //                     <div class="row g-3">
//         //                         ${this.renderGameHistory()}
//         //                     </div>
//         //                 </div>
//         //             </div>
//         //         </div>
//         //         `}
//         //     </div>
//         // `;
//     }
// }
// customElements.define('profile-view', ProfileView);
