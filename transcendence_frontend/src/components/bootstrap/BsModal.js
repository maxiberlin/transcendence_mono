import { BaseElem, html } from '../../modules.js';

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


export class BsModal extends BaseElem {
    static observedAttributes = ["centered", "header", "footer", "btntext"];
    static #nbr = 0;
    static #getAvailId() {
        this.#nbr++;
        return (`bs-modal-id-${this.#nbr}`);
    }
    constructor() {
        super(false, false);
        
        this.centered = true;
        this.btntext = "";
        this.props._header = "";
        this.props._content = "";
        this.props._footer = "";
        this.__id = BsModal.#getAvailId();
    }

    #isOpen = false;
    render() {
        console.log("render Modal")
        console.log(this.props);
        console.log(this.props["_children"]);
        return html`
            <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#${this.__id}">
                ${this.btntext}
            </button>
            <div
                @hide.bs.modal=${(ev)=>{this.#isOpen = false; super.requestUpdate()}}
                @shown.bs.modal=${(ev)=>{this.#isOpen = true; super.requestUpdate()}}
                class="modal fade" id="${this.__id}" tabindex="-1" aria-labelledby="${this.__id}-label" aria-hidden="true" data-bs-keyboard="false">
                <div class="modal-dialog modal-fullscreen">
                    <div class="modal-content">
                    <div class="modal-header">
                        ${this.props._header ? html`<h1 class="modal-title fs-5" id="${this.__id}-label">${this.props._header}</h1>` : ""}
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        ${this.#isOpen ? this.props._content : ""}
                    </div>
                    ${this.props._footer ? html`
                        <div class="modal-footer">
                            ${this.props._footer}
                        </div>
                    ` : ""}
                    </div>
                </div>
            </div>
        
        `;
    }
}
customElements.define("bs-modal", BsModal);
