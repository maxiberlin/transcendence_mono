import AttributeBoolNode from './nodes/AttributeBoolNode';
import AttributeEventNode from './nodes/AttributeEventNode';
import AttributeMultiNode from './nodes/AttributeNode';
import AttributePropNode from './nodes/AttributePropNode';
import FuncNode from './nodes/FuncNode';
// eslint-disable-next-line import/no-cycle
import OuterNode from './nodes/OuterNode';

/**
 * @typedef {object} StaleNode
 * @property {number} t
 * @property {number} i
 * @property {string} [n]
 * @property {Array<string>} [s]
 */

const wTypes = {
    outer: 0,
    func: 1,
    prop: 2,
    bool: 3,
    event: 4,
    multiAttr: 7,
    none: 8,
};

/**
 * @param {Array<StaleNode | null>} parts
 * @param {Node} node
 * @param {string} attributeMarker
 * @param {string} valueMarker
 * @param {number} nodeCount
 */
function handleDynamicAttribute(
    parts,
    node,
    attributeMarker,
    valueMarker,
    nodeCount,
) {
    if (!(node instanceof Element)) throw new Error('no element node');
    if (!node.hasAttributes()) return;

    const attrsToRemove = [];

    node.getAttributeNames().forEach((name) => {
        // console.log('yoyoyo, schau mal, check attr noodes');
        if (name.endsWith(attributeMarker)) {
            // console.log("attr element to add: ", node);
            if (
                name.charCodeAt(0) >= '0'.charCodeAt(0) &&
                name.charCodeAt(0) <= '9'.charCodeAt(0)
            ) {
                // console.log("is a Func Node!: ", name, " | node: ", node);
                parts.push({ t: wTypes.func, i: nodeCount });
                attrsToRemove.push(name);
            } else {
                const realName = name.slice(
                    0,
                    name.length - attributeMarker.length,
                );
                // console.log("real name: ", realName)
                attrsToRemove.push(name);
                if (realName !== undefined) {
                    if (name[0] === '.') {
                        parts.push({
                            t: wTypes.prop,
                            i: nodeCount,
                            n: realName.slice(1, realName.length),
                        });
                    } else if (name[0] === '?') {
                        parts.push({
                            t: wTypes.bool,
                            i: nodeCount,
                            n: realName.slice(1, realName.length),
                        });
                    } else if (name[0] === '@') {
                        // console.log("is a event Node!: ", name, " | node: ", node);
                        parts.push({
                            t: wTypes.event,
                            i: nodeCount,
                            n: realName.slice(1, realName.length),
                        });
                    } else {
                        const valueArr = node
                            .getAttribute(name)
                            ?.split(valueMarker);
                        for (
                            let i = 0;
                            valueArr && i !== valueArr.length - 1;
                            i++
                        )
                            parts.push({
                                t: wTypes.multiAttr,
                                i: nodeCount,
                                n: realName,
                                s: valueArr,
                            });
                    }
                }
            }
        }
    });
    attrsToRemove.forEach((name) => node.removeAttribute(name));
}

/**
 * @param {Array<StaleNode | null>} parts
 * @param {string} text
 * @param {string} marker
 */
function handleUnwanted(parts, text, marker) {
    let i = 0;
    let j = 0;
    let k = 0;
    while (j !== -1) {
        // console.log('FIND!!!');
        j = text.indexOf(marker, i);
        if (k++ > 1000 || j === -1) break;
        parts.push(null);
        i = j + marker.length;
    }
}

/**
 * @param {Array<StaleNode | null>} parts
 * @param {Node} node
 * @param {string} valueMarker
 * @param {string} commentMarker
 * @param {number} nodeCount
 */
function handleDynamicText(parts, node, valueMarker, commentMarker, nodeCount) {
    if (!(node instanceof Comment)) throw new Error('no comment node');
    // // console.log("handle Comment")

    if (node.data === commentMarker) {
        // // console.log("is my marker");
        parts.push({ t: wTypes.outer, i: nodeCount });
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
function walkingTheTemplate(
    walker,
    maxNodes,
    staleNodes,
    attrMarker,
    valueMarker,
    commentMarker,
) {
    let nodeCount = 1;
    let node = walker.nextNode();
    while (node !== null) {
        // console.log('get stale: index: ', nodeCount, ' | node: ', node);
        if (node.nodeType === Node.ELEMENT_NODE && node instanceof Element) {
            if (
                /^(?:script|style|textarea|title)$/i.test(node.tagName) &&
                node.textContent
            ) {
                handleUnwanted(staleNodes, node.textContent, valueMarker);
            } else {
                handleDynamicAttribute(
                    staleNodes,
                    node,
                    attrMarker,
                    valueMarker,
                    nodeCount,
                );
            }
        } else if (node.nodeType === Node.COMMENT_NODE) {
            handleDynamicText(
                staleNodes,
                node,
                valueMarker,
                commentMarker,
                nodeCount,
            );
        }
        nodeCount++;
        node = walker.nextNode();
    }
    // console.log("maxNodes: ", maxNodes)
    // console.log("stale nodes: ", staleNodes)
    if (staleNodes.length !== maxNodes) throw new Error('Not same number :o');
}

/**
 * @param {TreeWalker} walker
 * @param {Array<StaleNode | null>} staleNodes
 * @returns {Array<OuterNode | FuncNode | AttributePropNode | AttributeBoolNode | AttributeEventNode | AttributeMultiNode | null>}
 */
function resolveTemplate(walker, staleNodes) {
    let nodeCount = 0;
    let i = 0;
    const liveNodes = [];
    while (i < staleNodes.length) {
        // console.log('fuuuu: ', staleNodes.length);
        const st = staleNodes[i];
        if (st === null) {
            i++;
        } else if (
            st !== null &&
            st.i === nodeCount
            // &&
            // node instanceof Element
        ) {
            const node = walker.currentNode;
            if (st.t === wTypes.outer) {
                liveNodes.push(new OuterNode(node, i));
            } else if (st.t === wTypes.func) {
                liveNodes.push(new FuncNode(node, i));
            } else if (st.n && st.t === wTypes.prop) {
                liveNodes.push(new AttributePropNode(node, st.n, i));
            } else if (st.n && st.t === wTypes.bool) {
                liveNodes.push(new AttributeBoolNode(node, st.n, i));
            } else if (st.n && st.t === wTypes.event) {
                liveNodes.push(new AttributeEventNode(node, st.n, i));
            } else if (st.s && st.n && st.t === wTypes.multiAttr) {
                const len = st.s.length;
                if (!len) throw new Error('!!!!');
                const e = new AttributeMultiNode(node, st.n, st?.s, i);
                for (let k = 0; k !== len - 1; k++, i++) {
                    liveNodes.push(e);
                    if (staleNodes[i]?.t !== wTypes.multiAttr)
                        throw new Error('INVALID MULT NODE COUNT');
                }
                i--;
            } else if (st.t === wTypes.none) {
                liveNodes.push(null);
            }

            i++;
        } else {
            nodeCount++;
            walker.nextNode();
        }
    }
    return liveNodes;
}

/**
 * @param {string} attrMarker
 * @param {string} valueMarker
 * @param {string} commentMarker
 * @returns {(parentNode: Node, maxNodes: number) => (parentNode2: Node) => Array<OuterNode | FuncNode | AttributePropNode | AttributeBoolNode | AttributeEventNode | AttributeMultiNode | null>}
 */
export default function useTemplateTreeWalker(
    attrMarker,
    valueMarker,
    commentMarker,
) {
    const walker = document.createTreeWalker(
        document,
        // eslint-disable-next-line no-bitwise
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT,
    );
    /**
     * @param {Node} parentNode
     * @param {number} maxNodes
     * @returns {(parentNode2: Node) => Array<OuterNode | FuncNode | AttributePropNode | AttributeBoolNode | AttributeEventNode | AttributeMultiNode | null>}
     */
    const getStale = (parentNode, maxNodes) => {
        const staleNodes = [];
        walker.currentNode = parentNode;
        walkingTheTemplate(
            walker,
            maxNodes,
            staleNodes,
            attrMarker,
            valueMarker,
            commentMarker,
        );
        /**
         * @param {Node} parentNode2
         * @returns {Array<OuterNode | FuncNode | AttributePropNode | AttributeBoolNode | AttributeEventNode | AttributeMultiNode | null>}
         */
        const getLive = (parentNode2) => {
            walker.currentNode = parentNode2;
            return resolveTemplate(walker, staleNodes);
        };
        return getLive;
    };
    return getStale;
}
