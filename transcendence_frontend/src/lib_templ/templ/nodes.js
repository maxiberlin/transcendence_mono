import { BaseElem } from '../baseelem.js';
import { LiveTemplate, Template, TemplateAsLiteral, html } from './template.js'

const DEBUG_MODE = true;

export class BaseNode {
    /** 
     * @param {number} index
     */
    constructor(node, index) {
        this.index = index;
        this.element = node;
    }
    setValue(value, index) {}
    destroy() {}
    /** @type {Element} */
    element;
    index;
}

const isPrimitive = (val) => val === null || ((typeof val != "object") && (typeof val != "function"))

export class OuterNode extends BaseNode {
    constructor(node, index) {
        super(node, index);
    }

    destroy() {
        this.cleanup();
    }

    cleanup() {
       
        if (this.#currentVal === null || this.#currentVal === undefined) {
            return ;
        }
        if (this.#currentVal instanceof LiveTemplate) {
            this.#currentVal.unMountMe();
        } else if (this.#currentVal instanceof Array) {
            this.#currentVal.forEach((val) => {
                val.unMountMe();
            })
        } else if (this.#currentVal instanceof Node || isPrimitive(this.#currentVal)) {
            this.#currentVal.remove();
        }
        this.#currentVal = undefined;
        
    }

    /** @param {TemplateAsLiteral} value @param {Template} templ  */
    checkAnim(value, templ) {
        
        const parent = this.element.parentNode;
        // // console.log("check anim: mycurrentval: ", this.#currentVal);
        // // console.log("check anim: myElem: ", this.element);
        // // console.log("check anim: parent: ", parent);
        // console.dir(parent);
        if(!(this.#currentVal instanceof LiveTemplate && parent instanceof Element))
            return false;
        // // console.log("first return")
        const anim = parent["___anim"];
        if (typeof anim === "undefined")
            return false;

        // // console.log("CHECK FADE TRUE")
        // // console.log("same templ: ", templ === this.#currentVal.template)
        const animArr = this.#currentVal.unMountMe(anim);
        // // console.log("ANIM ARR: ", animArr);
        this.#currentVal = Template.getInstance(value.strings);
        this.#currentVal.mountMe(this.element.parentNode, this.element, value.values, animArr);
        return true;
    }

    /** @param {TemplateAsLiteral} value  */
    setValueLiveTemplate(value) {
        const templ = Template.getTemplate(value.strings);

        if (this.checkAnim(value, templ)) return ;

        if (this.#currentVal instanceof LiveTemplate && templ === this.#currentVal.template) {
            // // console.log("templ: just update: curr", this.#currentVal);
            // // console.log("templ: just update: new", value.values);
            this.#currentVal.update(value.values);
        } else {
            this.cleanup();
            this.#currentVal = Template.getInstance(value.strings);
            // // console.log("templ: create new: ", this.#currentVal);
            // // console.log("templ: create values: ", value.values);
            this.#currentVal.mountMe(this.element.parentNode, this.element, value.values);
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
            if (!(this.#currentVal instanceof Array)) throw new Error("")
            if (i === this.#currentVal.length) {
                const res = html`${val}`;
                const templ = Template.getInstance(res.strings);
                templ.mountMe(this.element.parentNode, this.element, [val]);
                this.#currentVal.push(templ);
            } else {
                this.#currentVal[i].update([val])
            }
        });
        while (this.#currentVal.length > value.length) {
            const elem = this.#currentVal.pop();
            elem.unMountMe();
        }
    }

    setValue(value, index) {
        if (value instanceof TemplateAsLiteral) {
            this.setValueLiveTemplate(value);

        } else if (value instanceof Array) {
            this.setValueAsLiveTemplateArray(value);
           
        } else if (isPrimitive(value)) {
            // // console.log("is prim: val: ", this.#currentVal);
            if (value === null || value === undefined || value !== this.#currentVal) {
                // // console.log("is prim: after clean: ", this.#currentVal);
                this.cleanup();
            }
            this.#currentVal = document.createTextNode(String(value));
            // // console.log("is prim: new val: ", this.#currentVal);
            this.element.parentNode?.insertBefore(this.#currentVal, this.element);
        } else {
            throw new Error("was das für 1 wert?");
        }
    }

    #currentVal;
    
}


class AttributeBaseNode extends BaseNode {
    /** @param {Element} element @param {string} name */
    constructor(element, name, index) {
        super(element, index);
        this.attrName = name;
    }
    /** @type {string} */
    attrName;
}

export class AttributeSingleNode extends AttributeBaseNode {
    constructor(element, name, index) {
        super(element, name, index);
    }
    setValue(value, index) {
        if (value === null || value === undefined || value === "")
            this.element.removeAttribute(this.attrName);
        else if (this.value !== value)
            this.element.setAttribute(this.attrName, value);
    }
    /** @type {string} */
    value;
}

export class AttributeMultiNode extends AttributeBaseNode {
    constructor(element, name, strings, index) {
        super(element, name, index);
        this.strings = strings;
        this.#argsCount = strings.length - 1;
        this.#myArgs = new Array(this.argsCount).fill("");
    }
    #initialInit = false;
    #setAttr(changeCount, noneCount) {
        // // // console.log("SET MULI ATTRIBUTE!!, changeCount: ", changeCount, " | noneCount: ", noneCount);
        // // // console.log(this.element);
        // if (noneCount === this.#argsCount) {
        //     this.element.removeAttribute(this.attrName);
        //     return ;
        // }
        if (changeCount === 0 && this.#initialInit)
            return ;
        let res = "";
        for (let i = 0; i != this.#argsCount; i++) {
            res += this.strings[i] + this.#myArgs[i];
            // // // console.log("res: ",res);
        }
        res += this.strings[this.strings.length-1];
        // // // console.log("res: ", res);
        this.element.setAttribute(this.attrName, res);
        this.#initialInit = true;
    }
    #changed = 0;
    #changedC = 0;
    #noneC = 0;
    /** @param {string} value @param {number} index  */
    setValue(value, index) {
        // // // console.log("SET ATTRIBUTE MULTLI: ATTRNAME: ", this.attrName, " VALUE: ", value)
        index = index - this.index;
        if (value === null || value === undefined || typeof value === "object" || typeof value === "function") value = "";
        else if (typeof value != "string") value = String(value);
        if (value !== this.#myArgs[index]) {
            this.#myArgs[index] = value;
            this.#changedC++;
        }
        // // // // console.log("mut attr index: ", index)
        if (this.#myArgs[index] === "") this.#noneC++;
        this.#changed++;
        if (this.#changed === this.#argsCount) {
            this.#changed = 0;
            this.#setAttr(this.#changedC, this.#noneC);
        }
    }
    get argsCount() {
        return (this.#argsCount);
    }

    /** @type {string} */
    strings;
    /** @type {number} */
    #argsCount;
    /** @type {Array<string>} */
    #myArgs;
}

export class AttributeBoolNode extends AttributeBaseNode {
    constructor(element, name, index) {
        super(element, name, index);
        
    }
    setValue(value, index) {
        // // // console.log("SET BOOLEAN: ", value, "my node: ", this.element);
        const b = Boolean(value);
        if (b === this.#active)
            return ;
        this.#active = b;
        // // // console.log("jooo")
        if (!b) {
            // // // console.log("remove Attribute!");
            this.element.removeAttribute(this.attrName);
        }
        else this.element.setAttribute(this.attrName, "");
    }
    /** @type {boolean} */
    #active = false;
}

export class AttributeEventNode extends AttributeBaseNode {
    constructor(element, name, index) {
        super(element, name, index);
        // // console.log("Event Node: elem: ", element);
        // // console.log("Event Node: name: ", name);
    }

    /**
     * @typedef {Object} EvHandler
     * @property {EventListener} cb
     * @property {boolean | AddEventListenerOptions} op
     */

    /**  @param {EvHandler} value */
    setValue(value, index) {
        // this.element.addEventListener()
        if (value === undefined || value === null) {
            this.destroy();
        } else if (typeof value === "function" && value !== this.#callback) {
            // // console.log("is a eventhandler function!: ", value);
            this.#callback = value;
        } else {
            if (value.cb !== this.#callback)
                this.#callback = value.cb;
            if (value.op !== this.#options || value.cb === undefined) {
                this.destroy();
            }
        }
        if (this.#isOff && this.#callback !== undefined) {
            this.element.addEventListener(this.attrName, this.#handlerObj, this.#options);
            this.#isOff = false;
        }
        
    }
    destroy() {
        // console.log("remove setted EventListeners");
        if (!this.#isOff) {
            // console.log("this one: ", this.#callback);
            this.element.removeEventListener(this.attrName, this.#handlerObj, this.#options);
            this.#callback = undefined;
            this.#options = undefined;
            this.#isOff = true;
        }
    }
    #callback;
    #options;
    #isOff = true;
    /** @type {EventListenerObject} */
    #handlerObj = {
        handleEvent: (ev) => {
            if (this.#callback) {
                // // console.log("CALLBACK OF EVENT: ", this.attrName);
                this.#callback(ev);
            }
        }
    };
}

export class AttributePropNode extends AttributeBaseNode {
    constructor(element, name, index) {
        super(element, name, index);
        
    }
    /** @param {any} value */
    setValue(value, index) {
        // console.log("jo prop node: ", this.element);
        // console.log("jo prop value: ", value);
        // if (this.#val === value)
        //     return ;
        // if (value !== null) {
            this.#val = value;
            if (this.element instanceof BaseElem)
                this.element.props[this.attrName] = value;
            this.element[this.attrName] = value;
            // console.log("new prop data: ", this.element[this.attrName]);
        // }
    }
    /** @type {any} */
    #val;
}




export const dirs = {
    useElem: (item) => {
        const useMe = (elem) => {
            if (typeof item === "function" ) {
                item(elem);
            }
        }
        return (useMe);
    }
};


export class FuncNode extends BaseNode {
    constructor(elem, index) {
        super(elem, index);
    }
    setValue(value) {
        if (typeof value === "function") {
            value(this.element);
        }
    }
}



















// export class BaseNode {
//     /** 
//      * @param {number} index
//      */
//     constructor(node, index) {
//         this.index = index;
// // // //         // console.log("base constructor: node: ", node);
        
//         // if (node instanceof Element)
//             this.element = node;
//         // else if (node instanceof Node && node.parentNode)
//         //     this.element = node.parentNode;
//         // else throw new Error("BaseNode: invalid node");
//     }
//     setValue(value, index) {}
//     destroy() {}
//     /** @type {Element} */
//     element;
//     index;
// }

// const isPrimitive = (val) => val === null || ((typeof val != "object") && (typeof val != "function"))

// export class OuterNode extends BaseNode {
//     constructor(node, index) {
//         super(node, index);
//         this.#nodeRef = node;
//     }

//     #mountNodes;
//     /** @param {TemplateAsLiteral} val  */
//     #mountTempl(val) {
//         // const template = Templ.getTemplateInstance(val);
//     }
//     destroy() {
//         this.cleanup();
//     }

//     cleanup() {
//         if (this.#currentVal instanceof LiveTemplate) {
//             this.#currentVal.unMountMe();
//         } else if (this.#currentVal instanceof Array) {
//             this.#currentVal.forEach((val) => {
//                 val.unMountMe();
//             })
//         } else if (this.#currentVal instanceof Node || isPrimitive(this.#currentVal)) {
//             this.#nodeRef.previousSibling?.remove();
//         }
//         this.#currentVal = undefined;
//     }

//     setValue(value, index) {
//         // return ;
// // // //         // console.log("SET VAL OUTER: ", value)
//         // if (value === this.#currentVal) {
// // // //         //     console.log("same value!")
//         //     return ;
//         // }
// // // //         console.log("\n-----------------------------------");
// // // //         console.log("set val, curr value: ", this.#currentVal);
// // // //         console.log("my parent is: ", this.element.parentNode);
//         // this.cleanup()
//         if (value instanceof TemplateAsLiteral) {
// // // //             console.log("the value is of Type TemplateAsLiteral");
//             const templ = Template.getTemplate(value.strings);
// // // //             console.log("get template and check if the Same");
//             if (this.#currentVal instanceof LiveTemplate)
// // // //                 console.log("current value is of Type LiveTemplate")
//             if (this.#currentVal instanceof LiveTemplate && templ === this.#currentVal.template) {
// // // //                 console.log("the templates are the same, just update");
//                 this.#currentVal.update(value.values);
//             } else {
//                 this.cleanup();
// // // //                 console.log("create new LiveTemplate and set LiveTemplate value");
//                 this.#currentVal = Template.getInstance(value.strings, this.element.parentNode, this.#nodeRef);
// // // //                 console.log("my new value is: ", this.#currentVal);
//                 if (this.#currentVal instanceof LiveTemplate)
//                     this.#currentVal.update(value.values);

//             }

//             // if (!(this.#currentVal instanceof TemplateAsLiteral)) {
//             //     this.cleanup();
//             // } else {

//             // }

// // // //             // console.log("set LiveTemplate value");
//             // this.#currentVal = Template.getInstance(value.strings, this.element.parentNode, this.#nodeRef);
// // // //             // console.log("my new value is: ", this.#currentVal);
//             // if (this.#currentVal instanceof LiveTemplate) {
//             //     this.#currentVal.update(value.values);
//             // }
//             // render a literal
//         } else if (value instanceof Array) {
// // // //             console.log("set Array of LiveTemplates, curr: ", this.#currentVal );
//             if (!(this.#currentVal instanceof Array)) {
//                 this.cleanup();
//                 this.#currentVal = [];
//             }

//             let element;
//             value.forEach((val, i) => {
//                 if (!(this.#currentVal instanceof Array))
//                     throw new Error("")
//                 if (i === this.#currentVal.length) {
//                     // const res = html`<div>${val}</div>`;
//                     const res = html`<span>${val}</span>`;
//                     // const res = html`${val}`;
// // // //                     console.log("i:", i)
// // // //                     console.log("currval:", this.#currentVal)
                    
//                     this.#currentVal.push(
//                         Template.getInstance(
//                             res.strings,
//                             this.element.parentNode,
//                             this.#nodeRef
//                         )
//                     )
// // // //                     console.log("neval:", this.#currentVal)
                    
//                 }
//                 element = this.#currentVal[i];
// // // //                 console.log("element: ", element);
//                 if (!(element instanceof LiveTemplate)) throw new Error("")
// // // //                 console.log("val: ", val);
//                 element.update([val]);
//             });
//                 while (this.#currentVal.length > value.length) {
//                     const elem = this.#currentVal.pop();
//                     elem.unMountMe();
//                 }
            
// // // //             console.log("my new value is: ", this.#currentVal);
           
//         } else if (isPrimitive(value)) {
// // // //             console.log("set Primitive");
//             if (value === null || value === undefined || value !== this.#currentVal) {
//                 this.cleanup();
//             }
//             this.#currentVal = document.createTextNode(String(value));
// // // //             console.log("my new value is: ", this.#currentVal);
// // // //             // console.log("my ref: ", this.#nodeRef);
//             this.element.parentNode?.insertBefore(this.#currentVal, this.#nodeRef);
//         } else {
// // // //             // console.log("keine ahnung!");
//             throw new Error("was das für 1 wert?");
//         }
        
//     }

//     /** @type {Node} */
//     #nodeRef;
//     /** @type {Node} */
//     #nodeRefEnd;
//     #currentVal;
    
// }


// class AttributeBaseNode extends BaseNode {
//     /** @param {Element} element @param {string} name */
//     constructor(element, name, index) {
//         super(element, index);
//         this.attrName = name;
//     }
//     /** @type {string} */
//     attrName;
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

// export class AttributeMultiNode extends AttributeBaseNode {
//     constructor(element, name, strings, index) {
//         super(element, name, index);
//         this.strings = strings;
//         this.#argsCount = strings.length - 1;
//         this.#myArgs = new Array(this.argsCount).fill("");
//     }
//     #setAttr(changeCount, noneCount) {
// // // //         // console.log("SET MULI ATTRIBUTE!!, changeCount: ", changeCount, " | noneCount: ", noneCount);
// // // //         // console.log(this.element);
//         if (noneCount === this.#argsCount) {
//             this.element.removeAttribute(this.attrName);
//             return ;
//         }
//         if (changeCount === 0)
//             return ;
//         let res = "";
//         for (let i = 0; i != this.#argsCount; i++) {
//             res += this.strings[i] + this.#myArgs[i];
// // // //             // console.log("res: ",res);
//         }
//         res += this.strings[this.strings.length-1];
// // // //         // console.log("res: ", res);
//         this.element.setAttribute(this.attrName, res);
//     }
//     #changed = 0;
//     #changedC = 0;
//     #noneC = 0;
//     /** @param {string} value @param {number} index  */
//     setValue(value, index) {
//         index = index - this.index;
//         if (value === null || value === undefined || typeof value === "object" || typeof value === "function") value = "";
//         else if (typeof value != "string") value = String(value);
//         if (value !== this.#myArgs[index]) {
//             this.#myArgs[index] = value;
//             this.#changedC++;
//         }
// // // //         // console.log("mut attr index: ", index)
//         if (this.#myArgs[index] === "") this.#noneC++;
//         this.#changed++;
//         if (this.#changed === this.#argsCount) {
//             this.#changed = 0;
//             this.#setAttr(this.#changedC, this.#noneC);
//         }
//     }
//     get argsCount() {
//         return (this.#argsCount);
//     }

//     /** @type {string} */
//     strings;
//     /** @type {number} */
//     #argsCount;
//     /** @type {Array<string>} */
//     #myArgs;
// }

// export class AttributeBoolNode extends AttributeBaseNode {
//     constructor(element, name, index) {
//         super(element, name, index);
//     }
//     setValue(value, index) {
//         const b = Boolean(value);
//         if (b === this.#active)
//             return ;
//         if (!b) this.element.removeAttribute(this.attrName);
//         else this.element.setAttribute(this.attrName, "");
//     }
//     /** @type {boolean} */
//     #active = false;
// }

// export class AttributeEventNode extends AttributeBaseNode {
//     constructor(element, name, index) {
//         super(element, name, index);
//     }

//     /**
//      * @typedef {Object} EvHandler
//      * @property {EventListener} cb
//      * @property {boolean | AddEventListenerOptions} op
//      */

//     /**  @param {EvHandler} value */
//     setValue(value, index) {
//         // this.element.addEventListener()
//         if (value === undefined || value === null || value.cb === undefined) {
//             this.destroy();
//             return ;
//         }
//         if (value.cb !== this.#callback)
//             this.#callback = value.cb;
//         if (value.op !== this.#options) {
//             this.destroy();
//         }
//         if (this.#isOff) {
//             this.element.addEventListener(this.attrName, this.#handlerObj, this.#options);
//             this.#isOff = false;
//         }
        
//     }
//     destroy() {
//         if (!this.#isOff) {
//             this.element.removeEventListener(this.attrName, this.#handlerObj, this.#options);
//             this.#callback = undefined;
//             this.#options = undefined;
//             this.#isOff = true;
//         }
//     }
//     #callback;
//     #options;
//     #isOff = true;
//     /** @type {EventListenerObject} */
//     #handlerObj = {
//         handleEvent: (ev) => {
//             if (this.#callback) this.#callback();
//         }
//     };
// }

// export class AttributePropNode extends AttributeBaseNode {
//     constructor(element, name, index) {
//         super(element, name, index);
//     }
//     /** @param {any} value */
//     setValue(value, index) {
//         if (this.#val === value)
//             return ;
//         this.#val = value;
//         this.element[this.attrName] = value;
//     }
//     /** @type {any} */
//     #val;
// }

// export class FuncNode extends BaseNode {
//     constructor(elem, index) {
//         super(elem, index);
//     }
// }


// class SpecialNode {
//     constructor() {

//     }
   

//     // #templ;
//     // /** @type {Array<Node>} */
//     // #montPoints;
//     // /** @param {Element} element @param {Node} mountPoint  */
//     // mountMe(element, mountPoint) {
//     //     if (this.#templ) {
//     //         const frag = this.#templ.getCloned();
//     //         element.insertBefore(frag, mountPoint);
//     //         this.#montPoints.push(mountPoint);
//     //         return (true);
//     //     }
//     //     return (false);
//     // }

//     // removeMe() {
//     //     this.#montPoints.forEach((mp) => {

//     //     });
//     // }

//     #mountNodes;
//     /** @param {TemplateAsLiteral} val  */
//     #mountTempl(val) {
//         // const template = Templ.getTemplateInstance(val);
//     }

//     setValue(value, index) {
//         if (value === this.#currentVal) {
//             return ;

//         } else if (value instanceof TemplateAsLiteral) {
//             // render a literal
//         } else if (value instanceof Array) {
//             value.forEach((val) => {
//                 if (val instanceof Array)
//                     throw new Error("no no no! no Array inside Array");
//                 this.setValue(val);
//             });
//         } else if (isPrimitive(value)) {
//             this.element.insertBefore(document.createTextNode(String(value)), this.#nodeRef);
//         } else {
// // // //             // console.log("keine ahnung!");
//             throw new Error("was das für 1 wert?");
//         }

//         const n = new Node()
//         n.parentNode
        
//     }

//     /** @type {Node} */
//     #nodeRef;
//     /** @type {Node} */
//     #nodeRefEnd;
//     #currentVal;
//     element;
// }

