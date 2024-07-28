import BaseNode from './BaseNode.js';
import BaseBase from '../../BaseBase.js';

export default class AttributePropNode extends BaseNode {
    /**
     * @param {Element} element
     * @param {string} name
     * @param {number} index
     */
    constructor(element, name, index) {
        super(element, index);
        this.#attrName = name;
    }

    /** @param {any} value */
    setValue(value) {
        const el = this.element;
        if (el instanceof BaseBase) {
            el.props[this.#attrName] = value;
        }
        // this.element[this.#attrName] = value;
    }

    /** @type {string} */
    #attrName;
}
