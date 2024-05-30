
/**
 * @typedef {Object} StaleNode
 * @property {number} t
 * @property {number} i
 * @property {string} [n]
 * @property {Array<string>} [s]
 */

import {
    BaseNode,
    OuterNode,
    FuncNode,
    AttributeBoolNode,
    AttributeEventNode,
    AttributePropNode,
    AttributeSingleNode,
    AttributeMultiNode
} from './nodes.js';


const wTypes = {
    outer: 0,
    func: 1,
    prop: 2,
    bool: 3,
    event: 4,
    singleAttr: 5,
    multiAttr: 6,
    none: 7
};

/**
 * @param {Array<StaleNode | null>} parts 
 * @param {Node} node
 * @param {string} attributeMarker 
 * @param {string} attributeMarker 
 */
function handleDynamicAttribute(parts, node, attributeMarker, valueMarker, nodeCount) {
    if (!(node instanceof Element)) throw new Error("no element node");
    if (!node.hasAttributes()) return ;

    const attrsToRemove = [];
    for (const name of node.getAttributeNames()) {
        if (!name.endsWith(attributeMarker))
            continue ;
        // console.log("attr element to add: ", node);
        if (name.charCodeAt(0) >= '0'.charCodeAt(0) && name.charCodeAt(0) <= '9'.charCodeAt(0)) {
            // console.log("is a Func Node!: ", name, " | node: ", node);
            parts.push({t: wTypes.func,  i: nodeCount});
            attrsToRemove.push(name);
        } else {
            const realName = name.slice(0, name.length - attributeMarker.length)
            // console.log("real name: ", realName)
            attrsToRemove.push(name);
            if (realName !== undefined) {
                let type;
                if (name[0] === '.') {
                    parts.push({t: wTypes.prop,  i: nodeCount, n: realName.slice(1, realName.length)});
                } else if (name[0] === '?') {
                    parts.push({t: wTypes.bool,  i: nodeCount, n: realName.slice(1, realName.length)});
                } else if (name[0] === '@') {
                    // console.log("is a event Node!: ", name, " | node: ", node);
                    parts.push({t: wTypes.event,  i: nodeCount, n: realName.slice(1, realName.length)});
                } else {
                    const valueArr = node.getAttribute(name)?.split(valueMarker);
                    for (let i = 0; valueArr && i != valueArr.length-1; i++)
                        parts.push({t: wTypes.multiAttr,  i: nodeCount, n: realName, s: valueArr});
                    // if (valueArr && valueArr.length === 2 && valueArr[0] === "" && valueArr[1] === "") {
                    //     parts.push({t: wTypes.singleAttr,  i: nodeCount, n: realName});
                    // } else if (valueArr && valueArr.length > 2) {
                    //     for (let i = 0; i != valueArr.length-1; i++)
                    //         parts.push({t: wTypes.multiAttr,  i: nodeCount, n: realName, s: valueArr});
                    // }
                }
            }
        }
    }
    for (const name of attrsToRemove) {
        node.removeAttribute(name);
    }
}

/**
 * @param {Array<StaleNode | null>} parts 
 * @param {string} text 
 * @param {string} marker 
 */
function handleUnwanted(parts, text, marker) {
    let i = 0, j = 0;
    let k = 0;
    while (true) {
        // console.log("FIND!!!")
        j = text.indexOf(marker, i);
        if (k++ > 1000 || j === -1)
            break ;
        parts.push( null );
        i = j + marker.length;
    }
}

/**
 * @param {Array<StaleNode | null>} parts 
 * @param {Node} node
 * @param {string} valueMarker 
 * @param {string} commentMarker 
 */
function handleDynamicText(parts, node, valueMarker, commentMarker, nodeCount) {
    if (!(node instanceof Comment)) throw new Error("no comment node");
    // // console.log("handle Comment")

    if (node.data === commentMarker) {
        // // console.log("is my marker");
        parts.push({t: wTypes.outer,  i: nodeCount});
    } else {
        // // // console.log("is unwanted: ", node);
        handleUnwanted(parts, node.data, valueMarker);
    }
}

/**
 * @param {TreeWalker} walker
 * @param {number} maxNodes 
 * @param {Array<StaleNode | null>} staleNodes 
 * @param {string} attrMarker
 * @param {string} valueMarker
 * @param {string} commentMarker
 */
function walkingTheTemplate(walker, maxNodes, staleNodes, attrMarker, valueMarker, commentMarker) {
    let node;
    let nodeCount = 1;
    while ((node = walker.nextNode()) !== null) {
        // console.log("get stale: index: ", nodeCount, " | node: ", node);
        if (node.nodeType === Node.ELEMENT_NODE && node instanceof Element) {
            if (/^(?:script|style|textarea|title)$/i.test(node.tagName) && node.textContent) {
                handleUnwanted(staleNodes, node.textContent, valueMarker);
            } else {
                handleDynamicAttribute(staleNodes, node, attrMarker, valueMarker, nodeCount);
            }
        } else if (node.nodeType === Node.COMMENT_NODE) {
            handleDynamicText(staleNodes, node, valueMarker, commentMarker, nodeCount);
        }
        nodeCount++;
    }
    // console.log("maxNodes: ", maxNodes)
    // console.log("stale nodes: ", staleNodes)
    if (staleNodes.length !== maxNodes)
        throw new Error("Not same number :o");
}


/**
 * @param {TreeWalker} walker
 * @param {Array<StaleNode | null>} staleNodes 
 */
function resolveTemplate(walker, staleNodes) {
    let nodeCount = 0;
    let i = 0;
    let liveNodes = new Array();
    while(i < staleNodes.length) {
        if (staleNodes[i] === null)
            i++;
        if (staleNodes[i] !== null && staleNodes[i]?.i === nodeCount) {
            const st = staleNodes[i];
            const node = walker.currentNode;
            // console.log("stale: ", st, " | node: ", node);
            if (staleNodes[i]?.t === wTypes.outer) {
                liveNodes.push(new OuterNode(node, i));
            } else if (staleNodes[i]?.t === wTypes.func) {
                liveNodes.push(new FuncNode(node, i));
            } else if (staleNodes[i]?.t === wTypes.prop) {
                liveNodes.push(new AttributePropNode(node, st?.n, i));
            } else if (staleNodes[i]?.t === wTypes.bool) {
                liveNodes.push(new AttributeBoolNode(node, st?.n, i));
            } else if (staleNodes[i]?.t === wTypes.event) {
                liveNodes.push(new AttributeEventNode(node, st?.n, i));
            } else if (staleNodes[i]?.t === wTypes.singleAttr) {
                liveNodes.push(new AttributeSingleNode(node, st?.n, i));
            } else if (staleNodes[i]?.t === wTypes.multiAttr) {
                const len = staleNodes[i]?.s?.length;
                if (!len) throw new Error("!!!!");
                const e = new AttributeMultiNode(node, st?.n, st?.s, i);
                for (let k = 0; k != len-1; k++, i++) {
                    liveNodes.push(e);
                    if (staleNodes[i]?.t !== wTypes.multiAttr) throw new Error("INVALID MULT NODE COUNT");
                }
                i--;
            } else if (staleNodes[i]?.t === wTypes.none)  {
                liveNodes.push(null);
            }

            i++;
        } else {
            nodeCount++;
            walker.nextNode();
        }
    }
    return (liveNodes)
}



export function useTemplateTreeWalker(attrMarker, valueMarker, commentMarker) {
    const walker = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT);
    const getStale = (parentNode, maxNodes) => {
        const staleNodes = [];
        walker.currentNode = parentNode;
        walkingTheTemplate(walker, maxNodes, staleNodes, attrMarker, valueMarker, commentMarker);
        const getLive = (parentNode) => {
            walker.currentNode = parentNode;
            return (resolveTemplate(walker, staleNodes));
        };
        return (getLive);
    };
    return (getStale);
}
