import { BaseElement, html } from '../../lib_templ/BaseElement.js';
import { renderListCard, rendListItem, renderCardInfo } from '../../components/bootstrap/BsCard.js';

import { actions, actionButtonGroups } from '../../components/ActionButtons.js';
import { renderAvatar, avatarLink } from '../../components/bootstrap/AvatarComponent.js';

import { sessionService } from '../../services/api/API_new.js';

export default class GameWindow extends BaseElement {
    constructor() {
        super(false, false);

        this.sessionUser = sessionService.subscribe(this);
    }

    /** @type {APITypes.GameInvitationItem[]} */
    userInvitations = [
        {
            invite_id: 1,
            id: 6,
            avatar: 'https://picsum.photos/200/300?random=1',
            username: 'peterjo',
            game_id: 0,
            game_mode: '1v1',
            alias: '',
            online: null,
        },
        {
            invite_id: 1,
            id: 7,
            avatar: 'https://picsum.photos/200/300?random=2',
            username: 'dedr werber',
            game_id: 0,
            game_mode: '1v1',
            alias: '',
            online: null,
        },
        {
            invite_id: 1,
            id: 8,
            avatar: 'https://picsum.photos/200/300?random=3',
            username: 'hayloo',
            game_id: 0,
            game_mode: '1v1',
            alias: '',
            online: null,
        },
        {
            invite_id: 1,
            id: 9,
            avatar: 'https://picsum.photos/200/300?random=4',
            username: 'dewdw',
            game_id: 0,
            game_mode: '1v1',
            alias: '',
            online: null,
        },
        {
            invite_id: 1,
            id: 2,
            avatar: 'https://picsum.photos/200/300?random=5',
            username: 'petdewh5erjo',
            game_id: 0,
            game_mode: '1v1',
            alias: '',
            online: null,
        },
        {
            invite_id: 1,
            id: 1,
            avatar: 'https://picsum.photos/200/300?random=6',
            username: 'giorghinho',
            game_id: 0,
            game_mode: '1v1',
            alias: '',
            online: null,
        },
        {
            invite_id: 1,
            id: 10,
            avatar: 'https://picsum.photos/200/300?random=7',
            username: 'marmelade',
            game_id: 0,
            game_mode: '1v1',
            alias: '',
            online: null,
        },
        {
            invite_id: 1,
            id: 34,
            avatar: 'https://picsum.photos/200/300?random=8',
            username: 'xoxoxP',
            game_id: 0,
            game_mode: '1v1',
            alias: '',
            online: true,
        },
    ];

    render() {
        /** @type {APITypes.UserData | undefined} */
        const userData = this.sessionUser.value?.user;
        const gameInvitationsReceived = this.userInvitations;
        const gameInvitationsSent = this.sessionUser.value?.game_invitations_sent;
        const gameSchedule = this.sessionUser.value?.game_schedule;
        console.log('render GAME window, invitations sent: ', gameInvitationsSent);

        return html`
            <div class="mt-3 container-fluid text-center">
                <div class="row g-3">
                    <div class="col-12">
                        ${renderListCard(
                            'Invitations Received',
                            'scroll',
                            !gameInvitationsReceived || gameInvitationsReceived.length === 0 ?
                                rendListItem(html`<p class="text-center m-0">No Invitations received</p>`)
                            :   gameInvitationsReceived.map((data) =>
                                    rendListItem(html`
                                        <div class="col-6 col-sm-4 text-center">
                                            ${avatarLink(data)}
                                        </div>
                                        <div class="col-3 col-sm-2 text-center">
                                            ${renderCardInfo('Game', data.game_id === 0 ? 'pong' : 'other')}
                                        </div>
                                        <div class="col-3 col-sm-2 text-center">
                                            ${renderCardInfo('Mode', data.game_mode)}
                                        </div>
                                        <div class="col-12 col-sm-auto text-end mt-2 mt-sm-0">
                                            <div class="row">
                                                <div class="col-6 col-sm-auto">
                                                    ${actions.acceptGameInvitation(data.invite_id, { showText: false, stretch: true })}
                                                </div>
                                                <div class="col-6 col-sm-auto">
                                                    ${actions.rejectGameInvitation(data.invite_id, { showText: false, stretch: true })}
                                                </div>
                                            </div>
                                        </div>
                                    `),
                                ),
                        )}
                    </div>
                    <div class="col-12">
                        ${renderListCard(
                            'Invitations Sent',
                            'scroll',
                            !gameInvitationsSent || gameInvitationsSent.length === 0 ?
                                rendListItem(html`<p class="text-center m-0">No Invitations sent</p>`)
                            :   gameInvitationsSent.map((data) =>
                                    rendListItem(html`
                                        <div class="col-6 col-sm-4 text-center">
                                            ${avatarLink(data)}
                                        </div>
                                        <div class="col-3 col-sm-2 text-center">
                                            ${renderCardInfo('Game', data.game_id === 0 ? 'pong' : 'other')}
                                        </div>
                                        <div class="col-3 col-sm-2 text-center">
                                            ${renderCardInfo('Mode', data.game_mode)}
                                        </div>
                                        <div class="col-12 col-sm-auto text-end mt-2 mt-sm-0">
                                            <div class="row">
                                                <div class="col-12 col-sm-auto">
                                                    ${actions.cancelGameInvitation(data.invite_id, { showText: false, stretch: true })}
                                                </div>
                                               
                                            </div>
                                        </div>
                                    `),
                                ),
                        )}
                    </div>
                    <div class="col-12">
                        ${renderListCard(
                            'New Matches',
                            'gamepad',
                            !gameSchedule || gameSchedule.length === 0 ?
                                rendListItem(html`<p class="text-center m-0">No Invitations received</p>`)
                            :   gameSchedule.map((data) =>
                                    rendListItem(html`
                                        <div class="col-12 col-md-6  text-sm-start d-flex justify-content-center align-items-center">
                                            ${avatarLink(data.player_one)}
                                            ${renderCardInfo('VS', '')}
                                            ${avatarLink(data.player_two)}
                                        </div>
                                        <div class="col-3 col-md-2">${renderCardInfo('Game', 'pong')}</div>
                                        <div class="col-3 col-md-2">${renderCardInfo('Mode', '1v1')}</div>
                                        <div class="col-6 col-sm-auto text-end mt-2 mt-sm-0">
                                            <button
                                                type="button"
                                                class="btn btn-outline-primary"
                                                data-bs-toggle="modal"
                                                data-bs-target="#gameModal-id"
                                                @click=${() => {
                                                    this.selectedGame = data;
                                                    super.requestUpdate();
                                                }}
                                            >
                                                <i class="fa-solid fa-gamepad"></i>
                                                start Match
                                            </button>
                                        </div>
                                    `),
                                ),
                        )}
                    </div>
                </div>
                <game-modaln id="gameModal" .game_data=${this.selectedGame}></game-modaln>
            </div>
        `;
    }
}
customElements.define('game-window', GameWindow);

// export class GameWindow extends BaseElem {
//     constructor() {
//         super(false, false);

//         this.sessionUser = sessionService.subscribe(this);
//     }

//     userInvitations = [
//         {invite_id: 1, id: "6", avatar: "https://picsum.photos/200/300?random=1", username: "peterjo", game: "pong", mode: "1v1"},
//         {invite_id: 1, id: "7", avatar: "https://picsum.photos/200/300?random=2", username: "dedr werber", game: "pong", mode: "1v1"},
//         {invite_id: 1, id: "8", avatar: "https://picsum.photos/200/300?random=3", username: "hayloo", game: "pong", mode: "1v1"},
//         {invite_id: 1, id: "9", avatar: "https://picsum.photos/200/300?random=4", username: "dewdw", game: "pong", mode: "1v1"},
//         {invite_id: 1, id: "2", avatar: "https://picsum.photos/200/300?random=5", username: "petdewh5erjo", game: "pong", mode: "1v1"},
//         {invite_id: 1, id: "1", avatar: "https://picsum.photos/200/300?random=6", username: "giorghinho", game: "pong", mode: "1v1"},
//         {invite_id: 1, id: "10", avatar: "https://picsum.photos/200/300?random=7", username: "marmelade", game: "pong", mode: "1v1"},
//         {invite_id: 1, id: "34", avatar: "https://picsum.photos/200/300?random=8", username: "xoxoxP", game: "pong", mode: "1v1"},
//     ]

// //<div class="col-12 col-sm-auto text-end align-self-stretch">${actions.receivedGameInvitations(data.invite_id, false)}</div>
//     render() {
//          /** @type {import('../../services/types.js').UserData} */
//         const userData = this.sessionUser.value;
//         const gameInvitationsReceived = userData.gameInvitationsReceived;
//         const gameInvitationsSent = userData.gameInvitationsSent;
//         const gameSchedule = userData.gameSchedule;

//         return html`
//         <div class="mt-3 container-fluid text-center">
//             <div class="row g-3">
//                 <div class="col-12">
//                     ${renderListCard("Invitations Received", "scroll",
//                         this.userInvitations.map(data=>rendListItem(html`
//                             ${renderAvatar(data.id, data.username, data.avatar, "", "after", "col-6 col-sm-4 text-center ")}
//                             <div class="col-3 col-sm-2 text-center">${renderCardInfo("Game", data.game)}</div>
//                             <div class="col-3 col-sm-2 text-center">${renderCardInfo("Mode", data.mode)}</div>
//                             <div class="col-12 col-sm-auto text-end mt-2 mt-sm-0">
//                                 <div class="row">
//                                     <div class="col-6 col-sm-auto">
//                                         ${actions.acceptGameInvitation(data.invite_id, {showText: false, stretch: true})}
//                                     </div>
//                                     <div class="col-6 col-sm-auto">
//                                         ${actions.rejectGameInvitation(data.invite_id, {showText: false, stretch: true})}
//                                     </div>
//                                 </div>
//                             </div>
//                         `))
//                     )}
//                 </div>
//                 <div class="col-12">
//                     ${renderListCard("Invitations Sent", "scroll",
//                         (!gameInvitationsSent || gameInvitationsSent.length === 0) ?
//                         rendListItem(html`<p class="text-center m-0">No Invitations sent</p>`) :
//                         gameInvitationsSent.map(data=>rendListItem(html`
//                             ${renderAvatar(data.id, data.username, data.avatar, "", "after", "col-6")}
//                             <div class="col-3 text-center">
//                                 ${renderCardInfo("Game", "pong")}
//                             </div>
//                             <div class="col-3 text-center">
//                                 ${renderCardInfo("Mode", "1v1")}
//                             </div>
//                             <div class="col-3">
//                                 ${actions.cancelGameInvitation(data.invite_id, {})}
//                             </div>
//                         `))
//                     )}
//                 </div>
//                 <div class="col-12">
//                     ${renderListCard("New Matches", "gamepad",
//                         gameSchedule.map(data=>rendListItem(html`
//                             <div class="col-12 col-md-6  text-sm-start d-flex justify-content-center align-items-center">
//                                 ${renderAvatar(data.player_one.id, data.player_one.username, data.player_one.avatar, "", "before")}
//                                 ${renderCardInfo("VS", "")}
//                                 ${renderAvatar(data.player_two.id, data.player_two.username, data.player_two.avatar, "", "after")}
//                             </div>
//                             <div class="col-3 col-md-2">
//                                 ${renderCardInfo("Game", "pong")}
//                             </div>
//                             <div class="col-3 col-md-2">
//                                 ${renderCardInfo("Mode", "1v1")}
//                             </div>
//                             <div class="col-6 col-sm-auto text-end mt-2 mt-sm-0">
//                                 <button
//                                     type="button" class="btn btn-outline-primary" data-bs-toggle="modal" data-bs-target="#gameModal"
//                                     @click=${(e)=>{this.slectedGame = data; super.requestUpdate()}} >
//                                     <i class="fa-solid fa-gamepad"></i>
//                                     start Match
//                                 </button>

//                             </div>
//                         `))
//                     )}
//                 </div>
//             </div>
//         </div>
//         <div
//                 @hide.bs.modal=${(ev)=>{this._modalIsOpen = false; super.requestUpdate()}}
//                 @shown.bs.modal=${(ev)=>{this._modalIsOpen = true; super.requestUpdate()}}
//                 class="modal fade" id="gameModal" tabindex="-1" aria-labelledby="gameModal-label" aria-hidden="true" data-bs-keyboard="false">
//                 <div class="modal-dialog modal-fullscreen">
//                     <div class="modal-content">
//                     <div class="modal-header">
//                         <h1 class="modal-title fs-5" id="gameModal-label">
//                             Match:
//                         </h1>
//                         <div class="w-100 d-flex align-items-center justify-content-evenly">
//                             <div class="d-flex align-items-center p-1 border border-2 border-success rounded-3" @click=${(ev)=>{ev.stopPropagation(); ev.preventDefault()}}>
//                                 ${renderAvatar(this.slectedGame?.player_one.id, this.slectedGame?.player_one.username, this.slectedGame?.player_one.avatar, "", "before", "")}
//                                 <span class="fs-1 px-3">4</span>
//                             </div>
//                             <p class="p-2 m-0 fs-3 text-body-emphasis">
//                                 VS
//                             </p>
//                             <div class="d-flex align-items-center p-1 border border-2 border-danger rounded-3" @click=${(ev)=>{ev.stopPropagation(); ev.preventDefault()}}>
//                                 <span class="fs-1 px-3">4</span>
//                                 ${renderAvatar(this.slectedGame?.player_two.id, this.slectedGame?.player_two.username, this.slectedGame?.player_two.avatar, "", "after", "")}
//                             </div>
//                         </div>

//                         <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
//                     </div>
//                     <div class="modal-body">
//                         ${this._modalIsOpen ? html`<pong-maingame></pong-maingame>` : ""}
//                     </div>
//                         <div class="modal-footer">
//                             <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
//                             <button type="button" class="btn btn-primary">Save changes</button>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//         `
//     }
// }
// customElements.define("game-window", GameWindow);

// export class GameWindow extends BaseElem {
//     constructor() {
//         super(false, false);

//         this.sessionUser = sessionService.subscribe(this);
//     }

//     userInvitations = [
//         {id: "6", atavar: "https://picsum.photos/200/300?random=1", username: "peterjo", game: "pong", mode: "1v1"},
//         {id: "7", atavar: "https://picsum.photos/200/300?random=2", username: "dedr werber", game: "pong", mode: "1v1"},
//         {id: "8", atavar: "https://picsum.photos/200/300?random=3", username: "hayloo", game: "pong", mode: "1v1"},
//         {id: "9", atavar: "https://picsum.photos/200/300?random=4", username: "dewdw", game: "pong", mode: "1v1"},
//         {id: "2", atavar: "https://picsum.photos/200/300?random=5", username: "petdewh5erjo", game: "pong", mode: "1v1"},
//         {id: "1", atavar: "https://picsum.photos/200/300?random=6", username: "giorghinho", game: "pong", mode: "1v1"},
//         {id: "10", atavar: "https://picsum.photos/200/300?random=7", username: "marmelade", game: "pong", mode: "1v1"},
//         {id: "34", atavar: "https://picsum.photos/200/300?random=8", username: "xoxoxP", game: "pong", mode: "1v1"},
//     ]

//     /** @param {import('../../services/types.js').GameInvitations} invitation */
//     renderInvitations = (invitation, received) => html`
//         <li class="list-group-item p-2 text-body-secondary fs-6">
//             <div class="w-100 row text-center align-items-center" >
//                 <div class="col-3 d-block p-0 m-2">
//                     <a class="pw-3 m-0 link-body-emphasis link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" href="/profile/${invitation.id}">
//                         <avatar-component radius="3" src="${invitation.avatar}" size="40">
//                             <span class="m-2 text-truncate" slot="after">${invitation.username}</span>
//                         </avatar-component>
//                     </a>
//                 </div>
//                 <p class="m-0 col-2 p-0">
//                     GAME <br>
//                     <span class="text-body">PONG</span>
//                 </p>
//                 <p class="m-0 col-2 p-0">
//                     MODE <br>
//                     <span class="text-body">1v1</span>
//                 </p>
//                 ${!received ? "" : html`
//                     <div class="col-4 text-end p-0">
//                         <button @click=${(e)=>{
//                             try {
//                                 sessionService.acceptGameInvitation(invitation.invite_id);
//                             } catch (error) {
//                                 console.log("error cancelling request");
//                             }
//                         }} class="btn btn-outline-success rounded-5 me-2"  ><i class="fa-solid fa-check"></i></button>
//                         <button @click=${(e)=>{
//                             try {
//                                 sessionService.rejectGameInvitation(invitation.invite_id);
//                             } catch (error) {
//                                 console.log("error cancelling request");
//                             }
//                         }} class="btn btn-outline-danger rounded-5"  ><i class="fa-solid fa-xmark"></i></button>

//                     </div>
//                 `}
//             </div>
//         </li>
//     `
//     /** @param {import('../../services/types.js').GameScheduleItem} scheduleItem */
//     renderGameScheduleItem = (scheduleItem) => html`
//         <li class="list-group-item p-2 text-body-secondary fs-6">
//             <div class="w-100 row text-center align-items-center" >
//                 <div class="col-5 p-0">
//                     <a class="pw-3 m-0 link-body-emphasis link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" href="/profile/${scheduleItem.player_one.id}">
//                         <avatar-component radius="3" src="${scheduleItem.player_one.avatar}" size="40">
//                             <span class="m-2 text-truncate" slot="after">${scheduleItem.player_one.username}</span>
//                         </avatar-component>
//                     </a>
//                 </div>
//                 <bs-button class="col-2" ._async_handler=${async ()=>{
//                     await sessionService.startGameByScheduleId(scheduleItem.schedule_id);
//                     await sessionService.refetchSessionUserData();
//                     super.requestUpdate();

//                 }} color="warning" radius="5" loadingtext="start match...">VS</bs-button>
//                 <div class="col-5 p-0">
//                     <a class="pw-3 m-0 link-body-emphasis link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" href="/profile/${scheduleItem.player_two.id}">
//                         <avatar-component radius="3" src="${scheduleItem.player_two.avatar}" size="40">
//                             <span class="m-2 text-truncate" slot="after">${scheduleItem.player_two.username}</span>
//                         </avatar-component>
//                     </a>
//                 </div>

//             </div>
//         </li>
//     `

//     render() {
//          /** @type {import('../../services/types.js').UserData} */
//         const userData = this.sessionUser.value;
//         const gameInvitationsReceived = userData.gameInvitationsReceived;
//         const gameInvitationsSent = userData.gameInvitationsSent;
//         const gameSchedule = userData.gameSchedule;

//         return html`
//         <div class="mt-3 container-fluid text-center">
//             <div class="row g-3">
//                 <div class="col-12">
//                     <div class="card border-0 m-0 ">
//                         <div class="card-header border-0 m-0">
//                             <h6 class="m-0"><i class="fa-solid fa-scroll m-2"></i>Invitations Received</h6>
//                         </div>
//                         <div class="card-body">
//                             <ul class="list-group list-group-flush">
//                                 ${gameInvitationsReceived.map(data=>this.renderInvitations(data, true))}
//                             </ul>
//                         </div>
//                     </div>
//                 </div>
//                 <div class="col-12">
//                     <div class="card border-0 m-0 ">
//                         <div class="card-header border-0 m-0">
//                             <h6 class="m-0"><i class="fa-solid fa-scroll m-2"></i>Invitations Sent</h6>
//                         </div>
//                         <div class="card-body">
//                             <ul class="list-group list-group-flush">
//                                 ${gameInvitationsSent.map(data=>this.renderInvitations(data, false))}
//                             </ul>
//                         </div>
//                     </div>
//                 </div>
//                 <div class="col-12">
//                     <div class="card border-0 m-0 ">
//                         <div class="card-header border-0 m-0">
//                             <h6 class="m-0"><i class="fa-solid fa-scroll m-2"></i>Invitations Sent</h6>
//                         </div>
//                         <div class="card-body">
//                             <ul class="list-group list-group-flush">
//                                 ${gameSchedule.map(data=>this.renderGameScheduleItem(data))}
//                             </ul>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//         <pong-maingame></pong-maingame>
//         `
//     }
// }
// customElements.define("game-window", GameWindow);
