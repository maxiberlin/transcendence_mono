/* eslint-disable max-classes-per-file */
// import {
//     BaseElem,
//     html,
//     css,
//     sessionService,
//     Router,
//     fetcher,
//     router,
//     renderDropdow,
//     actions,
//     renderCard,
//     renderCardInfo,
//     renderAvatar,
//     renderListCard,
//     rendListItem,
// } from '../../modules.js';

import { actions, actionButtonDropdowns, actionButtonGroups } from '../../components/ActionButtons.js';
import {
    rendListItem,
    renderCard,
    renderCardInfo,
    renderListCard,
} from '../../components/bootstrap/BsCard.js';
import { avatarLink } from '../../components/bootstrap/AvatarComponent.js';
import { BaseElement, html } from '../../lib_templ/BaseElement.js';
import { fetcher, gameAPI, sessionService, userAPI } from '../../services/api/API_new.js';
import router from '../../services/router.js';
import { ToastNotificationErrorEvent } from '../../components/bootstrap/BsToasts.js';
import { humanizedDate } from '../../components/utils.js';

export class ProfileView extends BaseElement {
    constructor() {
        super(false, false);
        this.sessionUser = sessionService.subscribe(this, true);
    }
    /** @type {APITypes.ApiResponse<APITypes.UserData> | undefined} */
    profileResponse;
    /** @type {APITypes.UserData | undefined} */
    profileUserData;
    /** @type {APITypes.GameResultItem[] | undefined} */
    profileUserGameResults
    /** @type {number | undefined} */
    profileUserId;


    /**
     * @param {number} userId 
     * @param {boolean} shouldRerender 
     */
    async fetchProfileData(userId, shouldRerender) {
        try {
            this.profileResponse = await userAPI.getProfile(userId);
            if (!this.profileResponse.success && this.profileResponse.statuscode !== 403) {
                document.dispatchEvent( new ToastNotificationErrorEvent(this.profileResponse.message) );
                return false;
            }
            this.profileUserData = this.profileResponse.data;
            const gameHistoryResponse = await gameAPI.getHistory(this.profileUserData.username)
            if (!gameHistoryResponse.success) {
                document.dispatchEvent( new ToastNotificationErrorEvent(gameHistoryResponse.message) );
                return false;
            }
            this.profileUserGameResults = gameHistoryResponse.data;
            this.profileUserId = userId;
            if (shouldRerender) super.requestUpdate();
            return true;
        } catch (error) {
            sessionService.handleFetchError(error);
            return false;
        }
    }

    /**
     * @param {{pk: string | undefined}} a
     * @param {boolean} shouldRerender
     */
    async handleUrlParams({pk}, shouldRerender) {
        // this.routerParams = params;
        const sessionUserId = this.sessionUser.value?.user?.id;

        const user_id = Number(pk)
        if ((pk == undefined && sessionUserId != undefined) || sessionUserId === pk) {
            this.profileUserData = this.sessionUser.value?.user;
            this.profileUserGameResults = this.sessionUser.value?.game_results;
            if (shouldRerender) super.requestUpdate();
            return true;
        } else if (pk == undefined || isNaN(user_id)) {
            document.dispatchEvent( new ToastNotificationErrorEvent("Profile not found") );
            return false;
        } else {
            await this.fetchProfileData(user_id, shouldRerender);
            return true;
        }
    }
    /**
     * @param {string} route
     * @param {object} params
     * @param {URL} url
     * @returns {Promise<symbol | void>}
     */
    async onBeforeMount(route, params, url) {
        // console.log("onBeforeMount");
        if (!sessionService.isLoggedIn) {
            return router.redirect('/');
        }
        const success = await this.handleUrlParams(params, true);
        if (!success) return router.redirect("/");
    }

    async onRouteChange(route, params, url) {
        // console.log("onRouteChange, params: ", params);
        await this.handleUrlParams(params, false);
        
        super.requestUpdate();
    }

    /**
     * @param {APITypes.UserData | undefined} userData
     * @returns {import('../../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral | string}
     */
    getActionButtons = (userData) => {
        // console.log(userData);
        if (!userData) return "";
        if (userData.is_self)
            return html`
                <a
                    href="/profile/settings"
                    class="btn btn-outline-primary px-4 p-2 m-2 rounded-4"
                >
                    <i class="fa-solid fa-pen-to-square pe-2"></i>Edit Profile
                </a>
                <a href="/logout" class="btn btn-danger px-4 p-2 m-2 rounded-4">
                    <i class="fa-solid fa-right-from-bracket pe-2"></i>Logout
                </a>
            `;
        let data;
        // console.log('profile view: userdata: ', userData);
        if ((data = sessionService.getFriend(userData.id)) !== undefined)
            return html`
                <button disabled class="btn btn-dark me-1">
                    <i class="fa-solid fa-user-check"></i>
                </button>
                ${actionButtonDropdowns.friendActions(userData.id, () => { this.fetchProfileData(userData.id, true); })}
            `;
        if ((data = sessionService.getReceivedFriendRequest(userData.id)) !== undefined)
            return html`
                <button disabled class="btn btn-dark me-1">
                    <i class="fa-solid fa-user-clock"></i>
                </button>
                ${actionButtonGroups.receivedFriendInvitation(data.request_id, true)}
                ${actionButtonDropdowns.userActions(data.id, () => { this.fetchProfileData(userData.id, true); })}
            `;
        if ((data = sessionService.getSentFriendRequest(userData.id)) !== undefined)
            return html`
                <button disabled class="btn btn-dark me-1">
                    <i class="fa-solid fa-user-clock"></i>
                </button>
                ${actions.cancelFriendRequest(data.request_id)}
                ${actionButtonDropdowns.userActions(userData.id, () => { this.fetchProfileData(userData.id, true); })}
            `;
        return html`
            ${actions.sendFriendRequest(userData.id)}
            ${actionButtonDropdowns.userActions(userData.id, () => { this.fetchProfileData(userData.id, true); })}
        `;
    };

    renderProfileHeader = () => html`
        <div class="card border-0 rounded-0">
            <div class="card-body">
                <div class="row">
                    <div class="col-12 col-md-3  d-flex justify-content-center  align-items-center" >
                        <avatar-component
                            status="online"
                            statusborder
                            radius="5"
                            src="${this.profileUserData?.avatar ?? ""}"
                            size="150"
                        ></avatar-component>
                    </div>
                    <div class="col text-center text-md-start mt-3 mt-md-0">
                        <div class="position-relative">
                            <div class="mb-2">
                                <h6 class="text-body-secondary">
                                    @${this.profileUserData?.username ?? ""}
                                </h6>
                                <h3 class="display-5 m-0">
                                    ${this.profileUserData?.alias ?? ""}
                                </h3>
                                <small class="text-body-secondary"
                                    >${this.profileUserData?.first_name ?? ""}
                                    ${this.profileUserData?.last_name ?? ""}
                                </small>
                            </div>
                            <p class="lead mb-3 fs-6 text-wrap">
                                This is a lead paragraph. It stands out from regular
                                paragraphs. This is a lead paragraph. It stands out from
                                regular paragraphs. This is a lead paragraph. It stands
                                out from regular paragraphs. This is a lead paragraph. It
                                stands out from regular paragraphs.
                            </p>
                        </div>
                    </div>
                    <div class="col-12 ">
                        <div class="h-100 d-flex flex-row align-items-center justify-content-center" >
                            ${this.getActionButtons(this.profileUserData)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `

    renderFundamentalStats = () => html`
        <div class="col-4">
            ${renderCard('', '', renderCardInfo('Rank',  this.profileUserData?.ranking ?? '-' ) )}
        </div>
        <div class="col-8">
            ${renderCard( '', '', renderCardInfo('Member since', humanizedDate(this.profileUserData?.date_joined) ) )}
        </div>
        <div class="col-12">
            ${renderCard( 'Game Stats', 'chart-simple', html`
                <div class="row gx-4">
                    <div class="col-4 border-bottom border-3 border-success-subtle" >
                        ${renderCardInfo( 'Wins', this.profileUserData?.wins ?? '-' )}
                    </div>
                    <div class="col-4 border-bottom border-3">
                        ${renderCardInfo( 'Total', this.profileUserData?.games_played ?? '-' )}
                    </div>
                    <div class="col-4 border-bottom border-3 border-danger-subtle" >
                        ${renderCardInfo( 'Losses', this.profileUserData?.losses ?? '-', )}
                    </div>
                </div>
            `)}
        </div>
    `

    /** @param {APITypes.GameResultItem} data */
    renderGameHistoryItem = (data) => {
        const winnerProfile = data.player_one_score > data.player_two_score ? data.player_one : data.player_two;
        const profileUserIsWinner = winnerProfile.id === this.profileUserData?.id;
        return html`
        <div class="d-flex w-100 px-2 align-items-center justify-content-between border-start border-4
                ${ profileUserIsWinner ? 'border-success-subtle' : 'border-danger-subtle'}"
            >
                ${ avatarLink(data.player_one.id === this.profileUserData?.id ? data.player_two : data.player_one) }
                ${ renderCardInfo('Score', `${data.player_one_score} : ${data.player_two_score}` ) }
                ${ renderCardInfo( 'Date',  new Date(data.date).toLocaleDateString( 'de-DE', { dateStyle: 'short' } ) ) }
            </div>
        `
    }

    renderGameHistory = () =>  html`
        <div class="col-12 pb-3">
            ${renderListCard( 'Match History', 'scroll',
                this.profileUserGameResults?.map( data => rendListItem(this.renderGameHistoryItem(data)) ),
            )}
        </div>
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

    render() {
        return html`
            ${this.profileResponse?.statuscode === 403 ? this.renderBlockedPage() : html`
                ${this.renderProfileHeader()}
                <div class="mt-3 container-fluid text-center">
                    <div class="row">
                        <div class="col-12 col-md-6 mt-3">
                            <div class="row g-3">
                                ${this.renderFundamentalStats()}
                            </div>
                        </div>
                            <div class="row g-3">
                                ${this.renderGameHistory()}
                            </div>
                        </div>
                    </div>
                </div>
        `}
    `;
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
// import { renderAvatar } from '../../components/bootstrap/AvatarComponent.js';
// import { BaseElement, html } from '../../lib_templ/BaseElement.js';
// import { fetcher, sessionService, userAPI } from '../../services/api/API_new.js';
// import router from '../../services/router.js';
// import { ToastNotificationErrorEvent } from '../../components/bootstrap/BsToasts.js';

// export class ProfileView extends BaseElement {
//     constructor() {
//         super(false, false);
//         this.sessionUser = sessionService.subscribe(this, true);
//     }
//     /** @type {APITypes.ApiResponse<APITypes.UserData> | undefined} */
//     profileResponse;
//     /** @type {APITypes.UserData | undefined} */
//     profileUserData;
//     routerParams = {};

//     /**
//      * @param {object} params
//      * @param {boolean} shouldRerender
//      */
//     async handleUrlParams(params, shouldRerender) {
//         this.routerParams = params;

//         // console.log('handle params');
//         // console.log(this.sessionUser.value);
//         // console.log(params);
//         if ((this.sessionUser.value !== undefined && params.pk === undefined)
//             || this.sessionUser.value?.user?.id === params.pk) {
//             this.profileUserData = this.sessionUser.value?.user;
//             if (shouldRerender) super.requestUpdate();
//         }
//         if (params.pk) await this.fetchProfileData(params.pk, shouldRerender);
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
//         await this.handleUrlParams(params, true);
//     }

//     async onRouteChange(route, params, url) {
//         // console.log("onRouteChange, params: ", params);
//         await this.handleUrlParams(params, false);
        
//         super.requestUpdate();
//     }

//     /**
//      * @param {number} userId 
//      * @param {boolean} shouldRerender 
//      */
//     async fetchProfileData(userId, shouldRerender) {
//         try {
//             this.profileResponse = await userAPI.getProfile(userId);
//             this.profileUserData = this.profileResponse.data;
//         } catch (error) {
//             sessionService.handleFetchError(error);
//         }
//         if (shouldRerender) super.requestUpdate();
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

//     render() {
//         // console.log("render profile!!");
//         // if (
//         //     this.#isError &&
//         //     this.#isError.data.message !== 'Blocked: You cannot view this account'
//         // ) {
//         //     this.dispatchEvent(
//         //         new CustomEvent('render-notification', {
//         //             detail: { message: this.#isError.data.message },
//         //             bubbles: true,
//         //         }),
//         //     );
//         //     router.go('/');
//         // }

//         return html`
//       ${this.profileResponse?.statuscode === 403 ?
//                 html`
//           <div class="alert alert-danger" role="alert">
//             <h4 class="alert-heading">${this.profileResponse?.message ?? ""}</h4>
//             <hr />
//             ${this.routerParams.pk ?
//                         actions.unBlockUser(this.routerParams.pk, {
//                             cb: () => {
//                                 // console.log("unblock clicked - redirect to same page");
//                                 this.fetchProfileData(this.routerParams.pk, true);
//                             }
//                         })
//                         : ""}
//           </div>
//         `
//                 : html`
//           <div class="card border-0 rounded-0">
//             <div class="card-body">
//               <div class="row">
//                 <div
//                   class="col-12 col-md-3  d-flex justify-content-center  align-items-center"
//                 >
//                   <avatar-component
//                     status="online"
//                     statusborder
//                     radius="5"
//                     src="${this.profileUserData?.avatar ?? ""}"
//                     size="150"
//                   ></avatar-component>
//                 </div>
//                 <!-- mt-3 col-12 col-md-6 -->
//                 <div class="col text-center text-md-start mt-3 mt-md-0">
//                   <div class="position-relative">
//                     <div class="mb-2">
//                       <h6 class="text-body-secondary">
//                         @${this.profileUserData?.username ?? ""}
//                       </h6>
//                       <h3 class="display-5 m-0">
//                         ${this.profileUserData?.alias ?? ""}
//                       </h3>
//                       <small class="text-body-secondary"
//                         >${this.profileUserData?.first_name ?? ""}
//                         ${this.profileUserData?.last_name ?? ""}</small
//                       >
//                     </div>

//                     <p class="lead mb-3 fs-6 text-wrap">
//                       This is a lead paragraph. It stands out from regular
//                       paragraphs. This is a lead paragraph. It stands out from
//                       regular paragraphs. This is a lead paragraph. It stands
//                       out from regular paragraphs. This is a lead paragraph. It
//                       stands out from regular paragraphs.
//                     </p>
//                   </div>
//                 </div>
//                 <!-- container d-flex justify-content-center px-4 -->
//                 <!-- <div class="col-12 col-md-3 d-flex flex-md-column flex-row justify-content-center align-items-stretch"> -->
//                 <div class="col-12 ">
//                   <div
//                     class="h-100 d-flex flex-row align-items-center justify-content-center"
//                   >
//                     ${this.getActionButtons(
//                     // @ts-ignore
//                     this.profileUserData,
//                 )}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//           <div class="mt-3 container-fluid text-center">
//             <div class="row">
//               <div class="col-12 col-md-6 mt-3">
//                 <div class="row g-3">
//                   <div class="col-4">
//                     ${renderCard(
//                     '',
//                     '',
//                     renderCardInfo(
//                         'Rank',
//                         this.profileUserData?.ranking ?? '-',
//                     ),
//                 )}
//                   </div>
//                   <div class="col-8">
//                     ${renderCard(
//                     '',
//                     '',
//                     renderCardInfo(
//                         'Member since',
//                         new Date(
//                             this.profileUserData?.date_joined ?? "",
//                         ).toLocaleDateString(),
//                     ),
//                 )}
//                   </div>

//                   <div class="col-12">
//                     ${renderCard(
//                     'Game Stats',
//                     'chart-simple',
//                     html`
//                         <div class="row gx-4">
//                           <div
//                             class="col-4 border-bottom border-3 border-success-subtle"
//                           >
//                             ${renderCardInfo(
//                         'Wins',
//                         this.profileUserData?.wins ?? '-',
//                     )}
//                           </div>
//                           <div class="col-4 border-bottom border-3">
//                             ${renderCardInfo(
//                         'Total',
//                         this.profileUserData?.games_played ?? '-',
//                     )}
//                           </div>
//                           <div
//                             class="col-4 border-bottom border-3 border-danger-subtle"
//                           >
//                             ${renderCardInfo(
//                         'Losses',
//                         this.profileUserData?.losses ?? '-',
//                     )}
//                           </div>
//                         </div>
//                       `,
//                 )}
//                   </div>
//                 </div>
//               </div>
//               <div class="col-12 col-md-6 mt-3">
//                 <div class="row g-3">
//                   <div class="col-12 pb-3">
//                     ${renderListCard(
//                     'Match History',
//                     'scroll',
//                     this.dataMatches.map((data) =>
//                         rendListItem(html`
//                           <div
//                             class="d-flex w-100 px-2 align-items-center justify-content-between border-start border-4 ${(
//                                 data.self_points > data.opp_points
//                             ) ?
//                                 'border-success-subtle'
//                                 : 'border-danger-subtle'}"
//                           >
//                             ${avatarLink}
//                             ${renderCardInfo(
//                                     'Score',
//                                     `${data.self_points} : ${data.opp_points}`,
//                                 )}
//                             ${renderCardInfo(
//                                     'Date',
//                                     new Date(data.date).toLocaleDateString('de-DE', {
//                                         dateStyle: 'short',
//                                     }),
//                                 )}
//                           </div>
//                         `),
//                     ),
//                 )}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         `}
//     `;
//     }

//     dataa = new Array(10).fill(0);

//     dataMatches = [
//         {
//             id: '6',
//             avatar: 'https://picsum.photos/200/300?random=1',
//             username: 'peterjo',
//             self_points: '9',
//             opp_points: '2',
//             date: '2021-09-24T12:38:54.656Z',
//         },
//         {
//             id: '7',
//             avatar: 'https://picsum.photos/200/300?random=2',
//             username: 'dedr werber',
//             self_points: '4',
//             opp_points: '7',
//             date: '2021-09-24T12:38:54.656Z',
//         },
//         {
//             id: '8',
//             avatar: 'https://picsum.photos/200/300?random=3',
//             username: 'hayloo',
//             self_points: '9',
//             opp_points: '7',
//             date: '2021-09-24T12:38:54.656Z',
//         },
//         {
//             id: '9',
//             avatar: 'https://picsum.photos/200/300?random=4',
//             username: 'dewdw',
//             self_points: '8',
//             opp_points: '1',
//             date: '2021-09-24T12:38:54.656Z',
//         },
//         {
//             id: '2',
//             avatar: 'https://picsum.photos/200/300?random=5',
//             username: 'petdewh5erjo',
//             self_points: '1',
//             opp_points: '8',
//             date: '2021-09-24T12:38:54.656Z',
//         },
//         {
//             id: '1',
//             avatar: 'https://picsum.photos/200/300?random=6',
//             username: 'giorghinho',
//             self_points: '8',
//             opp_points: '1',
//             date: '2021-09-24T12:38:54.656Z',
//         },
//         {
//             id: '34',
//             avatar: 'https://picsum.photos/200/300?random=8',
//             username: 'xoxoxP',
//             self_points: '3',
//             opp_points: '9',
//             date: '2021-09-24T12:38:54.656Z',
//         },
//         {
//             id: '10',
//             avatar: 'https://picsum.photos/200/300?random=7',
//             username: 'marmelade',
//             self_points: '5',
//             opp_points: '9',
//             date: '2021-09-24T12:38:54.656Z',
//         },
//     ];
// }
// customElements.define('profile-view', ProfileView);
