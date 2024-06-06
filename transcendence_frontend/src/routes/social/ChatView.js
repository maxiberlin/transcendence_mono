import { BaseElement, html } from '../../lib_templ/BaseElement.js';

export default class ChatView extends BaseElement {
    static observedAttributes = [];

    constructor() {
        super();

        this.#roomName = 'joo';
    }

    #roomName;

    /** @type {WebSocket | undefined} */
    #chatSocket;

    connectedCallback() {
        super.connectedCallback();

        this.#chatSocket = new WebSocket(
            `ws://127.0.0.1/ws/chat/${this.#roomName}/`,
        );

        // console.log('chatsocket: ', this.#chatSocket);

        this.#chatSocket.onmessage = (e) => {
            this.onWebsocketMessage(e);
        };

        this.#chatSocket.onclose = () => {
            // console.log(e);
            // console.error('Chat socket closed unexpectedly');
        };
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.#chatSocket?.close();
    }

    onWebsocketMessage(e) {
        // const roomName = JSON.parse(document.getElementById('room-name').textContent);

        const data = JSON.parse(e.data);
        if (this.chatLog) this.chatLog.value += `${data.message}\n`;
    }

    render() {
        return html`
            <textarea
                ${(el) => {
                    this.chatLog = el;
                }}
                cols="100"
                rows="20"
            ></textarea
            ><br />
            <input
                ${(el) => {
                    this.msgInputEl = el;
                }}
                @keyup=${this.msgSubmitBtn?.click()}
                type="text"
                size="100"
            /><br />
            <input
                ${(el) => {
                    this.msgSubmitBtn = el;
                }}
                @click=${() => {
                    if (!this.msgInputEl) return;
                    const message = this.msgInputEl.value;
                    this.#chatSocket?.send(
                        JSON.stringify({
                            message,
                        }),
                    );
                    this.msgInputEl.value = '';
                }}
                type="button"
                value="Send"
            />
        `;
    }
}
customElements.define('chat-view', ChatView);
