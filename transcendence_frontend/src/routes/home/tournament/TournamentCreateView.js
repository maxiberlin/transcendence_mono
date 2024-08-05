import { actionButtonDropdowns } from '../../../components/ActionButtons.js';
import { avatarLink } from '../../../components/bootstrap/AvatarComponent.js';
import { ToastNotificationErrorEvent } from '../../../components/bootstrap/BsToasts.js';
import { BaseElement, html, BaseBase } from '../../../lib_templ/BaseElement.js';
import { sessionService } from '../../../services/api/API_new.js';
import router from '../../../services/router.js';
import { SelectedSearchResult } from '../../social/ProfileSearch.js';

/**
 * @typedef {object} ListGroupProps
 * @property {import('../../../lib_templ/BaseBase.js').Tpl[]} [listitems]
 * 
 * @typedef {ListGroupProps & import('../../../lib_templ/BaseBase.js').BaseBaseProps} LIPROPS
 * @typedef {keyof LIPROPS} LIKEYS
 */


/**
 * @prop listitems
 * 
 * @extends BaseElement<LIPROPS>
 */
export class ListGroup extends BaseElement {
    constructor() {
        super(false, false);

        this.props.listitems;
    }

    /**
     * @template {LIKEYS} T
     * @param {T} key 
     * @param {LIPROPS[T]} value 
     */
    onPropChange(key, value) {
        if (key === "listitems" && value instanceof Array) {
            const checkStrings = () => {}
            this.props.listitems?.forEach((v, i) => {
                if (v.strings === value[i].strings) {
                    console.log('strings: at index: ', i, ": same");
                } else {
                    console.log('string: at index: ', i, ": NOT SAME");
                }
                if (v.values === value[i].values) {
                    console.log('values: at index: ', i, ": same");
                } else {
                    console.log('values: at index: ', i, ": NOT SAME");
                }
            });

            console.log('list items changed: curr: ', this.props.listitems);
            console.log('list items changed: new: ', value);
        }
        return true;
    }

    render() {

        const d = document.createElement("div");
        d.animate([], {})

        return html`
            <div class="list-group w-100">
                ${this.props.listitems?.map((data) => html`
                    <div class="overflow-hidden list-group-item position-absolute ">
                        <div class="position-relative w-100">
                            ${data}
                        </div>
                    </div>
                `)}
            </div>
        `
    }
}
customElements.define("list-group", ListGroup)

export default class TournamentCreateView extends BaseElement {
    constructor() {
        super(false, false);
        /** @param {SelectedSearchResult} ev  */

        this.validnbr = false;
        this.onSelectedResult = (ev) => {
            console.log('new search res: ', ev);
            if (ev.selectedSearchResult) {
                this.selected.push(ev.selectedSearchResult);
                this.checkValidNbr();
            } else {
                console.error("NO SEARCH RESULT!!!");
            }
        };
        /** @type {APITypes.SearchResult[]} */
        this.selected = []
        this.gameId = "pong";
    }
    /** @type {APITypes.TournamentMode} */
    roundRobinMode = "round robin";
    /** @type {APITypes.TournamentMode} */
    singleEliminationMode = "single elimination";

    /** @type {APITypes.TournamentMode | undefined} */
    tournamentMode;

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener("profile_search_selected_result", this.onSelectedResult);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener("profile_search_selected_result", this.onSelectedResult);
    }

    onBeforeMount(route, params, url) {
        if (params.game !== "pong") {
            document.dispatchEvent( new ToastNotificationErrorEvent(`Invalid Game ${params.game}`) );
            return router.redirect("/");
        }
        this.gameId = params.game;
    }

    checkValidNbr = (e) => {
        let modeInptElem;
        if (e && e instanceof InputEvent) {
            modeInptElem = e.target;
        } else {
            modeInptElem = this.querySelector('input[name="tournament-mode"]:checked');
        }
        if (!(modeInptElem instanceof HTMLInputElement) || !(modeInptElem.value == "round robin" || modeInptElem.value == "single elimination"))
            return;
        this.tournamentMode = modeInptElem?.value
        if (modeInptElem && modeInptElem instanceof HTMLInputElement) {
            console.log('mode: ', modeInptElem.value);
            if (this.selected.length+1 <= 2)
                this.validnbr = false;
            else if (modeInptElem.value === this.singleEliminationMode && (this.selected.length+1) %2 !== 0)
                this.validnbr = false;
            else
                this.validnbr = true;
        }
        super.requestUpdate();
    }

    createTournament = async () => {
        const tNameInpt = this.querySelector('#tournamentname');
        if (tNameInpt instanceof HTMLInputElement && this.tournamentMode != undefined) {
            const tournamentName = tNameInpt.value;
            const players = this.selected.map(s => s.id);
            try {
                const d = await sessionService.createTournament(tournamentName, this.tournamentMode, players);
                console.log('create tournament data: ', d);
                if (d?.success) {
                    router.go(`/games/${this.gameId}/tournament/${d.data.tournament_id}`)
                } else {
                    console.log('error!?! create tournament');
                }
            } catch (error) {
                sessionService.handleFetchError(error);
            }
        }
    }

    /** @param {MouseEvent} e  */
    clickHandler(e) {
        // console.log('target: ', e.target);
        // if (e.target instanceof HTMLElement) {
        //     const item = e.target.closest('div[data-selected-user]');
        //     console.log('target doc: ', e.target.getRootNode());
        //     console.log('item: ', item);
        //     if (item && item instanceof HTMLElement && item.dataset.selectedUser) {
        //         console.log('dataset value: ', Number(item.dataset.selectedUser));
        //         console.log('selected users: ', this.selected);
        //         this.selected.splice(Number(item.dataset.selectedUser), 1);
        //         this.checkValidNbr();
        //     }
        // }
        console.log('target: ', e.target);
        if (e.target instanceof HTMLElement) {
            const item = e.target.closest('div[data-selected-user]');
            console.log('target doc: ', e.target.getRootNode());
            console.log('item: ', item);
            if (item && item instanceof HTMLElement && item.dataset.selectedUser) {
                console.log('dataset value: ', Number(item.dataset.selectedUser));
                console.log('selected users: ', this.selected);
                this.selected.splice(Number(item.dataset.selectedUser), 1);
                this.checkValidNbr();
            }
        }
    }

    /** @param {SubmitEvent} e */
    async handleFormSubmit(e) {
        e.preventDefault();
        if (e.target instanceof HTMLFormElement) {
            const formData = new FormData(e.target);
            const players = this.selected.map(s => s.id);
            const mode = formData.get("tournament-mode")?.toString();
            const name = formData.get("tournament-name")?.toString();
            if (name == undefined || !(mode == this.roundRobinMode || mode == this.singleEliminationMode)) return;
            try {
                const d = await sessionService.createTournament(name, mode, players);
                console.log('create tournament data: ', d);
                if (d?.success) {
                    router.go(`/games/${this.gameId}/tournament/${d.data.tournament_id}`)
                } else {
                    console.log('error!?! create tournament');
                }
            } catch (error) {
                sessionService.handleFetchError(error);
            }
            // if 
            console.log(e);
        }
    }

    render() {
        return html`
            <div class="container">
                <h1 >Create a Tournament</h1>
                <form
                    @submit=${this.handleFormSubmit.bind(this)}
                    action=""
                    class="needs-validation"
                >
                    <div class="mb-3">
                        <label id="tournamentname-label" for="tournamentname" class="form-label">Tournament Name</label>
                        <input type="text" required name="tournament-name" class="form-control" id="tournamentname" aria-describedby="tournamentname-label">
                        <div id="emailHelp" class="form-text">The name of the new Tournament</div>
                    </div>
                    <div class="d-flex justify-content-evenly align-items-center" >
    
                        <input @click=${this.checkValidNbr}
                                type="radio"
                                name="tournament-mode"
                                class="btn-check"
                                id="btn-round-robin"
                                value="${this.roundRobinMode}"
                                autocomplete="off">
                        <label class="btn btn-outline-dark" for="btn-round-robin">Round Robin</label>
    
                        <input @click=${this.checkValidNbr}
                                type="radio" name="tournament-mode"
                                class="btn-check"
                                id="btn-single-elemination"
                                value="${this.singleEliminationMode}"
                                checked autocomplete="off">
                        <label class="btn btn-outline-dark" for="btn-single-elemination">Single elimination</label>
    
                        <span class="fs-3 m-0 p-0 ${this.validnbr ? 'text-success' : 'text-danger'} " >Players: ${this.selected.length+1}</span>
                    </div>
                    
                    
                    
                    
                    <div class="container my-3" >
                        <a href="/" class="btn btn-outline-danger">
                            cancel
                        </a>
                        <button ?disabled=${!this.validnbr} class="btn btn-success" type="submit">create tournament</button>
                    </div>
                </form>
                <div class="my-3">
                        <profile-search .todiscard=${this.selected.map((it)=>it.id)} ></profile-search>
                    </div>
    
                    <div ${/** @param {HTMLDivElement} el */(el)=>{this.selectedContainer = el; }}
                        class="list-group w-100">
                        ${this.selected.map((data, i) => html`
                            <div data-selected-user="${i}" class="list-group-item d-flex align-items-center justify-content-between">
                                ${avatarLink(data)}
                                <bs-button @click=${this.clickHandler.bind(this)}
                                    color="danger" icon="xmark" radius="rounded" small >
                                </bs-button>
                            </div>    
                        `)}

                        
                        

                    </div>
            </div>
        `
    }

   
}

customElements.define("tournament-create-view", TournamentCreateView);


