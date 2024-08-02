import { html } from '../lib_templ/BaseElement.js';

export const rRow = (classes, content) => html`
    <div class="row ${classes}">${content}</div>
`;

export const rCol = (classes, content) => html`
    <div class="${classes}">${content}</div>
`;

/**
 * @param {string} [date]
 */
export const humanizedDate = (date) => date == undefined ? '-' : new Date(date).toLocaleDateString()