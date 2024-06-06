import { BaseElement, html } from '../../lib_templ/BaseElement.js';
import { sessionService, fetcher } from '../../services/api/API.js';
import router from '../../services/router.js';

/**
 * @typedef {object} InputType
 * @property {string} type
 * @property {string} id
 * @property {string} label
 * @property {string} placeholder
 * @property {string} name
 * @property {string} autocomplete
 */

const inputTypes = {
    email: {
        type: 'email',
        id: 'email-i',
        label: 'E-Mail',
        placeholder: 'Enter your E-Mail Address',
        name: 'email',
        autocomplete: 'email',
    },
    new_password: {
        type: 'password',
        id: 'password-new-i',
        label: 'New Password',
        placeholder: 'Enter your new password',
        name: 'password',
        autocomplete: 'new-password',
    },
    confirm_password: {
        type: 'password',
        id: 'password-confirm-i',
        label: 'Confirm new Password',
        placeholder: 'Confirm your new password',
        name: 'confirmPassword',
        autocomplete: 'new-password',
    },
    curr_password: {
        type: 'password',
        id: 'password-curr-i',
        label: 'Current Password',
        placeholder: 'Enter your current password',
        name: 'currentPassword',
        autocomplete: 'current-password',
    },
    username: {
        type: 'text',
        id: 'username-i',
        label: 'Username',
        placeholder: 'Enter your Username',
        name: 'username',
        autocomplete: 'username',
    },
    first_name: {
        type: 'text',
        id: 'first_name-i',
        label: 'First Name',
        placeholder: 'Enter your first Name',
        name: 'firstName',
        autocomplete: 'given-name',
    },
    last_name: {
        type: 'text',
        id: 'last_name-i',
        label: 'Last Name',
        placeholder: 'Enter your last Name',
        name: 'lastName',
        autocomplete: 'family-name',
    },
};

export default class LoginRegisterRoute extends BaseElement {
    constructor() {
        super(false, false);
        this.#currRoute = window.location.pathname;
        this.showSpinner = false;
        this.errorMessage = undefined;
    }

    #currRoute;

    async onBeforeMount() {
        this.#currRoute = window.location.pathname;
        // console.log('on before Mount, router: ', router);
        if (sessionService.isLoggedIn) {
            if (window.location.pathname === '/logout')
                await sessionService.logout();
            return router.redirect('/');
        }
        if (window.location.pathname === '/logout') return router.redirect('/');
        return undefined;
    }

    onRouteChange(route) {
        this.#currRoute = route;
        super.requestUpdate();
    }

    /** @param {FormData} formData  */
    handleRegister(formData) {
        fetcher
            .$post('/register', { bodyData: formData })
            .then(() => {
                this.handleLogin(formData);
            })
            .catch(() => {
                // alert('An Error occured');
            });
    }

    toggleErrorMessage(errorMessage) {
        if (errorMessage) {
            this.showSpinner = false;
            this.errorMessage = errorMessage;
        } else {
            this.errorMessage = undefined;
        }
        super.requestUpdate();
    }

    /** @param {FormData} formData  */
    async handleLogin(formData) {
        try {
            this.showSpinner = true;
            super.requestUpdate();
            /** @type {APITypes.LoginData} */

            // console.log(
            //     'credentials: ',
            //     formData.get('username'),
            //     formData.get('currentPassword'),
            // );
            const loginData = await sessionService.login(
                formData.get('username'),
                formData.get('currentPassword'),
            );
            console.log('login : login data received: ', loginData);
            if (loginData.success) router.redirect('/');
            else this.toggleErrorMessage(loginData.message);
        } catch (error) {
            // console.log("login error: ", error);
            // console.log("login error name: ", error.name);
            // console.log("login error stack: ", error.stack);
            this.toggleErrorMessage(error.data.message);
        }
    }

    async onSubmit(e) {
        // console.log('submitted');
        e.preventDefault();
        const path = window.location.pathname;
        const formData = new FormData(e.target);
        // formData.forEach((val, key) => {
        //     // console.log('submit: formdata: ', key, ': ', val);
        // });
        if (path === '/register') {
            this.handleRegister(formData);
        } else if (path === '/login') {
            this.handleLogin(formData);
        }
    }

    onInputChange() {
        const pw = this.shadowRoot?.getElementById(inputTypes.new_password.id);
        const confPw = this.shadowRoot?.getElementById(
            inputTypes.confirm_password.id,
        );
        if (
            pw instanceof HTMLInputElement &&
            confPw instanceof HTMLInputElement
        ) {
            if (pw.value !== confPw.value)
                confPw.setCustomValidity('Passwords do not match');
            else confPw.setCustomValidity('');
            // console.log('j');
        }
    }

    static showButton = (showSpinner, regText, spinnerText) => {
        return html`
            <button
                class="w-100 mb-2 mt-4 btn btn-lg rounded-3 btn-dark"
                type="submit"
                ?disabled=${showSpinner}
            >
                ${showSpinner ?
                    html`
                        <span
                            class="spinner-border spinner-border-sm"
                            aria-hidden="true"
                        ></span>
                        <span role="status">${spinnerText}</span>
                    `
                :   regText}
            </button>
        `;
    };

    /**
     * @param {InputType} inputType
     * @param {boolean} autofocus
     * @param {boolean} required
     * @param {(ev: Event) => void} [onInput]
     * @returns {import('../../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
     */
    static renderInput = (inputType, autofocus, required, onInput) => {
        let inpt;
        let btn;
        const getPwIcon = (ic) =>
            /* html */ `<i class="fa-solid fa-${ic}"></i>`;
        const togglePw = () => {
            if (
                btn &&
                btn instanceof HTMLButtonElement &&
                inpt &&
                inpt.type === 'text'
            ) {
                inpt.type = 'password';
                btn.innerHTML = getPwIcon('eye');
            } else if (btn && inpt && inpt.type === 'password') {
                inpt.type = 'text';
                btn.innerHTML = getPwIcon('eye-slash');
            }
        };

        return html`
            <section class="input-group mb-3">
                <div class="form-floating">
                    <input
                        class="form-control"
                        @input=${onInput}
                        ${(e) => {
                            inpt = e;
                        }}
                        type="${inputType.type}"
                        id="${inputType.id}"
                        placeholder="${inputType.placeholder}"
                        name="${inputType.name}"
                        ?autofocus="${autofocus}"
                        autocomplete="${inputType.autocomplete}"
                        ?required="${required}"
                    />
                    <label for="${inputType.id}">
                        ${inputType.label}
                        ${required ?
                            html`<span class="text-danger">*</span>`
                        :   ''}
                    </label>
                </div>

                ${inputType.type !== 'password' ?
                    ''
                :   html` <button
                        tabindex="-1"
                        ${(e) => {
                            btn = e;
                        }}
                        class="input-group-text text-body-secondary"
                        type="button"
                        @click=${togglePw}
                    >
                        <i class="fa-solid fa-eye"></i>
                    </button>`}
            </section>
        `;
    };

    static showPwForgot = (link, showSpinner) => html`
        ${LoginRegisterRoute.renderInput(inputTypes.email, true, true)}
        ${LoginRegisterRoute.showButton(showSpinner, 'Reset', 'resetting...')}
    `;

    static showLogin = (link, showSpinner) => html`
        ${LoginRegisterRoute.renderInput(inputTypes.username, true, true)}
        ${LoginRegisterRoute.renderInput(inputTypes.curr_password, false, true)}
        <small class="text-body-secondary"
            >Forgot your password?
            <a id="login-to-pw-forgotten" href="${link}"> click here</a>
        </small>
        ${LoginRegisterRoute.showButton(
            showSpinner,
            'Sign-in',
            'signing-in...',
        )}
    `;

    showRegister = (link, showSpinner) => html`
        ${LoginRegisterRoute.renderInput(inputTypes.username, true, true)}
        ${LoginRegisterRoute.renderInput(inputTypes.email, false, true)}
        ${LoginRegisterRoute.renderInput(
            inputTypes.new_password,
            false,
            true,
            this.onInputChange.bind(this),
        )}
        ${LoginRegisterRoute.renderInput(
            inputTypes.confirm_password,
            false,
            true,
            this.onInputChange.bind(this),
        )}
        ${LoginRegisterRoute.showButton(
            showSpinner,
            'Sign-Up',
            'signing-up...',
        )}
        <small id="singnup-disclaimer" class="text-body-secondary">
            By clicking Sign up, you agree to the terms of use.
        </small>
        <div class="mt-4">
            <small class="text-body-secondary">
                Already have an Account?
                <a id="login-to-other-site" href="${link}">sign-in</a>
            </small>
        </div>
    `;

    routes = new Map([
        [
            '/login',
            {
                title: 'Welcome Back!',
                func: LoginRegisterRoute.showLogin,
                link: '/pwforgot',
            },
        ],
        [
            '/register',
            {
                title: 'Register to awesome Pong',
                func: this.showRegister,
                link: '/login',
            },
        ],
        [
            '/pwforgot',
            {
                title: 'Reset your Password',
                func: LoginRegisterRoute.showPwForgot,
                link: '',
            },
        ],
    ]);

    render() {
        const val = this.routes.get(this.#currRoute);
        if (!val) return null;

        return html/* html */ `
            <pong-bg></pong-bg>
            <div class="modal d-block" tabindex="-1">
                ${html`
                    <div
                        class="modal-dialog modal-dialog-centered"
                        role="document"
                    >
                        <div class="modal-content">
                            <div
                                class="modal-header p-0 m-4 mb-0 d-flex flex-column align-items-end border-bottom border-dark border-3"
                            >
                                <a
                                    class="align-self-start link-dark pb-4"
                                    href="/"
                                >
                                    <i class="fa-solid fa-arrow-left"></i>
                                    <span>Back to home</span>
                                </a>
                                <div
                                    class="align-self-stretch d-flex justify-content-center"
                                >
                                    <h1 class="fw-bold mb-2 flex-shrink-1">
                                        ${val.title}
                                    </h1>
                                </div>
                            </div>
                            <div class="modal-body p-0 m-5 mt-5 text-center">
                                ${this.errorMessage ?
                                    html`
                                        <div
                                            class="alert alert-danger alert-dismissible"
                                            role="alert"
                                        >
                                            <div>${this.errorMessage}</div>
                                            <button
                                                @click=${() => {
                                                    this.toggleErrorMessage(
                                                        undefined,
                                                    );
                                                }}
                                                type="button"
                                                class="btn-close"
                                                data-bs-dismiss="alert"
                                                aria-label="Close"
                                            ></button>
                                        </div>
                                    `
                                :   ''}
                                <form
                                    @submit=${this.onSubmit.bind(this)}
                                    action=""
                                    class="needs-validation"
                                >
                                    ${val.func(val.link, this.showSpinner)}
                                </form>
                            </div>
                        </div>
                    </div>
                `}
            </div>
        `;
    }
}
window.customElements.define('login-register-route', LoginRegisterRoute);
