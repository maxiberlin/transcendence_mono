/**
 * @template T
 */
export default class BaseReactive {
    /** @type {import('../BaseBase.js').default | undefined} */
    #host;

    /** @type {T} */
    #value;

    get value() {
        return this.#value;
    }

    /**
     * @param {any} initialValue - The initial value.
     * @param {import('../BaseBase.js').default} [host] - The host object.
     */
    constructor(initialValue, host = undefined) {
        this.#host = host;
        this.#value = initialValue;
        // console.log('BaseReactive: initial value: ', initialValue);
    }

    /**
     * @param {T} value - The new value.
     * @param {boolean} force - Whether to force the update.
     */
    onNewValue(value, force) {
        // console.log('update value');
        if (!Object.is(this.#value, value) || force) {
            this.#value = value;
            if (this.#host && typeof this.#host.requestUpdate === 'function')
                this.#host.requestUpdate();
        }
    }

    onConnected() {}

    onDisconnected() {}
}

// /** @template T */
// export default class BaseReactive {
//     /** @type {BaseBase | null} */
//     __host;

//     /** @param {import('../BaseBase.js')} host */
//     constructor(host) {
//         this.__host = host;
//     }

//     /** @type {T} */
//     __value;

//     /** @returns {T} */
//     get value() {
//         return this.__value;
//     }

//     /** @param {T} value */
//     __onNewValue(value, force) {
//         if (!Object.is(this.__value, value) || force) {
//             this.__value = value;
//             if (this.__host) this.__host.requestUpdate();
//         }
//     }

//     __onConnected() {}

//     __onDisconnected() {}
// }
