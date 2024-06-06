import { BaseElement, html } from '../../lib_templ/BaseElement.js';

export default class BsButton extends BaseElement {
    static observedAttributes = [
        'color',
        'outline',
        'small',
        'large',
        'disabled',
        'icon',
        'iconright',
        'radius',
        'loadingtext',
        'text',
        'dropdownitem',
        'stretch',
    ];

    constructor() {
        super(false, false);
        this.outline = false;
        this.color = 'primary';
        this.small = false;
        this.large = false;
        this.icon = '';
        this.iconright = false;
        this.radius = '';
        this.text = '';
        this.loadingtext = '';
        this.dropdownitem = false;
        this.stretch = false;

        this._async_handler = () => {};

        this._loading = false;
    }

    async onClick() {
        this._loading = true;
        super.requestUpdate();
        await this._async_handler();
        this._loading = false;
        super.requestUpdate();
    }

    getIcon = () => {
        /** @type {string | import('../../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral} */
        let rend = '';
        if (this._loading) {
            rend = html`
                <span
                    class="spinner-border spinner-border-sm"
                    aria-hidden="true"
                ></span>
            `;
        } else if (this.icon) {
            rend = html`<i class="fa-solid fa-${this.icon}"></i>`;
        }
        return html`
            <span
                style="width: 1.25em;"
                class=" ${this.text ? 'text-start' : ''} ${this.text ?
                    `m${this.iconright ? 's' : 'e'}-1`
                :   ``} "
            >
                ${rend}
            </span>
        `;
        // return html`<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>`;
        // <i class="fa-solid fa-fw fa-spinner fa-spin-pulse"></i>
    };

    render() {
        // console.log("render button");
        const color = `btn-${this.outline ? 'outline-' : ''}${this.color}`;
        let size = '';
        if (this.small) {
            size = 'btn-sm';
        } else if (this.large) {
            size = 'btn-lg';
        }
        const radius = this.radius ? `rounded-${this.radius}` : '';
        return html`
            <button
                @click=${this.onClick.bind(this)}
                class="${this.stretch ? 'w-100' : (
                    ''
                )} d-inline-flex align-items-center justify-content-${(
                    this.dropdownitem
                ) ?
                    'start'
                :   'evenly'} ${radius} btn ${color} ${size} ${(
                    this.dropdownitem
                ) ?
                    'dropdown-item'
                :   ''} "
                ?disabled=${this._loading}
                role="button"
            >
                ${this._loading && this.iconright ?
                    html`<span role="status">${this.loadingtext}</span>`
                :   ''}
                ${!this._loading && this.iconright ? this.text : ''}
                ${this.getIcon()}
                ${this._loading && !this.iconright ?
                    html`<span role="status">${this.loadingtext}</span>`
                :   ''}
                ${!this._loading && !this.iconright ? this.text : ''}
            </button>
        `;
    }
}
customElements.define('bs-button', BsButton);

// ${this._loading ? this.getSpin() : this.icon ? html`<i class="fa-solid ${this.text === "" ? "" : "fa-fw"} fa-${this.icon}"></i>` : ""}

// ${this._loading ? html`<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>` : this.icon ? html`<i class="fa-solid fa-${this.icon}"></i>` : ""}

// getSpin = () => {

//     return html`
//         <span style="width: 1.25em; height: 1.25em">

//         <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
//         </span>

//          `;
// }

// getSpin = () => {
//     /** @type {Array<Keyframe>} */
//     const frames =  [
//         { transform: "rotate(0)" },
//         { transform: "rotate(360deg)" },
//     ]

//     /** @type {KeyframeAnimationOptions} */
//     const opt = {
//         duration: 2000,
//         iterations: Infinity,
//     };

//     /** @param {HTMLElement} el */
//     const addAnim = (el) => {
//         el.animate(frames, opt);
//     }

//     return html`<i ${(el)=>{addAnim(el)}} class="fa-solid fa-fw fa-spinner"></i>`;
// }

// export class BsButtonBs extends BaseElem {
//     static observedAttributes = ["color", "outline", "small", "large", "disabled", "icon", "iconright", "radius", "loadingtext"];
//     constructor() {
//         super();
//         this.outline = false;
//         this.color = "primary";
//         this.small = false;
//         this.large = false;
//         this.icon = "";
//         this.iconright = false;
//         this.radius = "";
//         this.loadingtext = "";

//         this._async_handler = () => {};

//         this._loading = false;
//     }

//     async onClick(ev) {
//         console.log("onClick!");
//         this._loading = true;
//         super.requestUpdate();
//         setTimeout(async () => {
//             await this._async_handler();
//             this._loading = false;
//             super.requestUpdate();
//         }, 1000);
//     }

//     getSpinner = () => html`
//         <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
//         <span role="status">${this.loadingtext}...</span>
//     `

//     getSpin = () => {
//         /** @type {Array<Keyframe>} */
//         const frames =  [
//             { transform: "rotate(0)" },
//             { transform: "rotate(360deg)" },
//         ]

//         /** @type {KeyframeAnimationOptions} */
//         const opt = {
//             duration: 2000,
//             iterations: Infinity,
//         };

//         /** @param {HTMLElement} el */
//         const addAnim = (el) => {
//             el.animate(frames, opt);
//         }

//         return html`<i class="fa-solid fa-fw fa-spinner fa-spin-pulse"></i>`;
//     }

//     render() {
//         const color = `btn-${this.outline ? "outline-" : ""}${this.color}`;
//         const size = this.small ? "btn-sm" : this.large ? "btn-lg" : "";
//         const radius = this.radius ? `rounded-${this.radius}` : "";
//         return html`
//             <button @click=${this.onClick.bind(this)} class="${radius} btn ${color} ${size}" ?disabled=${this._loading} role="button">
//             ${(this._loading && this.iconright) ? html`<span role="status">${this.loadingtext}</span>` : ""}
//             ${(!this._loading && this.iconright) ? html`<slot></slot>` : ""}

//             ${this._loading ?
//                     html`<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>`
//                 : this.icon ?
//                     html`<i class="fa-solid fa-fw fa-${this.icon}"></i>`
//                 : ""}

//             ${(this._loading && !this.iconright) ? html`<span role="status">${this.loadingtext}</span>` : ""}
//             ${(!this._loading && !this.iconright) ? html`<slot></slot>` : ""}
//             </button>
//         `
//     }
// }
// customElements.define("bs-button-bs", BsButtonBs);
