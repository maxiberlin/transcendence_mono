import { BaseElement, html } from '../../lib_templ/BaseElement.js';

export const rendListItem = (content) => {
    return html`
        <li
            class="row list-group-item d-flex justify-content-between align-items-center"
        >
            ${content}
        </li>
    `;
};

// <div class="card-header">
// <h6 class="">${icon ? html`<i class="fa-solid fa-scroll m-2">` : ""}</i>${title}</h6>
// </div>
export const renderListCard = (title, icon, listItems) => {
    // console.log(listItems);
    return html`
        <div class="card">
            ${title ?
                html`
                <h6 class="my-2 card-title">${icon ? html`<i class="fa-solid fa-scroll m-2"></i>` : ''}</i>${title}</h6>
            `
            :   ''}
            <div class="card-body">
                <ul class="list-group list-group-flush">
                    ${listItems || ''}
                </ul>
            </div>
        </div>
    `;
};

export const renderCard = (title, icon, content) => {
    return html`
        <div class="card">
            ${title ?
                html`
                <h6 class="my-2 card-title">${icon ? html`<i class="fa-solid fa-scroll m-2"></i>` : ''}</i>${title}</h6>
            `
            :   ''}
            <div class="card-body">${content || ''}</div>
        </div>
    `;
};

export const renderCardInfo = (title, content) => {
    return html`
        <p class="text-body-secondary p-0 m-0">
            ${title} <br />
            <span class="text-body"> ${content} </span>
        </p>
    `;
};

// export class BsListGroup extends BaseElem {
//     static observedAttributes = [];

//     constructor() {
//         super(false, false);

//         this._header = '';
//     }

//     render() {
//         return html` <ul class="list-group list-group-flush"></ul> `;
//     }
// }
// customElements.define('bs-list-group', BsListGroup);

export class BsCard extends BaseElement {
    static observedAttributes = ['icon', 'header'];

    constructor() {
        super(false, false);

        this.header = '';
        this.footer = '';
        this.icon = '';
    }

    render() {
        return html`
            <div class="card">
                ${this.header ?
                    html` <div class="card-header">
                        <h6 class="">
                            ${this.icon ?
                                html`<i class="fa-solid fa-${this.icon}"></i>`
                            :   ''}
                            ${this.header}
                        </h6>
                    </div>`
                :   ''}
                <div class="card-body"></div>
                ${this.footer ?
                    html` <div class="card-footer">${this.footer}</div> `
                :   ''}
            </div>

            <div class="card text-start">
                <div class="card-body">
                    <h4 class="card-title">Title</h4>
                    <p class="card-text">Body</p>
                </div>
            </div>
        `;
    }
}
customElements.define('bs-card', BsCard);
