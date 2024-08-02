import { BaseElement, html } from '../lib_templ/BaseElement.js';
import { TemplateAsLiteral } from '../lib_templ/templ/TemplateAsLiteral.js';
// export class NavItem extends BaseElement {
//     constructor() {
//         super(false, false);
//     }
// }

/**
 * @template T
 * @param {BaseElement} parent
 * @param {T} initialValue - The initial state value.
 * @returns {[() => T, (newValue: T) => void]} - A tuple with a state getter and a state setter.
 */
export function useState(parent, initialValue) {
    let state = initialValue;
  
    function setState(newValue) {
      state = newValue;
    // //   console.log(`State updated to: ${state}`);
      parent.requestUpdate();
    }
  
    function getState() {
      return state;
    }
  
    return [getState, setState];
  }

// /**
//  * @param {BaseElement} parent
//  * @param {string} text
//  * @param {string} href
//  * @returns 
//  */
// const getNavItem = (parent, text, href) => {

//     let [getActive, setActive] = useState(parent, false);
// //     console.log('Hallo get nav item');
//     return html`
//         <li class="nav-item">
//             <a @click=${()=>{setActive(true)}} class="nav-link ${getActive() ? 'active' : ''}"
//                 aria-current="page" href="${href}">
//                 ${text}
//             </a>
//         </li>
//     `
// };

const getCounter = (parent) => {
    let [getCount, sentCounter] = useState(parent, 0);
    return (name) => html`
        <bs-button @click=${()=>{sentCounter(getCount() - 1)}} text="decrement"></bs-button>
        <div class="fs-2">Hallo ${name} ${getCount()}</div>
        <bs-button @click=${()=>{sentCounter(getCount() + 1)}} text="increment"></bs-button>
    `
}

/**
 * @typedef {Object} NavItemConf
 * @property {string} text
 * @property {string} [href]
 * @property {string} [icon]
 * @property {boolean} [disabled]
 * @property {boolean} [firstActive]
 */

// /**
//  * @param {NavItemConf} conf
//  * @returns 
//  */
// const getNavItem2 = (conf) => {
//     const link = html`
//         <a class="nav-link ps-3 " ?disabled=${conf.disabled} @click=${(e)=>{e.stopPropagation(); e.preventDefault();}}
//              href="${conf.href ?? '#'}">
//             ${conf.icon ? html`<i class="fa-solid fa-${conf.icon} fs-5"></i>`:''}
//             <span class="ms-2 fs-6">${conf.text}</span>
//         </a>
//     `
//     return conf.useList ? html`<li class="nav-item">${link}</li>` : link;
// }

/**
 * @typedef {{
 *      setActive: (newValue: boolean) => void,
 *      render: (firstRender: boolean, center: boolean, doubleLine: boolean) => TemplateAsLiteral, 
 *  }} GetNavItemObj
 * 
 */

/**
 * @param {BaseElement} parent
 * @param {NavItemConf} conf
 * @param {(setActive: (newValue: boolean) => void)=>void} onClick
 * @param {boolean} stoppropagation
 * @param {boolean} useList
 * @returns {GetNavItemObj}
 */
export const getNavItem = (parent, conf, onClick, stoppropagation, useList) => {
    let [getActive, setActive] = useState(parent, false);
    let isActive = false;
    return {setActive, render: (firstRender, center, doubleLine) => {
        if (conf.firstActive !== undefined)
            isActive = getActive() || firstRender && conf.firstActive;
        else isActive = getActive()
        // console.log('render getNavItem, firstRender?: ', firstRender);
        // console.log('render getNavItem, getActive()?: ', getActive());
        // console.log('render getNavItem, isActive?: ', isActive);
        // console.log('render getNavItem, conf: ', conf);
        const link = html`
            <a
                @click=${(e)=>{
                    if (stoppropagation)
                        e.stopPropagation(); e.preventDefault();
                    parent.dispatchEvent(new SelectedNavLink(conf));
                    onClick(setActive)
                    firstRender = false;
                }} 
                class="nav-link ps-3 w-100
                    ${doubleLine ? 'd-flex flex-column align-items-center p-3' : ''}
                    ${isActive ? 'active link-light' : ''}
                "
                ?disabled=${conf.disabled}
                href="${conf.href ?? '#'}"
                aria-current="${isActive ? "page" : undefined}"
            >
                ${conf.icon ? html`
                        <i class="fa-solid fa-fw fa-${conf.icon} fs-5"></i>
                `:''}
                <span class="${(center || doubleLine) ? 'm-0' : 'ms-2'}  fs-6">${conf.text}</span>
            </a>
        `
        return useList ? html`<li class="nav-item ${center ? 'text-center' : 'text-start'}">${link}</li>` : link;
    }}
}


export class SelectedNavLink extends Event {
    constructor(navConf) {
        super("selected_nav_link", {bubbles: true});
        this.navConf = navConf;
    }
} 

/**
 * @prop {NavItemConf[]} navconfigs
 * @attr notification
 * @attr stoppropagation
 * @attr burger
 * @attr row
 * @attr linebreak
 * @attr center
 * @attr list
 */
export class VerticalNav extends BaseElement {
    static observedAttributes = ["notification", "stoppropagation", "burger", "row", "linebreak", "center", "list"];

    static id = 0;
    static getIdName = () => `navbar-toggler-${VerticalNav.id++}`

    constructor() {
        super(false, false);
        this.props.navconfigs = [];
        /** @type {Array<GetNavItemObj> | undefined} */
        this.navItems;
        this.firstRender = true;
        this.useId = VerticalNav.getIdName();
        this.stoppropagation = false;
        this.notification = false;
        this.burger = false;
        this.row = false;
        this.linebreak = false;
        this.center = true;
        this.list = true;
    }

    onClick = (setActive) => {
        this.firstRender = false;
        this.navItems?.forEach((i)=>{i.setActive(false)});
        setActive(true);
    }

    render() {
        // // console.log('render navbar, navconfig: ', this.props.navconfigs);
        // // console.log('row?: ', this.row);
        if (!this.navItems || this.navItems.length < this.props.navconfigs.length)
            this.navItems = Array.from(
                this.props.navconfigs,
                (conf) => getNavItem(this, conf, this.onClick.bind(this), this.stoppropagation, this.list)
            );
        const navv = html`
        <div class="d-flex flex-row justify-content-evenly align-items-center w-100">
            ${this.notification ? html`
                <div>
                    <notification-view></notification-view>
                </div>
            ` : ''}
            <ul
                class="
                    navbar-nav nav-pills nav-justified w-100 d-flex align-items-stretch justify-content-around
                    ${this.row === true ? 'flex-row' : 'flex-column'}
                    "
            >
                
                <li class="position-relative" style="${""}" ></li>
                ${ this.navItems?.map((i)=>i.render(this.firstRender, this.center, this.linebreak)) }
            </ul>
        </div>
        `;
        // ${this.notification ? html`<notification-view></notification-view>` : ''}
        return html`
            <div
                class=" border-end nav navbar navbar-expand-lg pong-navbar-padd bg-light-subtle h-100 w-100"
            >
                ${this.burger ? html`
                    <div class="container-fluid">
                        <button
                            class="btn btn-link link-body-emphasis"
                            type="button"
                            data-bs-toggle="offcanvas"
                            data-bs-target="#${this.useId}"
                            aria-controls="${this.useId}"
                            aria-expanded="false"
                            aria-label="Toggle navigation"
                        >
                           <i class="fa-solid fa-bars me-3"></i>
                           Open Settings
                        </button>
                        <div
                            data-bs-backdrop="false"
                            class="offcanvas offcanvas-start"
                            tabindex="-1"
                            id="${this.useId}"
                            aria-labelledby="offcanvasNavbarLabel-${this.useId}"
                        >
                            <div class="offcanvas-header">
                                <h5 class="offcanvas-title" id="offcanvasNavbarLabel-${this.useId}">
                                    Settings
                                </h5>
                                <button
                                    type="button"
                                    class="btn-close"
                                    data-bs-dismiss="offcanvas"
                                    aria-label="Close">
                                </button>
                            </div>
                            <div class="offcanvas-body">
                                ${navv}
                            </div>
                        </div>
                    </div>
                ` : navv}
            </div>
    `;
    }
}
window.customElements.define('vertical-nav', VerticalNav);
