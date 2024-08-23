import { renderCardInfo } from '../../../components/bootstrap/BsCard';
import { BaseElement, html } from '../../../lib_templ/BaseElement';
import { gameAPI, sessionService } from '../../../services/api/API_new';

export class TournamentListView extends BaseElement {
    static observedAttributes = [];
    constructor() {
        super();
        this.session = sessionService.subscribe(this);
        this.boundCb = this.renderTournamentList.bind(this);
    }

    async fetchAllTournaments() {
        this.allTournaments = await sessionService.fetchAndNotifyOnUnsuccess(gameAPI.getTournaments(true));
        super.requestUpdate();
    }

    onBeforeMount() {
        this.fetchAllTournaments();
    }


    /**
     * @param {APITypes.TournamentItem} tournament 
     * @param {number} i 
     * @returns 
     */
    renderTournamentList = (tournament, i) => {
        return html`
        <a href="/games/${tournament.game_id.toLowerCase()}/tournament/${tournament.id}">
            <div class="d-flex p-3">
                <div class="col" >${renderCardInfo('Name', tournament.name)}</div>
                <div class="col" >${renderCardInfo('Game', tournament.game_id)}</div>
                <div class="col" >${renderCardInfo('Status', tournament.status)}</div>
            </div>

        </a>
        `
    }

    render() {
        return html`
            <div>
                <list-card
                    title="Your Tournaments"
                    .items=${this.session.value?.tournaments}
                    .rendercb=${this.boundCb}
                ></list-card>
            </div>
            <div>
                <list-card
                    title="All Tournaments"
                    .items=${this.allTournaments}
                    .rendercb=${this.boundCb}
                ></list-card>
            </div>
        `
    }
}
customElements.define("tournament-list-view", TournamentListView);