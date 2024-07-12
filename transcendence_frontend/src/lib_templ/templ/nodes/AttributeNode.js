import BaseNode from './BaseNode.js';
// class AttributeBaseNode extends BaseNode {
//     /** @param {Element} element @param {string} name */
//     constructor(element, name, index) {
//         super(element, index);

//     }

// }

// export class AttributeSingleNode extends AttributeBaseNode {
//     constructor(element, name, index) {
//         super(element, name, index);
//     }
//     setValue(value, index) {
//         if (value === null || value === undefined || value === "")
//             this.element.removeAttribute(this.attrName);
//         else if (this.value !== value)
//             this.element.setAttribute(this.attrName, value);
//     }
//     /** @type {string} */
//     value;
// }

export default class AttributeMultiNode extends BaseNode {
    /**
     * @param {any} element
     * @param {string} name
     * @param {string[]} strings
     * @param {number} index
     */
    constructor(element, name, strings, index) {
        super(element, index);
        this.attrName = name;
        this.strings = strings;
        this.#argsCount = strings.length - 1;
        this.#myArgs = new Array(this.argsCount).fill('');
    }

    /** @type {string} */
    attrName;

    #initialInit = false;

    #toCamel = (s) => s.replace(/-./g, (x) => x[1].toUpperCase());
    /**
     * @param {string} res 
     */
    #setStyleAttribute(res) {
        const arr = res.split(';');
        arr.forEach((style) => {
            const [keydashed, val] = style.split(':')
            // console.log(`try to set style: ${keydashed} to ${val}`);
            if (keydashed && val) {
                keydashed.trim()
                val.trim()
                const key = this.#toCamel(keydashed)
                if (this.element instanceof HTMLElement) {
                    // if (this.element.style.prototype.hasOwnProperty(key))
                    // this.element.style[key] = val;
                    try {
                        this.element.style[key] = val;
                    } catch (error) {
                        console.error(`unable to set style: ${key} to ${val}`);
                    }
                }
            }
        });
    }

    /**
     * @param {number} changeCount
     */
    #setAttr(changeCount) {
        // // // console.log("SET MULI ATTRIBUTE!!, changeCount: ", changeCount, " | noneCount: ", noneCount);
        // // // console.log(this.element);
        // if (noneCount === this.#argsCount) {
        //     this.element.removeAttribute(this.attrName);
        //     return ;
        // }
        if (changeCount === 0 && this.#initialInit) return;
        let res = '';
        for (let i = 0; i !== this.#argsCount; i++) {
            res += this.strings[i] + this.#myArgs[i];
            // // // console.log("res: ",res);
        }
        res += this.strings[this.strings.length - 1];
        // // // console.log("res: ", res);
        if (this.attrName === 'style')
            this.#setStyleAttribute(res);
        else
            this.element.setAttribute(this.attrName, res);
        this.#initialInit = true;
    }

    #changed = 0;

    #changedC = 0;

    #noneC = 0;

    /**
     * @param {string} value
     * @param {number} index
     */
    setValue(value, index) {
        // // // console.log("SET ATTRIBUTE MULTLI: ATTRNAME: ", this.attrName, " VALUE: ", value)
        const i = index - this.index;
        let val = value;
        if (
            val === null ||
            val === undefined ||
            typeof val === 'object' ||
            typeof val === 'function'
        ) {
            val = '';
        } else if (typeof val !== 'string') {
            val = String(val);
        }
        if (val !== this.#myArgs[i]) {
            this.#myArgs[i] = val;
            this.#changedC++;
        }
        // // // // console.log("mut attr index: ", index)
        if (this.#myArgs[i] === '') this.#noneC++;
        this.#changed++;
        if (this.#changed === this.#argsCount) {
            this.#changed = 0;
            this.#setAttr(this.#changedC);
        }
    }

    get argsCount() {
        return this.#argsCount;
    }

    /** @type {string[]} */
    strings;

    /** @type {number} */
    #argsCount;

    /** @type {Array<string>} */
    #myArgs;
}
