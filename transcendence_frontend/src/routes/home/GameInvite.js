import { avatarLink } from '../../components/bootstrap/AvatarComponent.js';
import { BaseElement, html } from '../../lib_templ/BaseElement.js';
import { SelectedSearchResult } from '../social/ProfileSearch.js';

export default class GameInvite extends BaseElement {
    constructor() {
        super(false, false);
        /** @param {SelectedSearchResult} ev  */

        this.validnbr = false;
        this.onSelectedResult = (ev) => {
            console.log('new search res: ', ev);
            if (ev.selectedSearchResult) {
                this.selected.push(ev.selectedSearchResult);

                
                this.checkValidNbr();
                super.requestUpdate();
            } else {
                console.error("NO SEARCH RESULT!!!");
            }
        };
        /** @type {APITypes.SearchResult[]} */
        this.selected = []
    }

    connectedCallback() {
        super.connectedCallback();
        this.addEventListener("profile_search_selected_result", this.onSelectedResult);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener("profile_search_selected_result", this.onSelectedResult);
    }

    checkValidNbr() {
        const selectedMode = this.querySelector('input[name="tournament-mode"]:checked');
        if (selectedMode && selectedMode instanceof HTMLInputElement) {
            console.log('mode: ', selectedMode.value);
            if (this.selected.length+1 <= 2)
                this.validnbr = false;
            else if (selectedMode.value === "single-elemination" && (this.selected.length+1) %2 !== 0)
                this.validnbr = false;
            else
                this.validnbr = true;
        }
    }

    /** @param {MouseEvent} e  */
    clickHandler(e) {
        // if (e.target instanceof Node && this.selectedContainer?.contains(e.target))
        //     const elem
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
                super.requestUpdate();
            }
        }
    }

    render() {
        return html`
            <div class="container">
                <h1 >Create a Tournament</h1>
                <div class="mb-3">
                    <label for="tournamentname" class="form-label">Tournament Name</label>
                    <input type="text" class="form-control" id="tournamentname" aria-describedby="tournament name">
                    <div id="emailHelp" class="form-text">The name of the new Tournament</div>
                </div>
                <div class="d-flex justify-content-evenly align-items-center" >

                    <input type="radio" name="tournament-mode" class="btn-check" id="btn-round-robin" value="round-robin" autocomplete="off">
                    <label class="btn btn-outline-dark" for="btn-round-robin">Round Robin</label>

                    <input type="radio" name="tournament-mode" class="btn-check" id="btn-single-elemination" value="single-elemination" checked autocomplete="off">
                    <label class="btn btn-outline-dark" for="btn-single-elemination">Single elimination</label>

                    <span class="fs-3 m-0 p-0 ${this.validnbr ? 'text-success' : 'text-danger'} " >Players: ${this.selected.length+1}</span>
                </div>
                <div class="my-3 container">
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
                
                
                <div class="container my-3" >
                    <bs-button outline color="danger" text="cancel"></bs-button>
                    <bs-button ?disabled=${!this.validnbr}  color="success" text="create"></bs-button>
                </div>
            </div>
            
        `
    }
}
customElements.define("game-invite", GameInvite);