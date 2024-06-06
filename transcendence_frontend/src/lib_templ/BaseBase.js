export default class BaseBase extends HTMLElement {
    constructor() {
        super();

        /** @type {import('./templ/TemplateAsLiteral').TemplateAsLiteral | Array<import('./templ/TemplateAsLiteral').TemplateAsLiteral> | string | number | boolean} */
        this.propChildren = '';
        this.#props = {
            propChildren: '',
        };

        const setFunc = (obj, prop, value) => {
            obj[prop] = value;
            this.requestUpdate();
            return true;
        };
        this.props = new Proxy(this.#props, { set: setFunc });
    }

    connectedCallback() {
        Object.keys(this).forEach((prop) => {
            const elem = this[prop];
            if (elem && typeof elem.onConnected === 'function')
                elem.onConnected();
        });
    }

    disconnectedCallback() {
        Object.keys(this).forEach((prop) => {
            const elem = this[prop];
            if (elem && typeof elem.onDisconnected === 'function')
                elem.onDisconnected();
        });
    }

    #props;

    requestUpdate() {}
}
