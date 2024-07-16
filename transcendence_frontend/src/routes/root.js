import { ToastNotificationErrorEvent } from '../components/bootstrap/BsToasts.js';
import { BaseElement, html } from '../lib_templ/BaseElement.js';
import { sessionService } from '../services/api/API_new.js';
import { getNavItem } from '../components/Navs.js';


    // /**
    //  * 
    //  * @param {string} name 
    //  * @param {string} link 
    //  * @param {string} fa 
    //  * @returns 
    //  */
    // static renderNavItem = (name, link, fa) =>
    //     html`<li class="nav-item">
    //         <a
                
    //             class="nav-link d-flex flex-column align-items-center p-2"
    //             href="${link}"
    //         >
    //             <i class="fa-solid fa-${fa} fs-5"></i>
    //             <span class="fs-6">${name}</span>
    //         </a>
    //     </li>`;
    // renderNavigation = () => {
    //     return html`
    //         <nav class="nav navbar border-end border-top p-2 d-flex bg-light-subtle p-0 ${window.innerWidth <= 576 ? 'fixed-bottom pong-navbar-mobile' : 'fixed-left pong-navbar-desktop'}">
    //             <ul class="navbar-nav nav-pills w-100 ${window.innerWidth <= 576 ? 'h-100' :''} flex-row flex-sm-column align-items-center justify-content-around m-0 p-0">
    //                 ${ PongApp.renderNavItem( 'Home', '/', 'fa-solid fa-gamepad' ) }
    //                 ${ PongApp.renderNavItem( 'Social', '/social/friends', 'users' ) }
    //                 ${ PongApp.renderNavItem( 'Profile', '/profile', 'fa-solid fa-user' ) }
    //                 <button class="btn btn-dark m-3" @click=${() => { BaseElement.toggleColorMode(); }}>
    //                     <i class="fa-solid fa-circle-half-stroke"></i>
    //                 </button>
    //             </ul>
    //         </nav>
    // `}

export default class PongApp extends BaseElement {
    constructor() {
        super(false, false);

        this.sessionUser = sessionService.subscribe(this);
        // console.log('current user: ', this.sessionUser.value);

        this.onResize = () => {super.requestUpdate();}
    }

    connectedCallback() {
        super.connectedCallback();
        window.addEventListener("resize", this.onResize);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener("resize", this.onResize);
    }

    /**
     * 
     * @param {string} route 
     * @param {URL} url
     */
    onRouteChange(route, url) {
        const urlstr = url.toString();

        console.log('onRouteChange: root: ', route);
        /** @type {import('../components/Navs.js').NavItemConf | undefined} */
        let longestEl;
        this.configs.forEach((conf)=>{
            conf.firstActive = false;
            if (conf.href && route.includes(conf.href)) {
                if (longestEl === undefined)
                    longestEl = conf;
                else if (longestEl.href && conf.href.length > longestEl.href.length)
                    longestEl = conf;
            }
        })
        if (longestEl)
            longestEl.firstActive = true;
        super.requestUpdate();
    }


    renderLoginRegister = () => html`
        <div class="h-100 d-flex align-items-center justify-content-center">
            <a class="btn btn-outline-dark me-2" href="/login">
                Login
            </a>
            <a class="btn btn-dark me-2" href="/register">
                Register
            </a>
            <button class="btn btn-dark" @click=${() => { BaseElement.toggleColorMode(); }} >
                <i class="fa-solid fa-circle-half-stroke"></i>
            </button>
        </div>
    `
    /** @type {Array<import('../components/Navs.js').NavItemConf>} */
    configs = [
        {text: '', doubleLine: true, useList: true, href: '/', icon: 'home'},
        {text: '', doubleLine: true, useList: true, href: '/social/friends', icon: 'users'},
        {text: '', doubleLine: true, useList: true, href: '/profile', icon: 'user'},
        {text: '', doubleLine: true, useList: true, href: '/profile/settings', icon: 'gear'},
    ];

    render() {
        console.log('render root!: window.innerWidth: ', window.innerWidth);
        const isMobile = window.innerWidth <= 576;

        return html`
            <div class="container-fluid bg-dark-subtle h-100">
                <bs-toasts></bs-toasts>
                <div class="row">
                    ${!sessionService.isLoggedIn ? '' : html`
                        <div class="p-0 m-0 ${isMobile ? 'pong-fixed-bottom-1 pong-navbar-mobile' : 'col pong-fixed-left-1 pong-navbar-desktop'}">
                            <vertical-nav center .navconfigs=${this.configs} ?row=${isMobile}  ></vertical-nav>
                        </div>
                        `}

                    ${!isMobile ? html`<div class="pong-navbar-desktop"></div>` : ''}
                    <div id="scroll-container" class="col p-0 w-100">
                        ${sessionService.isLoggedIn ? '' : this.renderLoginRegister()}
                        <main id="root-outlet" class="w-100 h-100"></main>
                        
                    </div>
                    ${isMobile ? html`<div class="pong-spacer-mobile w-100"></div>` : ''}
                    
                </div>
            </div>
        `;
    }
}
window.customElements.define('pong-app', PongApp);
