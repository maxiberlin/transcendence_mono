import { BaseElement, html } from '../../lib_templ/BaseElement.js';
import { Modal } from 'bootstrap';

// import * as bootstrap from "../../../assets/bootstrap-5.3.2-dist/js/bootstrap.esm.js";

// export class BsModal extends BaseElem {
//     static #nbr = 0;

//     static observedAttributes = ["centered", "title", "footer"];

//     #intId;
//     constructor() {
//         super();

//         this.centered = true;
//         this.footer = false;
//         this.on_close = () => {

//         };
//         this.#intId = "bs-modal-no-" + BsModal.#nbr++;
//     }
//     connectedCallback() {
//         super.connectedCallback();
//         this.modal = this.root.querySelector(`#${this.#intId}`);
//         this.modalHandle = new bootstrap.Modal(this.modal, {backdrop: "static"});
//         /** @type {Array<HTMLSlotElement>} */
//         this.slots = Array.from(this.root.querySelectorAll(`slot`));
//         console.log("slots: ", this.slots);
//     }
//     #closed = true;
//     closeModal() {
//         this.toggleModal();
//         this.on_close();
//     }
//     toggleModal() {

//         this.modalHandle.toggle()
//     }

//     render() {
//         return html`
//         <button @click=${this.toggleModal.bind(this)}
//         type="button" class="btn btn-primary" data-bs-target="#${this.#intId}">
//             Launch demo modal
//         </button>
//         <div class="modal fade" tabindex="-1" id="${this.#intId}" >
//             <div class="modal-dialog ${this.centered ? "modal-dialog-centered" : ""}" role="document">
//                 <div class="modal-content">
//                 <div class="modal-header">
//                     <slot name="header"></slot>
//                     <button @click=${this.closeModal.bind(this)} type="button" class="btn-close" aria-label="Close"></button>
//                 </div>
//                 <div class="modal-body">
//                     <slot name="body"></slot>
//                 </div>
//                 ${this.footer ? html`
//                     <div class="modal-footer">
//                         <slot name="footer"></slot>
//                         <button type="button" class="btn btn-secondary">Close</button>
//                         <button type="button" class="btn btn-primary">Save changes</button>
//                     </div>
//                 ` : ""}
//                 </div>
//             </div>
//         </div>
//         `;
//     }
// }
// customElements.define("bs-modal", BsModal);

/**
 * @attr centered
 * @attr show_close
 * @prop header
 * @prop footer
 * @prop content
 */
export default class BsModal extends BaseElement {
    static observedAttributes = ['centered', 'show_close'];

    static #nbr = 0;

    static #getAvailId() {
        this.#nbr++;
        return `bs-modal-id-${this.#nbr}`;
    }

    constructor() {
        super(false, false);

        this.centered = true;
        this.props.header = '';
        this.props.content = '';
        this.props.footer = '';
        this.show_close = false;
        this.__id = BsModal.#getAvailId();
    }

    connectedCallback() {
        super.connectedCallback();
    }
    
    disconnectedCallback() {
        super.disconnectedCallback();
        this.#modalControl?.dispose();
    }

    showModal() {
        console.log('BS BUTTON: SHOW THE MODAL');
        this.#modalControl?.show();
    }
    hideModal() {
        console.log('BS BUTTON: HIDE THE MODAL');
        this.#modalControl?.hide();
    }

    #isOpen = false;
    /** @type {Modal | undefined} */
    #modalControl;
    render() {
        // console.log('render Modal');
        // console.log(this.props);
        // console.log(this.props._children);
        /** @type {Partial<Modal.Options>} */
        const options = {
            focus: true,
            keyboard: false,
            backdrop: "static"
        }
        
        return html`
            
            <div
                @hide.bs.modal=${() => {
                    this.#isOpen = false;
                    super.requestUpdate();
                }}
                @shown.bs.modal=${() => {
                    this.#isOpen = true;
                    super.requestUpdate();
                }}

                ${ (el) => { this.#modalControl = Modal.getOrCreateInstance(el, options) } }

                class="modal fade"
                id="${this.__id}"
                tabindex="-1"
                aria-labelledby="${this.__id}-label"
                aria-hidden="true"
            >
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            ${this.props.header ?
                                html`<h1
                                    class="modal-title fs-5"
                                    id="${this.__id}-label"
                                >
                                    ${this.props.header}
                                </h1>`
                            : ''}
                            ${ this.show_close ? html`
                                <button
                                    type="button"
                                    class="btn-close"
                                    data-bs-dismiss="modal"
                                    aria-label="Close"
                                ></button>
                                    ` : '' }
                        </div>
                        <div class="modal-body">
                            ${this.#isOpen ? this.props.content : ''}
                        </div>
                        ${this.props.footer ?
                            html`
                                <div class="modal-footer">
                                    ${this.props.footer}
                                </div>
                            `
                        :   ''}
                    </div>
                </div>
            </div>
        `;
    }
}
customElements.define('bs-modal', BsModal);
