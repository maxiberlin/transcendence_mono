import BaseBase from '../BaseBase.js';
import PubSubConsumer from './PubSubConsumer.js';

export default class PubSub extends EventTarget {
    static #nbr = 0;

    static #getAvailEventType() {
        this.#nbr++;
        return `my-custom-event-${this.#nbr}`;
    }

    /** @type {string} */ eventType;

    constructor() {
        super();
        this.eventType = PubSub.#getAvailEventType();
    }

    /**
     * @param {BaseBase} host host element, that triggers a rerender
     * @param {any} initialValue initial value
     * @param {boolean} force force update, event if values are same
     * @returns {PubSubConsumer} returns new PubSubConsumer instance
     */
    subscribe(host, initialValue, force = false) {
        return new PubSubConsumer(host, this, initialValue, force);
    }

    /**
     * @template T
     * @param {T} data data to publish
     */
    publish(data) {
        // console.log('publish: data: ', data);
        this.dispatchEvent(new CustomEvent(this.eventType, { detail: data }));
    }
}
