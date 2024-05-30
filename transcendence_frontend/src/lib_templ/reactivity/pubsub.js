
import { BaseElem } from '../baseelem.js';







/** @template T */
export class BaseReactive {
    /** @type {BaseElem | null} */
    __host;
    /** @param {BaseElem} host */
    constructor(host) {
        this.__host = host;
    }

    /** @type {T} */
    __value;
    /** @returns {T} */
    get value() {
        return this.__value;
    }
    /** @param {T} value */
    __onNewValue(value, force) {
        if (!Object.is(this.__value, value) || force) {
            this.__value = value;
            if (this.__host)
                this.__host.requestUpdate();
        }
    }
    __onConnected() {}
    __onDisconnected() {}
}

export class PubSubConsumer extends BaseReactive {
    #force;
    /** @type {PubSub} */
    #pubSubInst;
    /** @param {BaseElem} host @param {PubSub} pubSubInst  */
    constructor(host, pubSubInst, initialValue, force=false) {
        super(host);
        this.#pubSubInst = pubSubInst;
        this.__value = initialValue;
        this.#force = force;
        if (!host) this.connect();
    }
    __handler(event) {
        // console.log("new data arrived!")
        this.__onNewValue(event.detail, this.#force);
    }


    #connected = false;
    __onConnected() {
        // console.log("on Connected pubSubConsumer, add eventListener!");
        if (this.#connected) return ;
        this.#pubSubInst.__eventTarget.addEventListener(this.#pubSubInst.__eventType, this.__handler.bind(this));
        this.#connected = true;
    }
    __onDisconnected() {
        // console.log("on Disconnected pubSubConsumer, add eventListener!");
        if (!this.#connected) return ;
        this.#pubSubInst.__eventTarget.removeEventListener(this.#pubSubInst.__eventType, this.__handler.bind(this));
        this.#connected = false;
    }


    connect() {
        this.__onConnected();
    }
    disconnect() {
        this.__onDisconnected();
    }
}





export class PubSub {
    static #nbr = 0;
    static #getAvailEventType() {
        this.#nbr++;
        return (`my-custom-event-${this.#nbr}`);
    }

    /** @type {string} */
    __eventType;
    __eventTarget;
    constructor() {
        this.__eventType = PubSub.#getAvailEventType();
        this.__eventTarget = new EventTarget();
    }
    subscribe(host, initialValue, force=false) {
        return new PubSubConsumer(host, this, initialValue, force);
    }

    /**
     * @template T
     * @param {T} data */
    publish(data) {
        console.log("publish: data: ", data)
        this.__eventTarget.dispatchEvent(new CustomEvent(this.__eventType, { detail: data }));
    }
}


// subscribe(eventHandler) {
// //     console.log("SUBSCRIBED: event: ", this.#eventType, " | eventhandler: ", eventHandler);
//     this.addEventListener(this.#eventType, eventHandler);
//     const handler = (event) => {
//         eventHandler(event.detail);
//     }
//     const unsubscribe = () => {
//         this.removeEventListener(this.#eventType, handler);
//     };
//     return (unsubscribe);
// }







/**
 * @template T
 * @typedef {(value: T, unsubscribe?: () => void) => void} ContextCallback
 */

/**
 * @param {string} key
 * @returns {Symbol}
 */
export const createContext = (key) => {
    return (Symbol(key));
}

/** @template T */
export class ContextRequestEvent extends Event {
    static get eventName() {
        return "context-request";
    }

    /**
     * @param {Symbol} context 
     * @param {ContextCallback<T>} callback 
     * @param {boolean} [subscribe] 
     */
    constructor(context, callback, subscribe) {
        super(ContextRequestEvent.eventName, {bubbles: true, composed: true});
        // console.log("context req event constr")
        /** @type {Symbol} */
        this.context = context;
        /** @type {ContextCallback<T>} */
        this.callback = callback;
        /** @type {boolean | undefined} */
        this.subscribe = subscribe;
    }
}


class ContextConsumer extends BaseReactive {
    #force;
    /** @type {Symbol} context  */
    #context;
    /** @param {BaseElem} host @param {Symbol} context  */
    constructor(host, context, force=false) {
        super(host);
        this.#context = context;
        this.#force = force;
    }

    #onValue(value, quitCb) {
        this.#quitCb = quitCb;
        if (quitCb !== undefined) {
            super.__onNewValue(value, this.#force);
        }
    }

    __onConnected() {
        const event = new ContextRequestEvent(this.#context, this.#onValue.bind(this), true);
        if (this.__host)
            this.__host.dispatchEvent(event);
    }

    #quitCb;
    __onDisconnected() {
        if (this.#quitCb) this.#quitCb();
    }
}

