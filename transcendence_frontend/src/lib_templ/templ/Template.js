// eslint-disable-next-line import/no-cycle
import useTemplateTreeWalker, {
    commentMarker,
    attributeMarker,
    valueMarker,
} from './templateWalker.js';
import LiveTemplate from './LiveTemplate';

/**
 * @returns {(strLeft: string, strRight: string, qPos: number | undefined) => string}
 */
export function useInnerHtmlMarker() {
    let selfMarkers = 0;
    let prev = 0;
    let result = '';
    /**
     * @param {string} strLeft
     * @param {string} strRight
     * @returns {string}
     */
    const addMarker = (strLeft, strRight) => {
        const qul = strLeft.lastIndexOf('"');
        const qur = strRight.indexOf('"');
        const qPos = strLeft.lastIndexOf('=');
        let tmpRes = '';
        if ((qPos !== -1 && qPos === strLeft.length - 1) || qPos === qul - 1) {
            prev = qul > qPos && qur === -1 ? 1 : -1;
            tmpRes = `${strLeft.slice(0, qPos)}${attributeMarker}${strLeft.slice(qPos, strLeft.length)}${valueMarker}`;
        } else if (prev === 1 && qul === -1) {
            if (qur > -1) prev = -1;
            tmpRes = `${strLeft}${valueMarker}`;
        } else {
            tmpRes = `${strLeft}${selfMarkers.toString()}${attributeMarker}="${valueMarker}"`;
            selfMarkers++;
            prev = -1;
        }
        result += tmpRes;
        return result;
    };
    return addMarker;
}

/**
 * @param {string} str
 * @param {string} excludeLeft
 * @param {string} delim
 * @param {string} excludeRight
 * @returns {number}
 */
export const getLastIndexOf = (str, excludeLeft, delim, excludeRight) => {
    const getString = (pos, cmpLeft) => {
        if (cmpLeft)
            return str.slice(
                Math.max(0, pos - (excludeLeft.length + 1)),
                Math.max(0, pos),
            );
        return str.slice(
            Math.max(0, pos + 1),
            Math.max(0, pos + excludeRight.length),
        );
    };
    let lo = 0;
    let j = str.length;
    while (lo !== -1) {
        lo = str.lastIndexOf(delim, j);
        if (lo !== -1) {
            const left = getString(lo, true);
            const right = getString(lo, false);
            if (
                (excludeLeft.length === 0 || left !== excludeLeft) &&
                (excludeRight.length === 0 || right !== excludeRight)
            )
                break;
        }
        j = lo - 1;
    }
    return lo;
};

const htmlPos = {
    inner: 0,
    outer: 1,
};

/**
 * @param {string} str
 * @returns {number}
 */
export const getHtmlPosition = (str) => {
    // const lastPos = -1;
    // const getString = (pos, cmpLeft) => {
    //     if (cmpLeft)
    //         return str.slice(
    //             Math.max(0, pos - (excludeLeft.length + 1)),
    //             Math.max(0, pos),
    //         );
    //     return str.slice(
    //         Math.max(0, pos + 1),
    //         Math.max(0, pos + excludeRight.length),
    //     );
    // };
    // let lo = 0;
    // let j = str.length;
    // let openPos = -1;
    // let closePos = -1;
    for (let i = str.length; i >= 0; i--) {
        const c = str[i];
        if (c === '>') console.log('>: ', str.slice(i - 2, 1));
        if (c === '<') console.log('<: ', str.slice(i, 2));
        // if (c === '>' && str.slice(i - 2, 1) !== '-->') {
        //     closePos = i;
        //     break;
        // }
    }
    // while (lo !== -1) {
    //     lo = str.lastIndexOf(delim, j);
    //     if (lo !== -1) {
    //         const left = getString(lo, true);
    //         const right = getString(lo, false);
    //         if (
    //             (excludeLeft.length === 0 || left !== excludeLeft) &&
    //             (excludeRight.length === 0 || right !== excludeRight)
    //         )
    //             break;
    //     }
    //     j = lo - 1;
    // }
    return lo;
};

export default class Template {
    /** @type {WeakMap<TemplateStringsArray, Template>} */
    static #cache = new WeakMap();

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
        return t;
    }

    /**
     * @param {TemplateStringsArray} strings
     * @returns {import('./LiveTemplate').default}
     */
    static getInstance(strings) {
        const t = this.getTemplate(strings);
        return new LiveTemplate(t);
    }

    static #getStale = useTemplateTreeWalker();

    /**
     * @param {TemplateStringsArray} strings
     */
    constructor(strings) {
        this.#strings = strings;
        this.#valueLen = strings.length - 1;
        for (let i = 0; i < this.#valueLen; i++)
            this.#defTemplate(strings[i], strings[i + 1]);
        this.#strRes += strings[strings.length - 1];
        this.#domTemplate = document.createElement('template');
        this.#domTemplate.innerHTML = this.#strRes;
        this.#getLive = Template.#getStale(
            this.#domTemplate.content,
            this.#valueLen,
        );
    }

    #valueLen;

    #strings;

    #getLive;

    #domTemplate;

    get literalStrings() {
        return this.#strings;
    }

    get result() {
        return this.#strRes;
    }

    get valueArrLen() {
        return this.#valueLen;
    }

    /**
     * @returns {{frag: DocumentFragment, liveNodes: any[]}}
     */
    getLiveNodes() {
        const frag = this.#domTemplate.content.cloneNode(true);
        if (!(frag instanceof DocumentFragment)) throw new Error('!!');
        const liveNodes = this.#getLive(frag);
        return { frag, liveNodes };
    }

    #selfMarkers = 0;

    #prev = 0;

    #strRes = '';

    /**
     * @param {string} strLeft
     * @param {string} strRight
     */
    #defTemplate(strLeft, strRight) {
        const addInnerMarker = (/** @type {number | undefined} */ qPos) => {
            const qul = strLeft.lastIndexOf('"');
            const qur = strRight.indexOf('"');
            if (
                (qPos !== -1 && qPos === strLeft.length - 1) ||
                qPos === qul - 1
            ) {
                this.#strRes +=
                    strLeft.slice(0, qPos) +
                    attributeMarker +
                    strLeft.slice(qPos, strLeft.length) +
                    valueMarker;
                this.#prev = qul > qPos && qur === -1 ? 1 : -1;
            } else if (this.#prev === 1 && qul === -1) {
                this.#strRes += strLeft + valueMarker;
                if (qur > -1) this.#prev = -1;
            } else {
                this.#strRes += `${
                    strLeft + this.#selfMarkers.toString() + attributeMarker
                }="${valueMarker}"`;
                this.#selfMarkers++;
                this.#prev = -1;
            }
        };

        /**
         * @param {string} delim
         * @param {string} cmp
         * @param {boolean} rev
         * @returns {number}
         */
        const makeCmp = (delim, cmp, rev) => {
            let lo = 0;
            let j = strLeft.length;
            while (lo !== -1) {
                lo = strLeft.lastIndexOf(delim, j);
                if (lo !== -1) {
                    const start = rev ? lo - cmp.length : lo;
                    const end = rev ? lo + 1 : lo + cmp.length;
                    const c = strLeft.slice(
                        Math.max(0, start),
                        Math.max(0, end),
                    );
                    if (c !== cmp) break;
                }
                j = lo - 1;
            }
            return lo;
        };
        const lo = makeCmp('<', '<!--', false);
        const lc = makeCmp('>', '-->', true);

        if (lo > lc) {
            this.#prev = 0;
            const qPos = strLeft.lastIndexOf('=');
            addInnerMarker(qPos < lo ? -1 : qPos);
        } else if (lc > lo) {
            this.#prev = 0;
            this.#strRes += strLeft + commentMarker;
            this.#prev = 2;
        } else if (lc === -1 && lo === -1) {
            if (this.#prev === 1 || this.#prev === -1) {
                addInnerMarker(strLeft.lastIndexOf('='));
            } else {
                this.#strRes += strLeft + commentMarker;
            }
        }
    }
}
