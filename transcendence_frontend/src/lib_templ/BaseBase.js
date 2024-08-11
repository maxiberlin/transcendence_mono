/**
 * @template T
 * @param {T} object
 * @param {BaseBase} host
 * @returns {T}
 */
function getUpdateProxy(object, host) {
    const setFunc = (obj, prop, value) => {
        obj[prop] = value;
        host.requestUpdate();
        return true;
    };
    return new Proxy(object, { set: setFunc });
}

/**
 * @typedef {import('./templ/TemplateAsLiteral').TemplateAsLiteral} Tpl
 */

/**
 * @typedef {Tpl | Tpl[] | string | number | boolean | undefined} TemplateValues
 */

/**
 * @typedef {object} BaseBaseProps
 * @property {TemplateValues} propChildren
 */

/**
 * @template {BaseBaseProps} K
 */
export default class BaseBase extends HTMLElement {
    constructor() {
        super();

        
       
        this.#props = /** @type {K} */ ({
            propChildren: '',
        });
        
        // this.#props = {
            //     propChildren: '',
            // };
        this.#state = {};
            
        this.props = getUpdateProxy(this.#props, this);
        this.state = getUpdateProxy(this.#state, this);
        
        /** @type {import('./templ/TemplateAsLiteral').TemplateAsLiteral | Array<import('./templ/TemplateAsLiteral').TemplateAsLiteral> | string | number | boolean} */
        this.propChildren = '';
    }

    /**
     * @template {keyof K} T
     * @param {T} key
     * @param {K[T]} value
     */
    onPropChange(key, value) {
        return true;
    }

    connectedCallback() {
        // console.log('BaseBase: connectedCallback of: ', this);
        
        Object.keys(this).forEach((prop) => {
            const elem = this[prop];
            if (elem && typeof elem.onConnected === 'function') elem.onConnected();
        });
    }

    disconnectedCallback() {
        Object.keys(this).forEach((prop) => {
            const elem = this[prop];
            if (elem && typeof elem.onDisconnected === 'function')
                elem.onDisconnected();
        });
    }

    /** @type {K} */
    #props;

    #state;

    requestUpdate() { }
}
