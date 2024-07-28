import { avatarLink } from '../../components/bootstrap/AvatarComponent.js';
import { BaseElement, html } from '../../lib_templ/BaseElement.js';
import { fetcher, sessionService, userAPI } from '../../services/api/API_new.js';
import router from '../../services/router.js';

/**
 * @param {number} min 
 * @param {number} curr 
 * @param {number} max 
 * @returns {number}
 */
const clamp = (min, curr, max) => Math.min(Math.max(curr, min), max);


export class SelectedSearchResult extends Event {
    /** @param {APITypes.SearchResult | undefined} res */
    constructor(res) {
        super("profile_search_selected_result", {bubbles: true});
        this.selectedSearchResult = res;
    }
}

/**
 * @prop todiscard
 */
export default class ProfileSearch extends BaseElement {
    static observedAttributes = ["followlink", "discardprev"];

    constructor() {
        super(false, false);
        this.boundInputHandler = this.#handleSearchInputClick.bind(this);
        this.boundNavKeyHandler = this.#handleSearchResultKeyNav.bind(this);
        this.followlink = false;
        this.discardprev = false;
        this.discarted = [];
        this.props.todiscard = [];
    }

    connectedCallback() {
        super.connectedCallback();
        document.body.addEventListener('click', this.boundInputHandler);
        document.body.addEventListener('keydown', this.boundNavKeyHandler);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.body.removeEventListener('click', this.boundInputHandler);
        document.body.removeEventListener('keydown', this.boundNavKeyHandler);
    }

    async handleInput(e) {
        /** @type {HTMLInputElement} */
        const inpt = e.target;
        if (inpt.value === '') {
            this.#searchData = 'Type to search';
            super.requestUpdate();
        } else {
            try {
                const data = await userAPI.searchUser(inpt.value);
                if (!(data.data instanceof Array) || data.data.length === 0)
                    this.#searchData = 'Nothing Found';
                else this.#searchData = data.data;
                super.requestUpdate();
            } catch (error) {
                sessionService.handleFetchError(error);
            }
        }
    }

    /** @type {APITypes.SearchResult[] | string} */
    #searchData = "Type to search";
    /** @type {HTMLInputElement | undefined} */
    #inptElem;
    #showRes = false;
    #currSearchRes;
    #searchSection;
    #currSearchNavPos = -1;
    /** @type {HTMLDivElement | undefined} */
    #searchListGroupContainer;
    /** @param {number} id  */
    toggleActiveElement(id) {
        if (!(this.#searchData instanceof Array) || this.#searchData.length === 0) return;
        const currentEntries = this.#searchListGroupContainer?.querySelectorAll('div[data-search-result] > a.list-group-item');
        const oldActive = this.#searchListGroupContainer?.querySelector('a.list-group-item.active');
        oldActive?.classList.remove('active', 'link-light');
        oldActive?.classList.add('link-body-emphasis')
        const pos = clamp(0, id, this.#searchData.length-1);
        const newActive = currentEntries ? currentEntries[pos] : undefined;
        newActive?.classList.remove('link-body-emphasis');
        newActive?.classList.add('active', 'link-light');
    }

    handleSelectedClicked(route) {
        if (this.followlink) {
            router.go(route);
        } else {
            // this.#showRes = false;
            this.#searchData = [];
            this.#currSearchRes = "";
            this.#currSearchNavPos = -1;
            // console.log('handleSelectedClicked -> clear the data');
            super.requestUpdate();
            // console.log('inpt: ', this.#inptElem);
            const inpt = this.#searchSection.querySelector("input");
            if (inpt) {
                inpt.value = '';
                this.#searchData = 'Type to search';
                inpt.focus();
            }
            
        } 
    }

    /** @param {KeyboardEvent} ev  */
    handleSelectionKeypress(ev) {
        if (!(this.#searchData instanceof Array)) return;
        if (ev.key === 'ArrowUp') {
            this.#currSearchNavPos = clamp(0, this.#currSearchNavPos-1, this.#searchData.length-1)
            this.toggleActiveElement(this.#currSearchNavPos);
        } else if (ev.key === 'ArrowDown') {
            this.#currSearchNavPos = clamp(0, this.#currSearchNavPos+1, this.#searchData.length-1)
            this.toggleActiveElement(this.#currSearchNavPos);
        } else if (ev.key === 'Enter' && this.#currSearchNavPos >= 0) {
            // console.log('\n\n!!!!!ENTER KEY KLICKED');
            const selectedRes = this.#searchData[this.#currSearchNavPos];
            const currentEntry = this.#searchListGroupContainer?.querySelector('div[data-search-result] > a.active');
            if (currentEntry instanceof HTMLAnchorElement) {
                // console.log('href!!: ', currentEntry.href);
                this.handleSelectedClicked(currentEntry.href);
            }
            // console.log('new item: ', selectedRes);
            this.dispatchEvent(new SelectedSearchResult(selectedRes))
            if (this.discardprev) this.discarted.push(selectedRes.id);
        } else {
            return;
        }
        ev.preventDefault();
    }

    /** @param {KeyboardEvent} ev  */
    #handleSearchResultKeyNav(ev) {
        if (this.#showRes) {
            if (ev.key === 'Escape') {
                ev.preventDefault();
                this.#inptElem?.blur();
                this.#showRes = false;
                this.#currSearchNavPos = -1;
                super.requestUpdate();
            } else if (this.#searchData instanceof Array) {
                this.handleSelectionKeypress(ev);
            }
        } else {
            this.#currSearchNavPos = -1;
        }
    }

    /** @param {Event} ev  */
    #handleSearchInputClick(ev) {
        let target = ev.composedPath()[0];
        if (!(target instanceof Node)) return;
        const shad = target.getRootNode();
        if (shad instanceof ShadowRoot) target = shad.host;
        // // console.log('searchSection: ', this.#searchSection);
        // // console.log('target: ', target);
        let makeUpDate = false;
        if (
            this.#searchSection &&
            this.#searchSection instanceof HTMLElement &&
            target instanceof HTMLElement
        ) {
            if (this.#searchSection.contains(target)) {
                // console.log('jo inside section!: entry: ', target);
                const contDiv = target.closest('div[data-search-result]');
                if (contDiv && contDiv instanceof HTMLElement && contDiv.dataset.searchResult && this.#searchData instanceof Array) {
                    // console.log('cont div: ', contDiv.dataset.searchResult);
                    // ev.stopImmediatePropagation();
                    ev.stopPropagation()
                    ev.preventDefault();
                    const selectedRes = this.#searchData[contDiv.dataset.searchResult];
                    // console.log('selected result: ', selectedRes);
                    this.handleSelectedClicked(target.closest('a')?.href ?? '');
                    if (this.discardprev) this.discarted.push(selectedRes.id);
                    this.dispatchEvent(new SelectedSearchResult(selectedRes))
                } else {
                    makeUpDate = this.#showRes !== true;
                    this.#showRes = true;
                }
                
            } else {
                // // console.log('NOT inside section');
                makeUpDate = this.#showRes !== false;
                this.#showRes = false;
            }
        }
        if (makeUpDate) super.requestUpdate();
    }

    

    static renderOther = (str) =>
        html`<li class="list-group-item text-body-secondary fs-6 p-3">
            ${str}
        </li>`;

    render() {

        // console.log('render search -> current data:');
        // console.log('currSearchNavPos: ', this.#currSearchNavPos);
        // console.log('currSearchRes: ', this.#currSearchRes);
        // console.log('searchData: ', this.#searchData);
        // console.log('showRes: ', this.#showRes);

        if (this.discardprev && this.#searchData instanceof Array)
            this.#searchData = this.#searchData.filter((u)=>!this.discarted.includes(u.id))
        else if (this.props.todiscard.length > 0 && this.#searchData instanceof Array)
            this.#searchData = this.#searchData.filter((u)=>!this.props.todiscard.includes(u.id))

        if (typeof this.#searchData === 'string') {
            this.#currSearchRes = ProfileSearch.renderOther(this.#searchData);
        } else if (this.#searchData instanceof Array) {
            this.#currSearchRes = this.#searchData.map((data, i) => html`
                <div data-search-result="${i}" class="list-group-item list-group-item-action m-0 p-0" >
                    ${avatarLink(data, "list-group-item list-group-item-action")}
                </div>
            `)
        } else {
            this.#currSearchRes = '';
        }

        

        return html`
            <section
                class=""
                ${(el) => { this.#searchSection = el; }}
            >
                <div class="input-group input-group-lg">
                    <span class="input-group-text"
                        ><i class="fa-solid fa-magnifying-glass"></i
                    ></span>
                    <input
                        ${(el) => { this.#inptElem = el; }}
                        @input=${this.handleInput.bind(this)}
                        id="user-search"
                        class="form-control"
                        type="search"
                        placeholder="Search other Players"
                        aria-label="Search"
                        autocomplete="off"
                    />
                </div>

                <div class="w-100 position-relative z-3">
                    ${!this.#showRes ?
                        ''
                    :   html`
                            <div
                                class="position-absolute top-100 left-0 d-flex align-items-center w-100"
                            >
                                <div
                                    class="list-group w-100"
                                    ${(el) => { this.#searchListGroupContainer = el; }}
                                >
                                    ${this.#showRes ? this.#currSearchRes : ''}
                                </div>
                            </div>
                        `}
                </div>
            </section>
        `;
    }
}
customElements.define('profile-search', ProfileSearch);
