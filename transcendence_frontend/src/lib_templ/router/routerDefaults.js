/* eslint-disable max-classes-per-file */
import { BaseElement, html } from '../BaseElement.js';

window.customElements.define(
    'router-default-not-found',
    class extends BaseElement {
        render() {
            return html`<h1>404 Not Found</h1>`;
        }
    },
);

window.customElements.define(
    'router-invalid-web-component',
    class extends BaseElement {
        render() {
            return html`<h1>unable to create component</h1>`;
        }
    },
);
