import { BaseElement, html, ifDefined } from '../../lib_templ/BaseElement.js';
import { TemplateAsLiteral } from '../../lib_templ/templ/TemplateAsLiteral.js';
import { SelectedNavLink } from '../../components/Navs.js';
import { sessionService } from '../../services/api/API_new.js';
import { getPreferredTheme, setStoredTheme, setTheme } from '../../services/themeSwitcher.js';
import { Offcanvas } from 'bootstrap';

// export class ColorModeToggler extends BaseElement {
//     constructor() {
//         super(false, false);

//         this.theme = getPreferredTheme();
//     }

//     /** @param {import('../../services/themeSwitcher.js').ThemeColors} theme */
//     setCurrentTheme(theme) {
//         this.theme = theme;
//         setStoredTheme(theme);
//         setTheme(theme);
//         super.requestUpdate();
//     }

//     /**
//      * @param {string} text 
//      * @param {string} icon 
//      * @param {import('../../services/themeSwitcher.js').ThemeColors} theme
//      */
//     renderDropdownItem = (text, icon, theme) => {
//         const active = this.theme === theme;
//         return html`
//         <li>
//             <button
//                 @click=${() => {this.setCurrentTheme(theme)}}
//                 type="button"
//                 class="dropdown-item d-inline-flex align-items-center ${active ? 'active' : ''}"
//                 data-bs-theme-value="light"
//                 aria-pressed="${active ? 'true' : 'false'}"
//             >
//                 <i class="fa-solid fa-fw fa-${icon} me-1"></i>
//                 <span class="me-1">${text}</span>
//                 ${active ? html`<i class="fa-solid fa-check"></i> ` : ''}
//             </button>
//         </li>
//     `}

//     render() {
//         const icon = this.theme === "light" ? "sun" : this.theme === "dark" ? "moon" : "circle-half-stroke";
//         // style="--bs-dropdown-min-width: 8rem;"
//         return html`
//          <div class="d-flex align-items-center dropdown color-modes">
//             <button class="btn btn-link px-0 text-decoration-none dropdown-toggle d-flex align-items-center"
//                     type="button"
//                     aria-expanded="false"
//                     data-bs-toggle="dropdown"
//                     data-bs-display="static">
//                 <i class="fa-solid fa-${icon}"></i>
//                 <span class="ms-2" id="bd-theme-text">Toggle theme</span>
//             </button>
//             <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="bd-theme" >
//                 ${this.renderDropdownItem("Light", "sun", "light")}
//                 ${this.renderDropdownItem("Dark", "moon", "dark")}
//                 ${this.renderDropdownItem("Auto", "circle-half-stroke", "auto")}
//             </ul>
//         </div>
//         `
//     }
// }
// customElements.define("color-mode-toggler", ColorModeToggler);

export class ColorModeToggler extends BaseElement {
    constructor() {
        super(false, false);

        this.theme = getPreferredTheme();
    }

    /** @param {import('../../services/themeSwitcher.js').ThemeColors} theme */
    setCurrentTheme(theme) {
        this.theme = theme;
        setStoredTheme(theme);
        setTheme(theme);
        super.requestUpdate();
    }

    /**
     * @param {string} text 
     * @param {string} icon 
     * @param {import('../../services/themeSwitcher.js').ThemeColors} theme
     */
    renderColorModeItem = (text, icon, theme) => {
        const active = this.theme === theme;
        return html`
            <button
                @click=${() => {this.setCurrentTheme(theme)}}
                type="button"
                class="w-100 mt-3 btn btn-outline-dark btn-lg ${active ? 'active' : ''}"
                data-bs-theme-value="light"
                aria-pressed="${active ? 'true' : 'false'}"
            >
                <span class="" style="${"width: 7em;"}">
                    <i class="fa-solid fa-fw fa-${icon} me-1" style="${"width: 1em;"}"></i>
                    <span class="me-1" style="${"width: 3em;"}">${text}</span>
                    ${active ? html`<i class="fa-solid fa-check" style="${"width: 1em;"}"></i> ` : ''}
                </span>
            </button>
    `}

    render() {
        const icon = this.theme === "light" ? "sun" : this.theme === "dark" ? "moon" : "circle-half-stroke";
        // style="--bs-dropdown-min-width: 8rem;"
        return html`
         <div class="container d-flex flex-column align-items-center ">
            ${this.renderColorModeItem("Light", "sun", "light")}
            ${this.renderColorModeItem("Dark", "moon", "dark")}
            ${this.renderColorModeItem("Auto", "circle-half-stroke", "auto")}
        </div>
        `
    }
}
customElements.define("color-mode-toggler", ColorModeToggler);


export class SettingsView extends BaseElement {
    constructor() {
        super(false, false);

        this.sessionUser = sessionService.subscribe(this);

        this.configs = [
            {text: "Profile", icon: "user", useList: true, firstActive: true},
            {text: "Account", icon: "gear", useList: true},
            {text: "Game", icon: "gamepad", useList: true},
            {text: "Color Mode", icon: "circle-half-stroke", useList: true},
            {text: "Notification", icon: "bell", useList: true},
        ]
        this.confMap = {profile: this.configs[0], account: this.configs[1], game: this.configs[2], colorMode: this.configs[3]};

        /** @param {SelectedNavLink} ev */
        this.selectedHandler = (ev) => {
            this.selected = ev.navConf;
            
            if (this.isMobileWidth())
                Offcanvas.getOrCreateInstance("vertical-nav div div div.offcanvas").hide();
            else
                super.requestUpdate();
        }
        this.selected = this.configs[0];
        this.onShouldUpdate = (e) => {console.log('shouldUpdate: ', e);super.requestUpdate();}
    }

    
    connectedCallback() {
        super.connectedCallback();
        this.addEventListener("selected_nav_link", this.selectedHandler);
        window.addEventListener("resize", this.onShouldUpdate);
        this.addEventListener("hidden.bs.offcanvas", this.onShouldUpdate);
        // this.addEventListener("hidePrevented.bs.offcanvas", (e)=>{console.log('hide prev?: ', e);});
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener("selected_nav_link", this.selectedHandler);
        window.removeEventListener("resize", this.onShouldUpdate);
        this.removeEventListener("hidden.bs.offcanvas", this.onShouldUpdate)
    }

    isMobileWidth = () => window.innerWidth <= 800;

    renderChangeProfile = () => html`
        <div class="container row align-items-end justify-content-center">
            <color-mode-toggler></color-mode-toggler>
            <h1>Update your profile</h1>
            <div class="col-12 col-md-4 mb-3">
                <avatar-component
                    status="online"
                    statusborder
                    radius="5"
                    src="${ifDefined(this.sessionUser.value?.user?.avatar)}"
                    size="150"
                ></avatar-component>
            </div>
            <input ${(el)=>{this.fileInpt = el;}} type="file" id="input" style="${"display:none;"}" />
            <div class="col-6 col-md-4 mb-3">
                <bs-button ._async_handler=${async () => {
                    if (!(this.fileInpt instanceof HTMLInputElement)) return;
                    const inpt = this.fileInpt;
                    inpt.click();
                    try {
                        /** @type {FileList} */
                        const fileList = await new Promise( function (resolve, reject) {
                            /**
                             * @param {Event} ev
                             * @this {any}
                             */
                            function handleUpload(ev) {
                                inpt.removeEventListener('change', handleUpload);
                                resolve(this.files);
                            }
                            function handleCancel(ev) {
                                inpt.removeEventListener('cancel', handleCancel);
                                reject(ev);
                            }
                            inpt.addEventListener('change', handleUpload);
                            inpt.addEventListener('cancel', handleCancel);
                        })
                        console.log('fileList: ', fileList);
                        const fd = new FormData();
                        fd.append('avatar', fileList[0])
                        await sessionService.updateUserData(fd);
                        super.requestUpdate();
                    } catch (e) { console.log('err: ', e); }
                    
                    
                }} color="dark" icon="pencil"  text="change" stretch ></bs-button>
            </div>
            <div class="col-6 col-md-4 mb-3">
                <bs-button ._async_handler=${async () => {
                    // const fd = new FormData();
                    // fd.append('avatar', 'None');
                    // await sessionService.updateUserData(fd);
                    // super.requestUpdate();
                }} color="danger" icon="trash"  text="delete " stretch ></bs-button>
            </div>
            <div class="col-12">
                <form ${(el)=>{this.formElem = el;}} class="needs-validation">
                    <div class="form-floating mb-3">
                        <input
                            type="text"
                            class="form-control"
                            name="alias"
                            id="profile-edit-alias"
                            placeholder="alias"
                            value="${this.sessionUser.value?.user?.alias ?? ''}"
                        />
                        <label for="profile-edit-firstname" class="form-label">Player Alias</label>
                    </div>
                    <div class="form-floating mb-3">
                        <input
                            type="text"
                            class="form-control"
                            name="first_name"
                            id="profile-edit-firstname"
                            placeholder="John"
                            value="${this.sessionUser.value?.user?.first_name ?? ''}"
                        />
                        <label for="profile-edit-firstname" class="form-label">First Name</label>
                    </div>
                    <div class="form-floating mb-3">
                        <input
                            type="text"
                            class="form-control"
                            name="last_name"
                            id="profile-edit-lastname"
                            placeholder="Doe"
                            value="${this.sessionUser.value?.user?.last_name ?? ''}"
                        />
                        <label for="profile-edit-lastname" class="form-label">Last Name</label>
                    </div>
                    <div class="form-floating mb-3">
                        <textarea class="form-control" placeholder="Leave a comment here" id="profile-edit-about" style="${"height: 100px; max-height: 200px;"}"></textarea>
                        <label for="profile-edit-about">Comments</label>
                    </div>
                </form>
                <bs-button ._async_handler=${ async () => {
                    const isvalid = this.formElem?.reportValidity();
                    const formData = new FormData(this.formElem);
                    await sessionService.updateUserData(formData);
                    super.requestUpdate();

                    console.log('isValid?: ', isvalid);
                    console.log('form: ');
                    formData.forEach((v,k)=> {
                        console.log("key: ", k, ", value: ", v);
                    })
                    
                    // await sessionService.updateUserData()
                }} text="Save"></bs-button>
            </div>
            
        </div>
    `

// html`
//                 <button class="btn btn-dark m-3" @click=${() => { BaseElement.toggleColorMode(); }}>
//                     <i class="fa-solid fa-circle-half-stroke"></i>
//                 </button>
//                              `
    renderColorModeToggler = () => html`
       <color-mode-toggler></color-mode-toggler>
    `

    render() {
        console.log('render settings view, selected: ', this.selected);

        const render = this.selected === this.confMap.profile ? this.renderChangeProfile()
            : this.selected === this.confMap.colorMode ? this.renderColorModeToggler()
            : '';
        // <vertical-nav burger .navconfigs=${this.configs} stoppropagation ?row=${isMobile}  ></vertical-nav>
        return html`
            ${this.isMobileWidth() ? html`
                <div class="h-auto">
                    <vertical-nav ?burger=${this.isMobileWidth()} .navconfigs=${this.configs} stoppropagation></vertical-nav>
                </div>
                ${render}
            ` : html`
                <div class="row w-100 h-100">
                    <div class="p-0 m-0" style="${"height:100%;max-width: 13em;"}">
                        <vertical-nav ?burger=${this.isMobileWidth()} .navconfigs=${this.configs} stoppropagation></vertical-nav>
                    </div>
                    <div class="col">
                        ${render}
                    </div>
                </div>
            `}
    `;
    }
}
window.customElements.define('settings-view', SettingsView);

// export class SettingsView extends BaseElement {
//     constructor() {
//         super(false, false);

//         this.sessionUser = sessionService.subscribe(this);

//         this.configs = [
//             {text: "Profile", icon: "user", useList: true, firstActive: true},
//             {text: "Account", icon: "gear", useList: true},
//             {text: "Game", icon: "gamepad", useList: true},
//             {text: "Color Mode", icon: "circle-half-stroke", useList: true},
//             {text: "Notification", icon: "bell", useList: true},
//         ]
//         this.confMap = {profile: this.configs[0], account: this.configs[1], game: this.configs[2], colorMode: this.configs[3]};

//         /** @param {SelectedNavLink} ev */
//         this.selectedHandler = (ev) => {
//             this.selected = ev.navConf;
            
//             if (this.isMobileWidth())
//                 Offcanvas.getOrCreateInstance("vertical-nav div div div.offcanvas").hide();
//             else
//                 super.requestUpdate();
//         }
//         this.selected = this.configs[0];
//         this.onShouldUpdate = (e) => {console.log('shouldUpdate: ', e);super.requestUpdate();}
//     }

    
//     connectedCallback() {
//         super.connectedCallback();
//         this.addEventListener("selected_nav_link", this.selectedHandler);
//         window.addEventListener("resize", this.onShouldUpdate);
//         this.addEventListener("hidden.bs.offcanvas", this.onShouldUpdate);
//         // this.addEventListener("hidePrevented.bs.offcanvas", (e)=>{console.log('hide prev?: ', e);});
//     }

//     disconnectedCallback() {
//         super.disconnectedCallback();
//         this.removeEventListener("selected_nav_link", this.selectedHandler);
//         window.removeEventListener("resize", this.onShouldUpdate);
//         this.removeEventListener("hidden.bs.offcanvas", this.onShouldUpdate)
//     }

//     isMobileWidth = () => window.innerWidth <= 800;

//     renderChangeProfile = () => html`
//         <div class="container row align-items-end justify-content-center">
//             <h1>Update your profile</h1>
//             <div class="col-12 col-md-4 mb-3">
//                 <avatar-component
//                     status="online"
//                     statusborder
//                     radius="5"
//                     src="${this.sessionUser.value?.user?.avatar}"
//                     size="150"
//                 ></avatar-component>
//             </div>
//             <input ${(el)=>{this.fileInpt = el;}} type="file" id="input" style="${"display:none;"}" />
//             <div class="col-6 col-md-4 mb-3">
//                 <bs-button ._async_handler=${async () => {
//                     if (!(this.fileInpt instanceof HTMLInputElement)) return;
//                     const inpt = this.fileInpt;
//                     inpt.click();
//                     try {
//                         /** @type {FileList} */
//                         const fileList = await new Promise( function (resolve, reject) {
//                             /** @param {Event} ev */
//                             function handleUpload(ev) {
//                                 inpt.removeEventListener('change', handleUpload);
//                                 resolve(this.files);
//                             }
//                             function handleCancel(ev) {
//                                 inpt.removeEventListener('cancel', handleCancel);
//                                 reject(ev);
//                             }
//                             inpt.addEventListener('change', handleUpload);
//                             inpt.addEventListener('cancel', handleCancel);
//                         })
//                         console.log('fileList: ', fileList);
//                         const fd = new FormData();
//                         fd.append('avatar', fileList[0])
//                         await sessionService.updateUserData(fd);
//                         super.requestUpdate();
//                     } catch (e) { console.log('err: ', e); }
                    
                    
//                 }} color="dark" icon="pencil"  text="change" stretch ></bs-button>
//             </div>
//             <div class="col-6 col-md-4 mb-3">
//                 <bs-button ._async_handler=${async () => {
//                     // const fd = new FormData();
//                     // fd.append('avatar', 'None');
//                     // await sessionService.updateUserData(fd);
//                     // super.requestUpdate();
//                 }} color="danger" icon="trash"  text="delete " stretch ></bs-button>
//             </div>
//             <div class="col-12">
//                 <form ${(el)=>{this.formElem = el;}} class="needs-validation">
//                     <div class="form-floating mb-3">
//                         <input
//                             type="text"
//                             class="form-control"
//                             name="alias"
//                             id="profile-edit-alias"
//                             placeholder="alias"
//                             value="${this.sessionUser.value?.user?.alias ?? ''}"
//                         />
//                         <label for="profile-edit-firstname" class="form-label">Player Alias</label>
//                     </div>
//                     <div class="form-floating mb-3">
//                         <input
//                             type="text"
//                             class="form-control"
//                             name="first_name"
//                             id="profile-edit-firstname"
//                             placeholder="John"
//                             value="${this.sessionUser.value?.user?.first_name ?? ''}"
//                         />
//                         <label for="profile-edit-firstname" class="form-label">First Name</label>
//                     </div>
//                     <div class="form-floating mb-3">
//                         <input
//                             type="text"
//                             class="form-control"
//                             name="last_name"
//                             id="profile-edit-lastname"
//                             placeholder="Doe"
//                             value="${this.sessionUser.value?.user?.last_name ?? ''}"
//                         />
//                         <label for="profile-edit-lastname" class="form-label">Last Name</label>
//                     </div>
//                     <div class="form-floating mb-3">
//                         <textarea class="form-control" placeholder="Leave a comment here" id="profile-edit-about" style="${"height: 100px; max-height: 200px;"}"></textarea>
//                         <label for="profile-edit-about">Comments</label>
//                     </div>
//                 </form>
//                 <bs-button ._async_handler=${ async () => {
//                     const isvalid = this.formElem?.reportValidity();
//                     const formData = new FormData(this.formElem);
//                     await sessionService.updateUserData(formData);
//                     super.requestUpdate();

//                     console.log('isValid?: ', isvalid);
//                     console.log('form: ');
//                     formData.forEach((v,k)=> {
//                         console.log("key: ", k, ", value: ", v);
//                     })
                    
//                     // await sessionService.updateUserData()
//                 }} text="Save"></bs-button>
//             </div>
            
//         </div>
//     `

    

//     render() {
//         console.log('render settings view, selected: ', this.selected);

//         const render = this.selected === this.confMap.profile ? this.renderChangeProfile()
//             : this.selected === this.confMap.colorMode ? html`
//                 <button class="btn btn-dark m-3" @click=${() => { BaseElement.toggleColorMode(); }}>
//                     <i class="fa-solid fa-circle-half-stroke"></i>
//                 </button>
//                              ` : '';
//         // <vertical-nav burger .navconfigs=${this.configs} stoppropagation ?row=${isMobile}  ></vertical-nav>
//         return html`
//             ${this.isMobileWidth() ? html`
//                 <div class="h-auto">
//                     <vertical-nav ?burger=${this.isMobileWidth()} .navconfigs=${this.configs} stoppropagation></vertical-nav>
//                 </div>
//                 ${render}
//             ` : html`
//                 <div class="row w-100 h-100">
//                     <div class="p-0 m-0" style="${"height:100%;max-width: 13em;"}">
//                         <vertical-nav ?burger=${this.isMobileWidth()} .navconfigs=${this.configs} stoppropagation></vertical-nav>
//                     </div>
//                     <div class="col">
//                         ${render}
//                     </div>
//                 </div>
//             `}
//     `;
//     }
// }
// window.customElements.define('settings-view', SettingsView);
