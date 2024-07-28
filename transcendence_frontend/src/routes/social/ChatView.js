import { BaseElement, html } from '../../lib_templ/BaseElement.js';

export default class ChatView extends BaseElement {
    static observedAttributes = [];
    constructor() {
        super(false, false);

    }

    renderMessage = () => html``

    renderMessageContainer = () => html``

    renderChatsList = () => html`
        <ul class="list-group w-100">
            <li class="list-group-item text-body-secondary fs-6">
                <div class="w-100 row text-center align-items-center justify-content-between">
                    halo
                </div>
            </li>
            <li class="list-group-item text-body-secondary fs-6">
                <div class="w-100 row text-center align-items-center justify-content-between">
                    halo
                </div>
            </li>
            <li class="list-group-item text-body-secondary fs-6">
                <div class="w-100 row text-center align-items-center justify-content-between">
                    halo
                </div>
            </li>
        </ul>
       
    `
    
    renderChatContainer = () => html``

    renderMessageInput = () => html`
        <input
            class="form-control form-control-lg"
            type="text"
            placeholder="type to chat"
            aria-label=".form-control-lg example"
        >
    `

    render() {
        return html`
            <div class="row g-0" style="${"height: 100%"}">
                <div class="col-3">
                    ${this.renderChatsList()}
                </div>
                <div class="col d-flex flex-column">
                    <div class="flex-grow-1">
                        hallo
                    </div>
                    <div class="p-2">
                        ${this.renderMessageInput()}
                    </div>
                </div>
            </div>
        `
    }
}
customElements.define("chat-view", ChatView);

// style="${"height: 90vh"}"