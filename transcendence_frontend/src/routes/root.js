import { BaseElement, html } from '../lib_templ/BaseElement.js';
import { sessionService } from '../services/api/API.js';

export default class PongApp extends BaseElement {
    constructor() {
        super(false, false);

        this.sessionUser = sessionService.subscribe(this);
        // console.log('current user: ', this.sessionUser.value);

        window.onresize = () => {
            super.requestUpdate();
        };
    }

    static renderNavItem = (name, link, fa, isActive) =>
        html`<li class="nav-item">
            <a
                class="nav-link d-flex flex-column align-items-center p-3
                    ${isActive ? 'active' : ''}"
                href="${link}"
            >
                <i class="${fa} fs-5"></i>
                <span class="fs-6">${name}</span>
            </a>
        </li>`;

    render() {
        return html`
            <div class="container-fluid bg-dark-subtle">
                <bs-toasts></bs-toasts>
                <div class="row">
                    ${!sessionService.isLoggedIn ? '' : (
                        html`
                            <nav
                                class="navbar ${window.innerWidth <= 576 ?
                                    'fixed-bottom'
                                :   ''}  col-12 col-sm-2 col-md-1 col-xl-1 d-flex bg-light-subtle p-0"
                                style="height: ${window.innerWidth <= 576 ?
                                    'auto'
                                :   '100vh'}"
                            >
                                <ul
                                    class="navbar-nav w-100 ${(
                                        window.innerWidth <= 576
                                    ) ?
                                        'h-100'
                                    :   ''}  flex-row flex-sm-column justify-content-around m-0 p-0"
                                >
                                    ${PongApp.renderNavItem(
                                        'Home',
                                        '/',
                                        'fa-solid fa-gamepad',
                                        true,
                                    )}
                                    ${PongApp.renderNavItem(
                                        'Social',
                                        '/social/friends',
                                        'fa-solid fa-users',
                                    )}
                                    ${PongApp.renderNavItem(
                                        'Profile',
                                        '/profile',
                                        'fa-solid fa-user',
                                    )}
                                    <button
                                        @click=${() => {
                                            BaseElement.toggleColorMode();
                                        }}
                                        class="btn btn-dark m-3"
                                    >
                                        <i
                                            class="fa-solid fa-circle-half-stroke"
                                        ></i>
                                    </button>
                                    <button
                                        class="btn btn-primary"
                                        @click=${() => {
                                            // console.log('joo');
                                            this.dispatchEvent(
                                                new CustomEvent(
                                                    'render-notification',
                                                    {
                                                        detail: {
                                                            message: 'heelloo',
                                                        },
                                                        bubbles: true,
                                                    },
                                                ),
                                            );
                                        }}
                                    >
                                        notify!
                                    </button>
                                </ul>
                            </nav>
                        `
                    )}

                    <div
                        class="col p-0 d-flex flex-column overflow-scroll"
                        style="height: ${(
                            sessionService.isLoggedIn &&
                            window.innerWidth <= 576
                        ) ?
                            '90vh'
                        :   '100vh'}"
                    >
                        ${sessionService.isLoggedIn ? '' : (
                            html`
                                <div
                                    class="h-100 d-flex align-items-center justify-content-center"
                                >
                                    <a
                                        class="btn btn-outline-dark me-2"
                                        href="/login"
                                        >Login</a
                                    >
                                    <a
                                        class="btn btn-dark me-2"
                                        href="/register"
                                        >Register</a
                                    >
                                    <button
                                        @click=${() => {
                                            BaseElement.toggleColorMode();
                                        }}
                                        class="btn btn-dark"
                                    >
                                        <i
                                            class="fa-solid fa-circle-half-stroke"
                                        ></i>
                                    </button>
                                </div>
                            `
                        )}
                        <main
                            id="root-outlet"
                            style="height: ${(
                                sessionService.isLoggedIn &&
                                window.innerWidth <= 576
                            ) ?
                                '90vh'
                            :   '100vh'}"
                        ></main>
                    </div>
                </div>
            </div>
        `;
    }
}
window.customElements.define('pong-app', PongApp);
