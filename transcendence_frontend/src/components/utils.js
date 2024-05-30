import { BaseElem, html } from '../modules.js';

export const rRow = (classes, content) => html`
    <div class="row ${classes}">
        ${content}
    </div>
`

export const rCol = (classes, content) => html`
    <div class="${classes}">
        ${content}
    </div>
`


export function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}