import BaseBase from './BaseBase.js';
import Template from './templ/Template.js';

export { html, css } from './templ/TemplateAsLiteral.js';

/**
 * @typedef {object} AttrProp
 * @property {string} camel
 * @property {object} oVal
 */

export class BaseElement extends BaseBase {
    static #colorModeEvent = 'base-elem-toggle-color';

    static #colorModePubSub = new EventTarget();

    static #currentColorMode = 'light';

    static toggleColorMode() {
        const ht = document.querySelector('html');
        const newColor = this.#currentColorMode === 'light' ? 'dark' : 'light';
        if (ht) ht.dataset.bsTheme = newColor;
        this.#currentColorMode = newColor;
        const color = BaseElement.#currentColorMode;
        const revColor = color === 'light' ? 'dark' : 'light';
        document.querySelectorAll('button').forEach((btn) => {
            this.#toggleBtnColor(btn, color, revColor);
        });
        document.querySelectorAll('input').forEach((btn) => {
            this.#toggleBtnColor(btn, color, revColor);
        });
        document.querySelectorAll('a').forEach((btn) => {
            this.#toggleBtnColor(btn, color, revColor);
        });
        this.#colorModePubSub.dispatchEvent(new CustomEvent(this.#colorModeEvent, { detail: newColor }));
    }

    static #changeDocumentBtnColors() {
        const color = BaseElement.#currentColorMode;
        const revColor = color === 'light' ? 'dark' : 'light';
        document.querySelectorAll('button').forEach((btn) => {
            this.#toggleBtnColor(btn, color, revColor);
        });
        document.querySelectorAll('input').forEach((btn) => {
            this.#toggleBtnColor(btn, color, revColor);
        });
        document.querySelectorAll('a').forEach((btn) => {
            this.#toggleBtnColor(btn, color, revColor);
        });
    }

    #changeBtnColors(color, revColor, toggleTheme) {
        if (this.shadowRoot) {
            Array.from(this.shadowRoot.children).forEach((e) => {
                if (e instanceof HTMLElement) {
                    if (toggleTheme) e.dataset.bsTheme = color;
                    BaseElement.#toggleBtnColor(e, color, revColor);
                }
                e.querySelectorAll('button').forEach((btn) => {
                    BaseElement.#toggleBtnColor(btn, color, revColor);
                });
                e.querySelectorAll('input').forEach((btn) => {
                    BaseElement.#toggleBtnColor(btn, color, revColor);
                });
                e.querySelectorAll('a').forEach((btn) => {
                    BaseElement.#toggleBtnColor(btn, color, revColor);
                });
            });
        }
    }

    static #toggleBtnColor = (elem, color, revColor) => {
        if (elem.classList.contains(`btn-outline-${color}`)) {
            elem.classList.remove(`btn-outline-${color}`);
            elem.classList.add(`btn-outline-${revColor}`);
        } else if (elem.classList.contains(`btn-${color}`)) {
            elem.classList.remove(`btn-${color}`);
            elem.classList.add(`btn-${revColor}`);
        }
    };

    /**
     * @param {CustomEvent} ev The custom event object.
     */
    #changeColorMode(ev) {
        const color = ev.detail;
        const revColor = color === 'light' ? 'dark' : 'light';
        /** @param {HTMLElement} elem */
        this.#changeBtnColors(color, revColor, true);
        this.onColorChange();
    }

    onColorChange() {}

    /** @type {Map<string, AttrProp>} */
    #attrPropMapRef;

    #initAttrPropMap() {
        // @ts-ignore
        const obs = this.constructor.observedAttributes;
        if (this.#attrPropMapRef !== undefined || !(obs instanceof Array)) return;
        // @ts-ignore
        // eslint-disable-next-line no-underscore-dangle
        this.constructor.___attrPropMap___ = new Map();
        // @ts-ignore
        // eslint-disable-next-line no-underscore-dangle
        this.#attrPropMapRef = this.constructor.___attrPropMap___;
        obs.forEach((attr) => {
            const propName = BaseElement.toCamel(attr);

            this.#attrPropMapRef.set(attr, { camel: propName, oVal: null });
        });
    }

    get isConnected() {
        return this.#isConnected;
    }

    #mapMyAttr(name, nVal, oVal) {
        if (this.#attrPropMapRef === undefined) this.#initAttrPropMap();
        const pObj = this.#attrPropMapRef.get(name);
        if (!pObj) return;

        if (nVal === oVal) {
            return;
        }

        pObj.oVal = this[pObj.camel];
        if (typeof this[pObj.camel] === 'boolean') {
            this[pObj.camel] = nVal !== null;
        } else if (typeof this[pObj.camel] === 'number') {
            this[pObj.camel] = Number(nVal);
        } else if (typeof this[pObj.camel] === 'object') {
            this[pObj.camel] = JSON.parse(nVal);
        } else {
            this[pObj.camel] = String(nVal);
        }

        this.onAttributeChange(name);
        if (this.#isConnected) this.update();
    }

    requestUpdate() {
        // console.log("request Update");
        // console.log('request Update');
        if (this.#isConnected) {
            // console.log("is connected! update")
            this.update();
        }
    }

    /**
     * @param {string} route
     * @param {object} params
     * @param {URL} url
     * @returns {Promise<symbol | void> | symbol | void}
     */
    // @ts-ignore
    // eslint-disable-next-line no-unused-vars
    onBeforeMount(route, params, url) {}

    /**
     * @param {string} route
     * @returns {void}
     */
    // @ts-ignore
    // eslint-disable-next-line no-unused-vars
    onAfterMount(route) {}

    /**
     * @param {string} route
     * @param {object} params
     * @param {URL} url
     */
    onRouteChange(route, params, url) {}

    onBeforeUnMount() {}

    onAfterUnMount() {}

    /**
     * @param {boolean} useBootstrap
     * @param {boolean} useShadow
     * @param {object | undefined} [shadowOption]
     */
    constructor(
        // eslint-disable-next-line no-unused-vars
        useBootstrap = false,
        useShadow = false,
        shadowOption = undefined,
    ) {
        super();

        // @ts-ignore
        // eslint-disable-next-line no-underscore-dangle
        this.#attrPropMapRef = this.constructor.___attrPropMap___;
        if (useShadow) {
            const shadow = this.attachShadow(shadowOption ?? { mode: 'open' });
            shadow.adoptedStyleSheets = [];
            // @ts-ignore
            if (this.constructor.styles instanceof Array) {
                // @ts-ignore
                shadow.adoptedStyleSheets.push(...this.constructor.styles);
            }

            this.root = shadow;
        } else {
            this.root = this;
        }
    }

    onSlotChange() {
        this.update();
    }

    #isConnected = false;

    connectedCallback() {
        super.connectedCallback();
        if (this.#attrPropMapRef === undefined) this.#initAttrPropMap();
        this.update();
        this.#isConnected = true;
        this.shadowRoot?.addEventListener('slotchange', this.onSlotChange.bind(this));
        BaseElement.#colorModePubSub.addEventListener(
            BaseElement.#colorModeEvent,
            this.#changeColorMode.bind(this),
        );
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.#isConnected = false;
        if (this.#templ) {
            this.#templ.unMountMe();
        }
        this.shadowRoot?.removeEventListener('slotchange', this.onSlotChange.bind(this));

        BaseElement.#colorModePubSub.removeEventListener(
            BaseElement.#colorModeEvent,
            this.#changeColorMode.bind(this),
        );
        // console.log("BASE ELEM DISCONNECT!!!!", this)
    }

    // eslint-disable-next-line no-unused-vars
    onAttributeChange(attributeName) {}

    attributeChangedCallback(name, oVal, nVal) {
        this.#mapMyAttr(name, nVal, oVal);
    }

    /** @type {import('./templ/LiveTemplate.js').default | undefined} */
    #templ = undefined;

    update() {
        const res = this.render();

        if (res === null || res === undefined) return;
        if (this.#templ === undefined) {
            this.#templ = Template.getInstance(res.strings);
            this.#templ.mountMe(this.root, null, res.values);
        } else {
            this.#templ.update(res.values);
            // // console.log("UPDATE COMPLETED: ", this);
        }
        // this.#adjustBtnColors();
        BaseElement.#changeDocumentBtnColors();
    }

    /** @returns {import('./templ/TemplateAsLiteral.js').TemplateAsLiteral | null}  */
    render() {
        return null;
    }

    static toCamel = (s) => s.replace(/-./g, (x) => x[1].toUpperCase());

    static toKebap = (s) =>
        s.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? '-' : '') + $.toLowerCase());
}
