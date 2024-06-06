import { BaseElement, html } from '../../lib_templ/BaseElement.js';
import { fetcher } from '../../services/api/API.js';

export default class ProfileSearch extends BaseElement {
    constructor() {
        super(false, false);
        this.boundInputHandler = this.#handleSearchInputClick.bind(this);
        this.boundNavKeyHandler = this.#handleSearchResultKeyNav.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('click', this.boundInputHandler);
        document.addEventListener('keydown', this.boundNavKeyHandler);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('click', this.boundInputHandler);
        document.removeEventListener('keydown', this.boundNavKeyHandler);
    }

    async handleInput(e) {
        /** @type {HTMLInputElement} */
        const inpt = e.target;

        if (inpt.value === '') {
            this.#searchData = 'Type to search';
            super.requestUpdate();
            return;
        }
        try {
            const data = await fetcher.$get(`/search`, {
                searchParams: new URLSearchParams({
                    q: inpt.value,
                }),
            });
            // console.log("searchData: ", data);
            // console.log("data: ", data.data);
            if (!(data.data instanceof Array))
                this.#searchData = 'Nothing Found';
            else this.#searchData = data.data;
            // console.log("my new search data: ", this.#searchData);
            super.requestUpdate();
        } catch (error) {
            // console.log('search error: ', error);
        }
    }

    #searchData;

    #showRes = false;

    #currSearchRes;

    #searchSection;

    #currNoSearchItems = -1;

    #currSearchNavPos = -1;

    #searchListGroupContainer;

    /** @param {KeyboardEvent} ev  */
    #handleSearchResultKeyNav(ev) {
        // console.log('NAV KEY!: ', ev.key);
        if (
            this.#showRes &&
            this.#currSearchRes instanceof Array &&
            this.#searchListGroupContainer instanceof Element
        ) {
            // console.log('yes, we have results and want to show them');
            if (this.#currNoSearchItems === -1)
                this.#currNoSearchItems = this.#currSearchRes.length;
            if (ev.key === 'ArrowUp')
                this.#currSearchNavPos = Math.max(
                    0,
                    this.#currSearchNavPos - 1,
                );
            if (ev.key === 'ArrowDown')
                this.#currSearchNavPos = Math.min(
                    this.#currNoSearchItems - 1,
                    this.#currSearchNavPos + 1,
                );
            this.#searchListGroupContainer
                .querySelector('a.list-group-item.active')
                ?.classList.remove('active');
            this.#searchListGroupContainer
                .querySelectorAll('a.list-group-item')
                [this.#currSearchNavPos].classList.add('active');
        } else {
            this.#currNoSearchItems = -1;
            this.#currSearchNavPos = 0;
        }
    }

    /** @param {Event} ev  */
    #handleSearchInputClick(ev) {
        let target = ev.composedPath()[0];
        if (!(target instanceof Node)) return;
        const shad = target.getRootNode();
        if (shad instanceof ShadowRoot) target = shad.host;
        // console.log('searchSection: ', this.#searchSection);
        // console.log('target: ', target);
        let makeUpDate = false;
        if (
            this.#searchSection &&
            this.#searchSection instanceof Node &&
            target instanceof Node
        ) {
            if (this.#searchSection.contains(target)) {
                // console.log('jo inside section');
                makeUpDate = this.#showRes !== true;
                this.#showRes = true;
            } else {
                // console.log('NOT inside section');
                makeUpDate = this.#showRes !== false;
                this.#showRes = false;
            }
        }
        if (makeUpDate) super.requestUpdate();
    }

    /**
     * @param {APITypes.SearchResult} userData
     * @returns {import('../../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
     */
    static renderSearchEntry = (userData) => {
        return html`
            <a
                class="list-group-item list-group-item-action text-body-secondary p-3"
                href="/profile/${userData.id}"
            >
                <avatar-component radius="3" src="${userData.avatar}" size="40">
                    <span class="m-2 text-truncate" slot="after"
                        >${userData.username}</span
                    >
                </avatar-component>
            </a>
        `;
    };

    static renderOther = (str) =>
        html`<li class="list-group-item text-body-secondary fs-6 p-3">
            ${str}
        </li>`;

    render() {
        if (typeof this.#searchData === 'string') {
            this.#currSearchRes = ProfileSearch.renderOther(this.#searchData);
        } else if (this.#searchData instanceof Array) {
            this.#currSearchRes = this.#searchData.map((data) =>
                ProfileSearch.renderSearchEntry(data),
            );
        } else {
            this.#currSearchRes = '';
        }

        return html`
            <section
                class=""
                ${(el) => {
                    this.#searchSection = el;
                }}
            >
                <div class="input-group input-group-lg">
                    <span class="input-group-text"
                        ><i class="fa-solid fa-magnifying-glass"></i
                    ></span>
                    <input
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
                                    ${(el) => {
                                        this.#searchListGroupContainer = el;
                                    }}
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
