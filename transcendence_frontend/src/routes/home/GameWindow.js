import { BaseElement, html } from '../../lib_templ/BaseElement.js';
import { renderListCard, rendListItem, renderCardInfo, rendListItemAnchor } from '../../components/bootstrap/BsCard.js';

import { actions, actionButtonGroups } from '../../components/ActionButtons.js';
import { avatarLink } from '../../components/bootstrap/AvatarComponent.js';

import { sessionService } from '../../services/api/API_new.js';

export default class GameWindow extends BaseElement {
    constructor() {
        super(false, false);

        this.sessionUser = sessionService.subscribe(this);
    }
   
    render() {
        /** @type {APITypes.UserData | undefined} */
        const userData = this.sessionUser.value?.user;
        const gameInvitationsReceived = this.sessionUser.value?.game_invitations_received;
        const gameInvitationsSent = this.sessionUser.value?.game_invitations_sent;
        const gameSchedule = this.sessionUser.value?.game_schedule;
        // console.log('game schedule: ', gameSchedule);
        // console.log('render GAME window, invitations sent: ', gameInvitationsSent);

        return html`
            <div class="mt-3 container-fluid text-center">
                <a class="btn btn-primary mb-2 w-100" href="/games/pong/tournament/create" role="button">
                    <i class="fa-solid fa-gamepad"></i>
                    Create a Tournament
                </a>
                <div class="row g-3 pb-3">
                    <div class="col-12">
                        ${renderListCard(
                            'Invitations Received',
                            'scroll',
                            !gameInvitationsReceived || gameInvitationsReceived.length === 0 ?
                                rendListItem(html`<p class="text-center m-0">No Invitations received</p>`)
                            :   gameInvitationsReceived.map((data) =>
                                    rendListItem(
                                        html`
                                            <div class="col-6 col-sm-4 text-center">
                                                ${avatarLink(data)}
                                            </div>
                                            <div class="col-3 col-sm-2 text-center">
                                                ${renderCardInfo('Game', data.game_id)}
                                            </div>
                                            <div class="col-3 col-sm-2 text-center">
                                                ${renderCardInfo('Mode', data.game_mode)}
                                            </div>
                                            <div class="col-12 col-sm-auto text-end mt-2 mt-sm-0">
                                                <div class="row">
                                                    <div class="col-6 col-sm-auto">
                                                        ${actions.acceptGameInvitation(data.invite_id, { host: this, showText: false, stretch: true })}
                                                    </div>
                                                    <div class="col-6 col-sm-auto">
                                                        ${actions.rejectGameInvitation(data.invite_id, { host: this, showText: false, stretch: true })}
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
                                            ${renderCardInfo('Game', data.game_id)}
                                        </div>
                                        <div class="col-3 col-sm-2 text-center">
                                            ${renderCardInfo('Mode', data.game_mode)}
                                        </div>
                                        <div class="col-12 col-sm-auto text-end mt-2 mt-sm-0">
                                            <div class="row">
                                                <div class="col-12 col-sm-auto">
                                                    ${actions.cancelGameInvitation(data.invite_id, { host: this, showText: false, stretch: true })}
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
                                            ${actions.pushRandomGameResult(data.schedule_id, {host: this})}
                                          
                                            
                                        </div>
                                    `),
                                ),
                        )}

                    </div>
                </div>
                
            </div>
        `;
    }
}
customElements.define('game-window', GameWindow);

// <!-- <a href="/games/pong/play/${data.schedule_id}" role="button" class="btn btn-outline-primary">
// <i class="fa-solid fa-gamepad"></i>
// start Match
// </a> -->

// export default class GameWindow extends BaseElement {
//     constructor() {
//         super(false, false);

//         this.sessionUser = sessionService.subscribe(this);
//     }

//     /** @type {APITypes.GameInvitationItem[]} */
//     userInvitations = [
//         {
//             invite_id: 1,
//             id: 6,
//             avatar: 'https://picsum.photos/200/300?random=1',
//             username: 'peterjo',
//             game_id: 0,
//             game_mode: '1v1',
//             alias: '',
//             online: null,
//         },
//         {
//             invite_id: 1,
//             id: 7,
//             avatar: 'https://picsum.photos/200/300?random=2',
//             username: 'dedr werber',
//             game_id: 0,
//             game_mode: '1v1',
//             alias: '',
//             online: null,
//         },
//         {
//             invite_id: 1,
//             id: 8,
//             avatar: 'https://picsum.photos/200/300?random=3',
//             username: 'hayloo',
//             game_id: 0,
//             game_mode: '1v1',
//             alias: '',
//             online: null,
//         },
//         {
//             invite_id: 1,
//             id: 9,
//             avatar: 'https://picsum.photos/200/300?random=4',
//             username: 'dewdw',
//             game_id: 0,
//             game_mode: '1v1',
//             alias: '',
//             online: null,
//         },
//         {
//             invite_id: 1,
//             id: 2,
//             avatar: 'https://picsum.photos/200/300?random=5',
//             username: 'petdewh5erjo',
//             game_id: 0,
//             game_mode: '1v1',
//             alias: '',
//             online: null,
//         },
//         {
//             invite_id: 1,
//             id: 1,
//             avatar: 'https://picsum.photos/200/300?random=6',
//             username: 'giorghinho',
//             game_id: 0,
//             game_mode: '1v1',
//             alias: '',
//             online: null,
//         },
//         {
//             invite_id: 1,
//             id: 10,
//             avatar: 'https://picsum.photos/200/300?random=7',
//             username: 'marmelade',
//             game_id: 0,
//             game_mode: '1v1',
//             alias: '',
//             online: null,
//         },
//         {
//             invite_id: 1,
//             id: 34,
//             avatar: 'https://picsum.photos/200/300?random=8',
//             username: 'xoxoxP',
//             game_id: 0,
//             game_mode: '1v1',
//             alias: '',
//             online: true,
//         },
//     ];

//     render() {
//         /** @type {APITypes.UserData | undefined} */
//         const userData = this.sessionUser.value?.user;
//         const gameInvitationsReceived = this.userInvitations;
//         const gameInvitationsSent = this.sessionUser.value?.game_invitations_sent;
//         const gameSchedule = this.sessionUser.value?.game_schedule;
//         console.log('render GAME window, invitations sent: ', gameInvitationsSent);

//         return html`
//             <div class="mt-3 container-fluid text-center">
//                 <div class="row g-3 pb-3">
//                     <div class="col-12">
//                         ${renderListCard(
//                             'Invitations Received',
//                             'scroll',
//                             !gameInvitationsReceived || gameInvitationsReceived.length === 0 ?
//                                 rendListItem(html`<p class="text-center m-0">No Invitations received</p>`)
//                             :   gameInvitationsReceived.map((data) =>
//                                     rendListItem(html`
//                                         <div class="col-6 col-sm-4 text-center">
//                                             ${avatarLink(data)}
//                                         </div>
//                                         <div class="col-3 col-sm-2 text-center">
//                                             ${renderCardInfo('Game', data.game_id === 0 ? 'pong' : 'other')}
//                                         </div>
//                                         <div class="col-3 col-sm-2 text-center">
//                                             ${renderCardInfo('Mode', data.game_mode)}
//                                         </div>
//                                         <div class="col-12 col-sm-auto text-end mt-2 mt-sm-0">
//                                             <div class="row">
//                                                 <div class="col-6 col-sm-auto">
//                                                     ${actions.acceptGameInvitation(data.invite_id, { showText: false, stretch: true })}
//                                                 </div>
//                                                 <div class="col-6 col-sm-auto">
//                                                     ${actions.rejectGameInvitation(data.invite_id, { showText: false, stretch: true })}
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     `),
//                                 ),
//                         )}
//                     </div>
//                     <div class="col-12">
//                         ${renderListCard(
//                             'Invitations Sent',
//                             'scroll',
//                             !gameInvitationsSent || gameInvitationsSent.length === 0 ?
//                                 rendListItem(html`<p class="text-center m-0">No Invitations sent</p>`)
//                             :   gameInvitationsSent.map((data) =>
//                                     rendListItem(html`
//                                         <div class="col-6 col-sm-4 text-center">
//                                             ${avatarLink(data)}
//                                         </div>
//                                         <div class="col-3 col-sm-2 text-center">
//                                             ${renderCardInfo('Game', data.game_id === 0 ? 'pong' : 'other')}
//                                         </div>
//                                         <div class="col-3 col-sm-2 text-center">
//                                             ${renderCardInfo('Mode', data.game_mode)}
//                                         </div>
//                                         <div class="col-12 col-sm-auto text-end mt-2 mt-sm-0">
//                                             <div class="row">
//                                                 <div class="col-12 col-sm-auto">
//                                                     ${actions.cancelGameInvitation(data.invite_id, { showText: false, stretch: true })}
//                                                 </div>
                                               
//                                             </div>
//                                         </div>
//                                     `),
//                                 ),
//                         )}
//                     </div>
//                     <div class="col-12">
//                         ${renderListCard(
//                             'New Matches',
//                             'gamepad',
//                             !gameSchedule || gameSchedule.length === 0 ?
//                                 rendListItem(html`<p class="text-center m-0">No Invitations received</p>`)
//                             :   gameSchedule.map((data) =>
//                                     rendListItem(html`
//                                         <div class="col-12 col-md-6  text-sm-start d-flex justify-content-center align-items-center">
//                                             ${avatarLink(data.player_one)}
//                                             ${renderCardInfo('VS', '')}
//                                             ${avatarLink(data.player_two)}
//                                         </div>
//                                         <div class="col-3 col-md-2">${renderCardInfo('Game', 'pong')}</div>
//                                         <div class="col-3 col-md-2">${renderCardInfo('Mode', '1v1')}</div>
//                                         <div class="col-6 col-sm-auto text-end mt-2 mt-sm-0">
//                                             <button
//                                                 type="button"
//                                                 class="btn btn-outline-primary"
//                                                 data-bs-toggle="modal"
//                                                 data-bs-target="#gameModal-id"
//                                                 @click=${() => {
//                                                     this.selectedGame = data;
//                                                     super.requestUpdate();
//                                                 }}
//                                             >
//                                                 <i class="fa-solid fa-gamepad"></i>
//                                                 start Match
//                                             </button>
//                                         </div>
//                                     `),
//                                 ),
//                         )}
//                     </div>
//                 </div>
//                 <game-modaln id="gameModal" .game_data=${this.selectedGame}></game-modaln>
//             </div>
//         `;
//     }
// }
// customElements.define('game-window', GameWindow);
