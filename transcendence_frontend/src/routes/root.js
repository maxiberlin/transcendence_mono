import { ToastNotificationErrorEvent } from '../components/bootstrap/BsToasts.js';
import { BaseElement, html } from '../lib_templ/BaseElement.js';
import { sessionService } from '../services/api/API_new.js';
import { getNavItem } from '../components/Navs.js';


// export default class PongApp extends BaseElement {
//     constructor() {
//         super(false, false);

//         this.sessionUser = sessionService.subscribe(this);
//         // console.log('current user: ', this.sessionUser.value);

//         this.onResize = () => {
//             super.requestUpdate();
//             console.log('screen sizes: ', window.screen);
//             console.log('innerWidth: ', window.innerWidth);
//             console.log('innerHeight: ', window.innerHeight);
//             console.log('outerWidth: ', window.outerWidth);
//             console.log('outerHeight: ', window.outerHeight);

//         }
//     }

//     shouldAddBottomPadding = false;
//     connectedCallback() {
//         super.connectedCallback();
//         window.addEventListener("resize", this.onResize);
//         setTimeout(() => {
//             if (document.body.scrollHeight > document.body.clientHeight)
//                 this.shouldAddBottomPadding = true;
//             console.log('checkk: ', document.body.clientHeight);            
//             console.log('checkk: ', document.body.scrollHeight);            
//             super.requestUpdate();
//         }, 500);
//     }

//     disconnectedCallback() {
//         super.disconnectedCallback();
//         window.removeEventListener("resize", this.onResize);
//     }

//     /**
//      * 
//      * @param {string} route 
//      * @param {URL} url
//      */
//     onRouteChange(route, url) {
//         const urlstr = url.toString();

//         console.log('onRouteChange: root: ', route);
//         /** @type {import('../components/Navs.js').NavItemConf | undefined} */
//         let longestEl;
//         this.configs.forEach((conf)=>{
//             conf.firstActive = false;
//             if (conf.href && route.includes(conf.href)) {
//                 if (longestEl === undefined)
//                     longestEl = conf;
//                 else if (longestEl.href && conf.href.length > longestEl.href.length)
//                     longestEl = conf;
//             }
//         })
//         if (longestEl)
//             longestEl.firstActive = true;
//         super.requestUpdate();
//     }


//     renderLoginRegister = () => html`
//         <div class="h-100 d-flex align-items-center justify-content-center">
//             <a class="btn btn-outline-dark me-2" href="/login">
//                 Login
//             </a>
//             <a class="btn btn-dark me-2" href="/register">
//                 Register
//             </a>
//             <button class="btn btn-dark" @click=${() => { BaseElement.toggleColorMode(); }} >
//                 <i class="fa-solid fa-circle-half-stroke"></i>
//             </button>
//         </div>
//     `
//     /** @type {Array<import('../components/Navs.js').NavItemConf>} */
//     configs = [
//         {text: '', href: '/', icon: 'home'},
//         {text: '', href: '/social/friends', icon: 'users'},
//         {text: '', href: '/profile', icon: 'user'},
//         {text: '', href: '/profile/settings', icon: 'gear'},
//     ];

//     renderNav = (isMobile) => html`
//         ${!sessionService.isLoggedIn ? '' : html`
//             <div  class="p-0 m-0  ${isMobile ? 'pong-navbar-mobile' : 'pong-fixed-top-1' }" >
//                 <vertical-nav
//                     notification
//                     .navconfigs=${this.configs}
//                     row
//                     ?linebreak=${isMobile}
//                 >
//                 </vertical-nav>
                
//             </div>
//         `}
//     `

//     /** @type {HTMLDivElement | undefined} */
//     navdiv
//     render() {
//         console.log('render root!: window.innerWidth: ', window.innerWidth);
//         const isMobile = window.innerWidth <= 576;

        
//         return html`
//             <div class="p-0 container-fluid bg-dark-subtle h-100">
//                 <bs-toasts></bs-toasts>
//                 <div class="d-flex flex-column h-100">

//                     ${this.renderNav(isMobile)}
//                     <div id="scroll-container" class="${isMobile ? '' : 'p-0 flex-grow-1'}  w-100 " style="${this.shouldAddBottomPadding ? `padding-bottom: 6em; height: auto;` : 'padding-bottom: 6em; height: 100%'}">
//                         ${sessionService.isLoggedIn ? '' : this.renderLoginRegister()}
                        
//                         <main id="root-outlet" class="w-100 h-100"></main>
                        
//                     </div>
                    
//                 </div>
//             </div>
//         `;
//     }
// }
// window.customElements.define('pong-app', PongApp);


export default class PongApp extends BaseElement {
    constructor() {
        super(false, false);

        this.sessionUser = sessionService.subscribe(this);
        // console.log('current user: ', this.sessionUser.value);

        this.onResize = () => {
            super.requestUpdate();
            // console.log('screen sizes: ', window.screen);
            // console.log('innerWidth: ', window.innerWidth);
            // console.log('innerHeight: ', window.innerHeight);
            // console.log('outerWidth: ', window.outerWidth);
            // console.log('outerHeight: ', window.outerHeight);

        }
    }

    shouldAddBottomPadding = false;
    connectedCallback() {
        super.connectedCallback();
        window.addEventListener("resize", this.onResize);
        // setTimeout(() => {
        //     if (document.body.scrollHeight > document.body.clientHeight)
        //         this.shouldAddBottomPadding = true;
        //     console.log('checkk: ', document.body.clientHeight);            
        //     console.log('checkk: ', document.body.scrollHeight);            
        //     super.requestUpdate();
        // }, 500);
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

        // console.log('onRouteChange: root: ', route);
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
        </div>
    `
    /** @type {Array<import('../components/Navs.js').NavItemConf>} */
    configs = [
        {text: '', href: '/', icon: 'home'},
        {text: '', href: '/social/friends', icon: 'users'},
        {text: '', href: '/profile', icon: 'user'},
        {text: '', href: '/profile/settings', icon: 'gear'},
    ];

    renderNav = (isMobile) => html`
        ${!sessionService.isLoggedIn ? '' : html`
            <div  class="p-0 m-0 pong-navigation" >
                <vertical-nav
                    notification
                    .navconfigs=${this.configs}
                    row
                    ?linebreak=${isMobile}
                >
                </vertical-nav>
            </div>
        `}
    `

    /** @type {HTMLDivElement | undefined} */
    navdiv
    render() {
        // console.log('render root!: window.innerWidth: ', window.innerWidth);
        const isMobile = window.innerWidth <= 576;

        // class="${isMobile ? '' : 'p-0 flex-grow-1'}  w-100 " style="${this.shouldAddBottomPadding ? `padding-bottom: 6em; height: auto;` : 'padding-bottom: 6em; height: 100%'}"
        return html`
            <div class="p-0 container-fluid bg-dark-subtle h-100">
                <bs-toasts></bs-toasts>
                <div class="d-flex flex-column h-100">

                    ${!sessionService.isLoggedIn ? '' : html`
                        <div  class="p-0 m-0 pong-navigation" >
                            <vertical-nav
                                notification
                                .navconfigs=${this.configs}
                                row
                                ?linebreak=${isMobile}
                            >
                            </vertical-nav>
                        </div>
                    `}
                    <div id="scroll-container" class="pong-content">
                        ${sessionService.isLoggedIn ? '' : this.renderLoginRegister()}
                        
                        <main id="root-outlet" class="w-100 h-100"></main>
                        
                    </div>
                    
                </div>
            </div>
        `;
    }
}
window.customElements.define('pong-app', PongApp);
