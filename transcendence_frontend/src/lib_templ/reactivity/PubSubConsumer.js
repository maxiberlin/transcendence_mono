import BaseReactive from './BaseReactive.js';

/**
 * @template T
 * @extends {BaseReactive<T>}
 */
export default class PubSubConsumer extends BaseReactive {
    /** @type {import('./PubSub.js').default} */
    #pubSubInst;

    /** @type {boolean} */
    #force;

    /**
     * @param {import('./PubSub.js').default} pubSubInst The PubSub instance.
     * @param {any} initialValue The initial value.
     * @param {boolean} force The force flag.
     * @param {import('../BaseBase').default} [host] The host object.
     */
    constructor(pubSubInst, initialValue, force = false, host = undefined) {
        // // console.log('constructor PubSubConsumer');
        super(initialValue, host);
        this.#pubSubInst = pubSubInst;
        if (host == undefined) force = true;
        this.#force = force;

        this.#handler = (event) => {
            // console.log('PubSubConsumer: myHost: ', host, ' onNewValue: event.detail: ',event.detail);
            this.onNewValue(event.detail, this.#force);
        };

        if (!host) this.onConnected();
    }

    #handler;

    #connected = false;

    onConnected() {
        // // console.log('on Connected pubSubConsumer, add eventListener!');
        // // console.log('   this pubsub: ', this.#pubSubInst);
        // // console.log('   handler: ', this.#handler);
        if (this.#connected) return;
        this.#pubSubInst.addEventListener(
            this.#pubSubInst.eventType,
            this.#handler,
        );
        this.#connected = true;
    }

    onDisconnected() {
        // // // console.log("on Disconnected pubSubConsumer, add eventListener!");
        if (!this.#connected) return;
        this.#pubSubInst.removeEventListener(
            this.#pubSubInst.eventType,
            this.#handler,
        );
        this.#connected = false;
    }
}
