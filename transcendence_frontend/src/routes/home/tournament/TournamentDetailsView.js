/* eslint-disable max-classes-per-file */


import { actions, actionButtonDropdowns, actionButtonGroups } from '../../../components/ActionButtons.js';
import {
    rendListItem,
    renderCard,
    renderCardInfo,
    renderListCard,
} from '../../../components/bootstrap/BsCard.js';
import { avatarInfo, avatarLink } from '../../../components/bootstrap/AvatarComponent.js';
import { BaseElement, html } from '../../../lib_templ/BaseElement.js';
import { fetcher, gameAPI, sessionService, userAPI } from '../../../services/api/API_new.js';
import router from '../../../services/router.js';
import { ToastNotificationErrorEvent } from '../../../components/bootstrap/BsToasts.js';

export class TournamentDetailsView extends BaseElement {
    constructor() {
        super(false, false);
        this.sessionUser = sessionService.subscribe(this, true);
    }
    /** @type {APITypes.ApiResponse<APITypes.TournamentData> | undefined} */
    tournamentResponse;
    /** @type {APITypes.TournamentData | undefined} */
    tournamentData;
    routerParams = {};

    /**
     * @param {string} route
     * @param {object} params
     * @param {URL} url
     * @returns {Promise<symbol | void>}
     */
    async onBeforeMount(route, params, url) {
        console.log('tournament details view - params: ', params);
        if (!sessionService.isLoggedIn) {
            return router.redirect('/');
        }
        if (params.game !== "pong") {
            document.dispatchEvent( new ToastNotificationErrorEvent("unknown game") );
            return router.redirect('/');
        }
        const tournamentId = Number(params.tournament_id)
        if (params.tournament_id == undefined || isNaN(tournamentId)) {
            document.dispatchEvent( new ToastNotificationErrorEvent("Tournnament not found") );
            return router.redirect('/');
        }
        if ((await this.fetchTournamentData(tournamentId)) === false) {
            return router.redirect('/');
        }
    }

    async onRouteChange(route, params, url) {
        const tournamentId = Number(params.tournament_id)
        if (params.game !== "pong") {
            document.dispatchEvent( new ToastNotificationErrorEvent("unknown game") );
        } else if (params.tournament_id == undefined || isNaN(tournamentId)) {
            document.dispatchEvent( new ToastNotificationErrorEvent("Tournnament not found") );
        } else {
            if ((await this.fetchTournamentData(tournamentId)) === true) {
                super.requestUpdate();
            }
        }
    }

    /**
     * @param {number} tournamentId 
     */
    async fetchTournamentData(tournamentId) {
        try {
            console.log('fetch tournament data: ', tournamentId);
            this.tournamentResponse = await gameAPI.getTournamentDetails(tournamentId);
            console.log('response: ', this.tournamentResponse);
            if (!this.tournamentResponse.success) {
                document.dispatchEvent( new ToastNotificationErrorEvent(this.tournamentResponse.message) );
                return false;
            }
            
            this.tournamentData = this.tournamentResponse.data;
            return true;
        } catch (error) {
            sessionService.handleFetchError(error);
            return false;
        }
    }

    /**
     * 
     * @param {string} title 
     * @param {string} titleIcon 
     * @param {APITypes.GameScheduleItem[]} [list] 
     * @returns 
     */
    renderGameScheduleList = (title, titleIcon, list) => html`
        <div class="col-12">
            ${renderListCard(
                title,
                titleIcon,
                !list || list.length === 0 ?
                    rendListItem(html`<p class="text-center m-0">No data</p>`)
                :   list.map((data) =>
                        rendListItem(html`
                            <div class="col-5 col-sm-2 pe-0 col-md-2">
                                ${avatarInfo(data.player_one)}
                            </div>
                            <div class="col-2 col-sm-1">
                                ${renderCardInfo('VS', '')}
                            </div>
                            <div class="col-5  col-sm-2  ps-0 col-md-2">
                                ${avatarInfo(data.player_two)}
                            </div>
                           
                            <div class="col-auto">${renderCardInfo('Game', 'pong')}</div>
                            <div class="col-auto">${renderCardInfo('Mode', '1v1')}</div>
                            <div class="col-auto">
                                ${actions.pushRandomGameResult(data.schedule_id)}
                            </div>
                        `),
                    ),
            )}
        </div>
    `


    render() {
        const myTournamentGames = this.sessionUser.value?.game_schedule?.filter(i => i.tournament === this.tournamentData?.id) ?? []
        return html`
            <h1>${this.tournamentData?.name}</h1>
            <div class="list-group">
                <h2>Players</h2>
                ${this.tournamentData?.players.map((data, i) => html`
                    <div class="list-group-item flex-shrink-1">
                        ${avatarLink(data)}
                    </div>    
                `)}
            </div>
            ${this.renderGameScheduleList("Your Games", "", myTournamentGames)}
            <div class="d-flex flex-column">
                <h2>${this.tournamentData?.mode} | ${this.tournamentData?.stage}</h2>
                ${this.tournamentData?.schedules?.map((data, i) => html`
                    <div class="card" style="width: 18rem;">
                        <ul class="list-group list-group-flush">
                            <li class="list-group-item">${avatarInfo(data.player_one)}</li>
                            <li class="list-group-item">${avatarInfo(data.player_two)}</li>
                        </ul>
                    </div>
                   
                `)}
            </div>
        `
    }

}
customElements.define('tournament-details-view', TournamentDetailsView);