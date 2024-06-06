import BaseNode from './BaseNode.js';
import LiveTemplate from '../LiveTemplate.js';
import { TemplateAsLiteral, html } from '../TemplateAsLiteral.js';
// eslint-disable-next-line import/no-cycle
import Template from '../Template.js';

const isPrimitive = (val) =>
    val === null || (typeof val !== 'object' && typeof val !== 'function');

export default class OuterNode extends BaseNode {
    destroy() {
        this.cleanup();
    }

    cleanup() {
        if (this.#currentVal === null || this.#currentVal === undefined) {
            return;
        }
        if (this.#currentVal instanceof LiveTemplate) {
            this.#currentVal.unMountMe();
        } else if (this.#currentVal instanceof Array) {
            this.#currentVal.forEach((val) => {
                val.unMountMe();
            });
        } else if (
            this.#currentVal instanceof Node ||
            isPrimitive(this.#currentVal)
        ) {
            this.#currentVal.remove();
        }
        this.#currentVal = undefined;
    }

    /**
     * @param {TemplateAsLiteral} value
     * @param {import('../Template.js').default} templ
     * @returns {boolean}
     */
    // @ts-ignore
    // eslint-disable-next-line no-unused-vars
    checkAnim(value, templ) {
        const parent = this.element.parentNode;
        // // console.log("check anim: mycurrentval: ", this.#currentVal);
        // // console.log("check anim: myElem: ", this.element);
        // // console.log("check anim: parent: ", parent);
        // console.dir(parent);
        if (
            !(
                this.#currentVal instanceof LiveTemplate &&
                parent instanceof Element
            )
        )
            return false;
        // // console.log("first return")
        // @ts-ignore
        // eslint-disable-next-line no-underscore-dangle
        const anim = parent.___anim;
        if (typeof anim === 'undefined') return false;

        // // console.log("CHECK FADE TRUE")
        // // console.log("same templ: ", templ === this.#currentVal.template)
        const animArr = this.#currentVal.unMountMe(anim);
        // // console.log("ANIM ARR: ", animArr);
        this.#currentVal = Template.getInstance(value.strings);
        this.#currentVal.mountMe(
            this.element.parentNode,
            this.element,
            value.values,
            animArr,
        );
        return true;
    }

    /** @param {TemplateAsLiteral} value  */
    setValueLiveTemplate(value) {
        const templ = Template.getTemplate(value.strings);

        if (this.checkAnim(value, templ)) return;

        if (
            this.#currentVal instanceof LiveTemplate &&
            templ === this.#currentVal.template
        ) {
            // // console.log("templ: just update: curr", this.#currentVal);
            // // console.log("templ: just update: new", value.values);
            this.#currentVal.update(value.values);
        } else {
            this.cleanup();
            this.#currentVal = Template.getInstance(value.strings);
            // // console.log("templ: create new: ", this.#currentVal);
            // // console.log("templ: create values: ", value.values);
            this.#currentVal.mountMe(
                this.element.parentNode,
                this.element,
                value.values,
            );
            // this.#currentVal.update(value.values);
        }
    }

    /** @param {Array} value  */
    setValueAsLiveTemplateArray(value) {
        if (!(this.#currentVal instanceof Array)) {
            this.cleanup();
            this.#currentVal = [];
        }

        // // console.log("setValueAsLiveTemplateArray");
        value.forEach((val, i) => {
            if (!(this.#currentVal instanceof Array)) throw new Error('');
            if (i === this.#currentVal.length) {
                const res = html`${val}`;
                const templ = Template.getInstance(res.strings);
                templ.mountMe(this.element.parentNode, this.element, [val]);
                this.#currentVal.push(templ);
            } else {
                this.#currentVal[i].update([val]);
            }
        });
        while (this.#currentVal.length > value.length) {
            const elem = this.#currentVal.pop();
            elem.unMountMe();
        }
    }

    setValue(value) {
        if (value instanceof TemplateAsLiteral) {
            this.setValueLiveTemplate(value);
        } else if (value instanceof Array) {
            this.setValueAsLiveTemplateArray(value);
        } else if (isPrimitive(value)) {
            // // console.log("is prim: val: ", this.#currentVal);
            if (
                value === null ||
                value === undefined ||
                value !== this.#currentVal
            ) {
                // // console.log("is prim: after clean: ", this.#currentVal);
                this.cleanup();
            }
            this.#currentVal = document.createTextNode(String(value));
            // // console.log("is prim: new val: ", this.#currentVal);
            this.element.parentNode?.insertBefore(
                this.#currentVal,
                this.element,
            );
        } else {
            throw new Error('was das für 1 wert?');
        }
    }

    #currentVal;
}
