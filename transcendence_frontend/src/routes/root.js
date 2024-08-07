import { ToastNotificationErrorEvent } from '../components/bootstrap/BsToasts.js';
import { BaseElement, html } from '../lib_templ/BaseElement.js';
import { sessionService } from '../services/api/API_new.js';


export default class PongApp extends BaseElement {
    constructor() {
        super(false, false);

        this.sessionUser = sessionService.subscribe(this);

        this.onResize = () => {
            super.requestUpdate();
        }
    }

    shouldAddBottomPadding = false;
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

    render() {
        const isMobile = window.innerWidth <= 576;
        return html`
            <bs-toasts></bs-toasts>
            ${!sessionService.isLoggedIn ? this.renderLoginRegister()
                : html`
                <div  class="pong-navigation" >
                    
                    <vertical-nav
                        notification
                        .navconfigs=${this.configs}
                        row
                        ?linebreak=${isMobile}
                    >
                    </vertical-nav>
                </div>
            `}
            <div class="pong-content">
                <main id="root-outlet" class="h-100" ></main>
            </div>
        `;
    }
}
window.customElements.define('pong-app', PongApp);
