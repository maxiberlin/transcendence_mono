// import { walkingTheTemplate } from '../playground_treewalking.js';

import { AttributeEventNode, BaseNode } from './nodes.js';
import { useTemplateTreeWalker } from './template_walker.js';




       
        // let lo, j = strLeft.length;
        // while (true) {
        //     lo = strLeft.lastIndexOf("<", j);
        // //     console.log("lo:", lo);
        // //     console.log("j:", j);
        //     if (lo === -1) break ;
        //     const cmp = strLeft.slice(lo, lo+4)
        // //     console.log("cmp: ", cmp);
        //     if (cmp !== "<!--") break ;
        //     j = lo-1;
        // }
        // // console.log("lo found:", lo);
        // let lc, i = strLeft.length;
        // while (true) {
        //     lc = strLeft.lastIndexOf(">", i);
        // //     console.log("lc:", lc);
        // //     console.log("i:", i);
        //     if (lc === -1) break ;
        //     const cmp = strLeft.slice(Math.max(0,lc-3), lc+1)
        // //     console.log("cmp: ", cmp);
        //     if (cmp !== "-->") break ;
        //     i = lc-1;
        // }

        // const loo = strLeft.lastIndexOf("<"),
        //     lcc = strLeft.lastIndexOf(">");
        // const loComment = strLeft.slice(Math.max(lo), lo+4);
        // const lcComment = strLeft.slice(Math.max(lc-3, 0), lc+1);


        // const lo = strLeft.lastIndexOf("<"),
        //     lc = strLeft.lastIndexOf(">");
        // const loComment = strLeft.slice(Math.max(lo), lo+4);
        // const lcComment = strLeft.slice(Math.max(lc-3, 0), lc+1);
        // // console.log("lo: ", lo," | lc: ", lc, " | sliced after <: ", loComment);
        // // console.log("lo: ", lo," | lc: ", lc, " | sliced before >: ", lcComment);

export class TemplateAsLiteral {
    constructor(strings, values) {
        this.#strings = strings;
        this.#values = values;
    }
    get strings() {
        return (this.#strings);
    }
    get values() {
        return (this.#values);
    }
    /** @type {TemplateStringsArray} */
    #strings;
    /** @type {any[]} */
    #values;
}




/**
 * @param {TemplateStringsArray} strArr
 * @returns {TemplateAsLiteral}
 */
export function html(strArr, ...Args) {
    return new TemplateAsLiteral(strArr, Args);
}

/**
 * @param {TemplateStringsArray} strArr
 * @returns {CSSStyleSheet}
 */
export function css(strArr, ...Args) {
    if (strArr.length > 1) throw new Error("expressions are in css not allowed");
    // console.log("css: ",strArr[0]);
    // const sheet = new CSSStyleSheet();
    // const sheet = new CSSStyleSheet({baseURL: "http://127.0.0.1:5500"});
    const sheet = new CSSStyleSheet({baseURL: "127.0.0.1:5500"});
    sheet.replaceSync(strArr[0]);
    // console.log("sheet: ", sheet)
    return (sheet);
}



    // /**
    //  * 
    //  * @param {Node | null} node 
    //  * @param {ChildNode | null} childNode 
    //  * @param {any[]} values 
    //  * 
    //  * @param {Anim} [anims] 
    //  */
    // mountMe(node, childNode, values, anims) {
    //     if (this.#mounted || node === null)
    //         return ;
    //     this.#ret = this.#template.getLiveNodes();
    //     this.#parts = this.#ret.liveNodes;
    //     if (!(this.#ret.frag instanceof DocumentFragment))
    //         return ;

    //     this.#mounted = true;
    //     this.#nodes = Array.from(this.#ret.frag.childNodes);

    //     if (anims && this.#nodes instanceof Array) {
    //         if (anims.animType === "fade") {
    //             Promise.all(anims.promises).then(() => {
    //                 anims.unmount();
    //                 node.insertBefore(this.#ret.frag, childNode);
    //                 const animNodes = this.#nodes.filter(elem=>elem instanceof Element);
    //                 animNodes.forEach(node=>{if(node instanceof Element) node.animate([{opacity: 0}, {opacity: 1}],{ duration: anims.delay});})
    //                 if (values) this.update(values);
    //             })
    //         } else {




    //         }

        


    //     } else {
    //         node.insertBefore(this.#ret.frag, childNode);
    //         if (values) this.update(values);
    //     }
    // }


    // get template() {
    //     return (this.#template);
    // }

    // #mounted = false;

    // unMountNode(n) {
    //     if (n.nodeType === Node.ELEMENT_NODE)  {
    //         n.remove();
    //     }
    //     if (n.nodeType === Node.TEXT_NODE) n.remove();
    //     if (n.nodeType === Node.COMMENT_NODE) {
    //         const callable = this.#parts.find((liven) => liven.element === n);
    //         callable?.destroy();
    //         n.remove();
    //     }
    // }

    // /**
    //  * @typedef {Object} Anim
    //  * @property {number} delay
    //  * @property {Array< Promise<Animation> >} promises
    //  * @property {(delay?: number)=>undefined|Anim} unmount
    //  * @property {string} animType
    //  * @property {Array<HTMLElement>} elems
    //  */

    // /** @param {number} [delay] @returns {Anim | undefined} @param {string} [animType]  */
    // unMountMe(delay, animType) {
    //     if(!this.#mounted)
    //         return ;
    //     if (typeof delay === "number") {
    //         /** @type {Array< Promise<Animation> >} */
    //         let anims = [];
    //         let elems = [];
    //         if (!animType) {
    //             /** @type {Array< Promise<Animation> >} */
    //             let anims = [];
    //             this.#nodes.forEach((e)=>{
    //                 if(e instanceof Element) anims.push(e.animate([{opacity: 1}, {opacity: 0}],{ duration: delay}).finished);
    //             });
    //         } else {
    //             elems = this.#nodes.filter(n=>n instanceof HTMLElement)
    //         }
    //         return {
    //             delay: delay,
    //             promises: anims,
    //             unmount: this.unMountMe.bind(this),
    //             animType: animType ?? "fade",
    //             elems: elems
    //         }
    //     }
        
    //     this.#parts.forEach((part) => { if (part instanceof AttributeEventNode) part.destroy(); });
    //     this.#nodes.forEach((n) => { this.unMountNode(n) });
    //     this.#mounted = false;
    // }




 /**
 * @typedef {Object} Anim
 * @property {number} delay
 * @property {string} animType
 * @property {boolean} animate
 * @property {string} [dir]
 * @property {Array<Element>} [__elem]
 * @property {(delay?: number)=>undefined|Anim} [__unmount]
 */


export class LiveTemplate {
    /** @param {Template} template */
    constructor(template) {
        this.#template = template;
       
    }

    /**
     * 
     * @param {Node | null} node 
     * @param {ChildNode | null} childNode 
     * @param {any[]} values 
     * 
     * @param {Anim} [anim] 
     */
    mountMe(node, childNode, values, anim) {
        if (this.#mounted || node === null)
            return ;
        this.#ret = this.#template.getLiveNodes();
        this.#parts = this.#ret.liveNodes;
        const fragment = this.#ret.frag;
        if (!(fragment instanceof DocumentFragment))
            return ;

        this.#mounted = true;
        this.#nodes = Array.from(this.#ret.frag.childNodes);


        if (anim && this.#nodes instanceof Array && this.#ret.frag instanceof DocumentFragment && node instanceof HTMLElement) {
            const moveNodes = (nodes, parent, before) => {

            };
            // console.log("BEFORE ANIM, nodes: ", this.#nodes);
            

            if (values) this.update(values);

            /** @type {HTMLElement} */
            const myNode = document.createElement("div");
            // myNode.append(this.#nodes);
            this.#nodes.forEach((n)=>{ 
                // console.log("move nodes!: ", n);
                // console.dir(n);
                // console.log("move nodes target?: ", n.___animtarget);
                // if(n.___animtarget === true) {
                //     console.log("anim target!: ", n);
                //     myNode.insertBefore(n, null);
                // }
                myNode.insertBefore(n, null);
            });
            
            node.appendChild(myNode);
            
            const parentRect = node.getBoundingClientRect();
            const myRect = myNode.getBoundingClientRect();
            // console.log("parent rect: ", parentRect)
            // console.log("my rect: ", myRect)
            // console.log("dir: ", anim.dir)
            // console.log("myNode: ", myNode)
            const transY = parentRect.y - myRect.y;
            const transX = anim.dir === "left" ? -parentRect.width : parentRect.width;
            myNode.style.translate = `${transX}px ${transY}px`;
            
            node.animate(
                [{ translate: `${-transX}px 0px` }], {duration: anim.delay, easing: "ease-in-out"}
            ).finished.then((animation)=>{
                if (anim.__unmount) anim.__unmount();
                // console.log("ANIM DONE, nodes: ", this.#nodes);
                this.#nodes.forEach((n)=>{ node.insertBefore(n, null); });
                if (values) this.update(values);
                myNode.remove();
                // console.log("now prev rect: ", node.getBoundingClientRect())
                // console.log("now my rect: ", node.firstElementChild.getBoundingClientRect())
            })

        } else {
            // console.log("no animate!")
            // console.log("mount this!: ", this.#ret.frag);
            // console.log("vals: ", values);
            node.insertBefore(this.#ret.frag, childNode);
            if (values) this.update(values);
        }
    }


    get template() {
        return (this.#template);
    }
   

    #mounted = false;

    unMountNode(n) {
        if (n.nodeType === Node.ELEMENT_NODE)  {
            n.remove();
        }
        if (n.nodeType === Node.TEXT_NODE) n.remove();
        if (n.nodeType === Node.COMMENT_NODE) {
            const callable = this.#parts.find((liven) => liven.element === n);
            callable?.destroy();
            n.remove();
        }
    }

   

    /** @param {Anim} [anim] @returns {Anim | undefined} */
    unMountMe(anim) {
        // console.log("UNMOUNT ME")
        if(!this.#mounted)
            return ;
        // console.log("my Node Len: ", this.#nodes)
        // console.log("anim: ", anim)
        if (anim && anim.animate) {
                const doAnimate = anim.animate ?? false;
            anim.animate = false;
            return {
                delay: anim.delay ?? 200,
                // @ts-ignore
                __elem: this.#nodes.filter(n=>n.nodeType === Node.ELEMENT_NODE),
                __unmount: this.unMountMe.bind(this),
                animType: anim.animType ?? "fade",
                animate: doAnimate,
                dir: anim.dir
            } 
           
        }
        // console.log("unmount: ", this.#nodes);

        this.#parts.forEach((part) => { if (part instanceof AttributeEventNode) part.destroy(); });
        this.#nodes.forEach((n) => { this.unMountNode(n) });
        this.#mounted = false;
    }

    /** @param {any[]} values  */
    update(values) {
        // console.log("update!: ", values);
        if (values.length !== this.#template.valueArrLen) {
            // console.log("error value length: ");
            // console.log("value: ", values);
            // console.log("this.#template.valueArrLen: ", this.#template.valueArrLen);
            throw new Error("length not fitting");
        }
        for (let i = 0; i != values.length; i++) {
            if (this.#parts[i]) this.#parts[i].setValue(values[i], i);
        }
    }
    /** @type {Template} */
    #template;
    /** @type {Array<Text | Comment | Element | ChildNode>} */
    #nodes;
    /** @type {BaseNode[]} */
    #parts;
    #ret;
}

export class Template {
    #valueLen;
    #strings;
    #getLive;
    #domTemplate;

    static #templStr = "templ";
    static #attributeMarker = `$${this.#templStr}$`;
    static #valueMarker = `$${this.#templStr}$${Math.random().toString().slice(2, 4)}$`;
    static #commentMarker = `<?${this.#valueMarker}>`;

    static #getStale = useTemplateTreeWalker(this.#attributeMarker, this.#valueMarker, "?"+this.#valueMarker);


    /** @param {TemplateStringsArray} strings  */
    constructor(strings) {
        this.#strings = strings;
        this.#valueLen = strings.length - 1;
        for (let i = 0; i < this.#valueLen; i++)
            this.#defTemplate(strings[i], strings[i + 1]);
        this.#strRes += strings[strings.length-1];
        this.#domTemplate = document.createElement("template");
        this.#domTemplate.innerHTML = this.#strRes;
        this.#getLive = Template.#getStale(this.#domTemplate.content, this.#valueLen);
    }

    get literalStrings() {
        return (this.#strings);
    }

    get result() {
        return (this.#strRes);
    }
    get valueArrLen() {
        return (this.#valueLen);
    }

    /**
     * 
     */
    getLiveNodes() {

        const frag = this.#domTemplate.content.cloneNode(true);
        if (!(frag instanceof DocumentFragment)) throw new Error("!!")
        const liveNodes = this.#getLive(frag);
        return ({frag, liveNodes});

    }
    
    #selfMarkers = 0;
    #prev = 0;
    #strRes = "";
    /** @param {string} strLeft @param {string} strRight */
    #defTemplate(strLeft, strRight) {
    
        const addInnerMarker = (qPos) => {
            const qul = strLeft.lastIndexOf("\"");
            const qur = strRight.indexOf("\"");
            if (qPos !== -1 && qPos == strLeft.length-1 || qPos === qul-1) {
                this.#strRes +=
                    strLeft.slice(0, qPos) + Template.#attributeMarker +
                    strLeft.slice(qPos, strLeft.length) + Template.#valueMarker;
                this.#prev = (qul > qPos && qur === -1) ? 1 : -1
            } else {
                if (this.#prev === 1 && qul === -1) {
                    this.#strRes += strLeft + Template.#valueMarker;
                    if (qur > -1) this.#prev = -1;
                } else {
                    this.#strRes += strLeft + this.#selfMarkers.toString() + Template.#attributeMarker + "=\"" + Template.#valueMarker + "\"";
                    this.#selfMarkers++;
                    this.#prev = -1;
                }
                
            }
        }

        /** @param {string} delim @param {string} cmp @param {boolean} rev */
        const makeCmp = (delim, cmp, rev) => {
            let lo = 0, j = strLeft.length;
            while (lo !== -1) {
                lo = strLeft.lastIndexOf(delim, j);
                if (lo !== -1) {
                    const start = rev ? lo-cmp.length : lo;
                    const end = rev ? lo+1 : lo+cmp.length;
                    const c = strLeft.slice(Math.max(0, start), Math.max(0, end))
                    if (c !== cmp) break ;
                }
                j = lo-1;
            }
            return (lo);
        };
        const lo = makeCmp("<", "<!--", false);
        const lc = makeCmp(">", "-->", true);

        if (lo > lc) {
            this.#prev = 0;
            const qPos = strLeft.lastIndexOf("=");
            addInnerMarker(qPos < lo ? -1 : qPos);
        } else if (lc > lo) {
            this.#prev = 0;
            this.#strRes += strLeft + Template.#commentMarker;
            this.#prev = 2;
        } else if (lc === -1 && lo === -1) {
            if (this.#prev === 1 || this.#prev === -1) {
                addInnerMarker(strLeft.lastIndexOf("="));
            } else {
                this.#strRes += strLeft + Template.#commentMarker;
            }
        }
    }

    /**
     * @param {TemplateStringsArray} strings 
     * @returns {Template}
     */
    static getTemplate(strings) {
        let t = this.#cache.get(strings);
        if (t === undefined) {
            t = new Template(strings);
            this.#cache.set(strings, t);
        }
        return (t);
    }
 
    /**
     * @param {TemplateStringsArray} strings 
     * @returns {LiveTemplate}
     */
    static getInstance(strings) {
        const t = this.getTemplate(strings);
        return (new LiveTemplate(t));
    }
    /** @type {WeakMap<TemplateStringsArray, Template>} */
    static #cache = new WeakMap();
}


























// export class LiveTemplate {
//     /** @param {Template} template  */
//     constructor(template, node, childNode) {
//         this.#template = template;
//             this.#ret = template.getLiveNodes();
//             this.#parts = this.#ret.liveNodes;
// //             // console.log("was dasss:",this.#ret.liveNodes);
//             if (this.#ret.frag instanceof DocumentFragment) {
//                 // this.#nodes = Array.from(this.#ret.frag.children).map((e)=>{
// //                 // //     console.log("add dis: ", e);
//                 // });
//                 // this.#nodes = Array.from(this.#ret.frag.children);
//                 this.#nodes = Array.from(this.#ret.frag.childNodes);
// //                 // console.log("constr. cildren: ", this.#nodes)
// //                 // console.log("SET LIVE!");
// //                 // console.log(this.#parts);
//                 node.insertBefore(this.#ret.frag, childNode);
//                 this.#mounted = true;
//             } else {
// //                 // console.log("geht nicht1");
//             }

//     }
//     get template() {
//         return (this.#template);
//     }

//     #mounted = false;
//     unMountMe() {
// //         // console.log("unmountme, mounted? ", this.#mounted)
//         if(!this.#mounted)
//             return ;
//         this.close();
// //         // console.log("nodes: ", this.#nodes)

//         // if (this.#nodes instanceof Array) {
//         //     this.#nodes.forEach((elem) => {
// //         //         // console.log("to remove: ", elem)
//         //         elem.remove();
//         //     })
//         //     this.#mounted = false;
//         // }
//     }

   
//     close() {
//         for (let i = 0; i != this.#parts.length; i++) {
// //             // console.log("liveNode: ", this.#parts[i])
//             if (this.#parts[i]) this.#parts[i].destroy();
//         }
//     }

//     /** @param {any[]} values  */
//     update(values) {
// //         console.log("values len: ", values.length);
// //         console.log("this.#template.valueArrLen: ", this.#template.valueArrLen);
//         if (values.length !== this.#template.valueArrLen)
//             throw new Error("length not fitting");
//         for (let i = 0; i != values.length; i++) {
// //             // console.log("liveNode: ", this.#parts[i])
//             if (this.#parts[i]) this.#parts[i].setValue(values[i], i);
//         }
//     }
//     /** @type {Template} */
//     #template;
//     /** @type {Element | Element[]} */
//     #nodes;
//     /** @type {BaseNode[]} */
//     #parts;
//     #ret;
// }

// export class Template {
//     #valueLen;
//     #strings;
//     #getLive;
//     #domTemplate;

//     static #templStr = "templ";
//     static #attributeMarker = `$${this.#templStr}$`;
//     static #valueMarker = `$${this.#templStr}$${Math.random().toString().slice(2, 4)}$`;
//     static #commentMarker = `<?${this.#valueMarker}>`;

//     static #getStale = useTemplateTreeWalker(this.#attributeMarker, this.#valueMarker, "?"+this.#valueMarker);


//     /** @param {TemplateStringsArray} strings  */
//     constructor(strings) {
//         this.#strings = strings;
// //         // console.log("Template constructor: ", strings);
//         this.#valueLen = strings.length - 1;
//         for (let i = 0; i < this.#valueLen; i++)
//             this.#defTemplate(strings[i], strings[i + 1]);
//         this.#strRes += strings[strings.length-1];
// //         console.log("RESS: ", this.#strRes)
// //         // console.log("strres: ", this.#strRes);
//         this.#domTemplate = document.createElement("template");
//         this.#domTemplate.innerHTML = this.#strRes;
// //         console.log("created nodes: ", this.#domTemplate.content)
//         this.#getLive = Template.#getStale(this.#domTemplate.content, this.#valueLen);
//     }

//     get literalStrings() {
//         return (this.#strings);
//     }

//     get result() {
//         return (this.#strRes);
//     }
//     get valueArrLen() {
//         return (this.#valueLen);
//     }

//     /**
//      * 
//      */
//     getLiveNodes() {

//         const frag = this.#domTemplate.content.cloneNode(true);
//         if (!(frag instanceof DocumentFragment)) throw new Error("!!")
//         const liveNodes = this.#getLive(frag);
//         return ({frag, liveNodes});

//     }
    
//     #selfMarkers = 0;
//     #prev = 0;
//     #strRes = "";
//     /** @param {string} strLeft @param {string} strRight */
//     #defTemplate(strLeft, strRight) {
    
// //         // console.log("strleft: ", strLeft)
//         const addInnerMarker = (qPos) => {
//             const qul = strLeft.lastIndexOf("\"");
//             const qur = strRight.indexOf("\"");
//             if (qPos === -1) {
//                 if (this.#prev === 1 && qul === -1) {
//                     this.#strRes += strLeft + Template.#valueMarker;
//                     if (qur > -1) this.#prev = -1;
//                 } else {
//                     this.#strRes += strLeft + this.#selfMarkers.toString() + Template.#attributeMarker + "=\"" + Template.#valueMarker + "\"";
//                     this.#selfMarkers++;
//                     this.#prev = -1;
//                 }
//             } else {
//                 this.#strRes +=
//                     strLeft.slice(0, qPos) + Template.#attributeMarker +
//                     strLeft.slice(qPos, strLeft.length) + Template.#valueMarker;
//                 this.#prev = (qul > qPos && qur === -1) ? 1 : -1
           
//             }
//         }
//         const lo = strLeft.lastIndexOf("<"),
//             lc = strLeft.lastIndexOf(">");
//         if (lo > lc) {
//             this.#prev = 0;
//             addInnerMarker(strLeft.lastIndexOf("="));
//         } else if (lc > lo) {
//             this.#prev = 0;
//             this.#strRes += strLeft + Template.#commentMarker;
//             this.#prev = 2;
//         } else if (lc === -1 && lo === -1) {
//             if (this.#prev === 1 || this.#prev === -1) {
//                 addInnerMarker(strLeft.lastIndexOf("="));
//             } else {
//                 this.#strRes += strLeft + Template.#commentMarker;
//             }
//         }
//     }
//     static getTemplate(strings) {
//         let t = this.#cache.get(strings);
//         if (t === undefined) {
// //             console.log("CREATE NEW TEMPLATE");
//             t = new Template(strings);
//             this.#cache.set(strings, t);
//         } else {
// //             console.log("RETURN CACHED TEMPLATE");
//         }
//         return (t);
//     }

 
//     /** @param {TemplateStringsArray} strings  */
//     static getInstance(strings, node, childNode) {
//         // /** @type {Template | undefined} */
//         // let t = this.#cache.get(strings);
//         // if (t === undefined) {
//         //     t = new Template(strings);
//         //     this.#cache.set(strings, t);
//         // }
//         const t = this.getTemplate(strings);
//         return (new LiveTemplate(t, node, childNode));
//     }
//     /** @type {WeakMap<TemplateStringsArray, Template>} */
//     static #cache = new WeakMap();
// }

