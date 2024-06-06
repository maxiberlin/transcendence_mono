import BaseReactive from './BaseReactive.js';

export default class PubSubConsumer extends BaseReactive {
    #force;

    /** @type {import('./PubSub.js').default} */
    #pubSubInst;

    /**
     * @param {import('../BaseBase').default} host The host object.
     * @param {import('./PubSub.js').default} pubSubInst The PubSub instance.
     * @param {any} initialValue The initial value.
     * @param {boolean} force The force flag.
     */
    constructor(host, pubSubInst, initialValue, force = false) {
        super(host, initialValue, force);
        this.#pubSubInst = pubSubInst;
        if (!host) this.onConnected();

        this.#handler = (event) => {
            this.onNewValue(event.detail, this.#force);
        };
    }

    #handler;

    #connected = false;

    onConnected() {
        // console.log("on Connected pubSubConsumer, add eventListener!");
        if (this.#connected) return;
        this.#pubSubInst.addEventListener(
            this.#pubSubInst.eventType,
            this.#handler,
        );
        this.#connected = true;
    }

    onDisconnected() {
        // console.log("on Disconnected pubSubConsumer, add eventListener!");
        if (!this.#connected) return;
        this.#pubSubInst.removeEventListener(
            this.#pubSubInst.eventType,
            this.#handler,
        );
        this.#connected = false;
    }
}
