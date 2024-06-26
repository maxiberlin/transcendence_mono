import { BaseElem, html } from '../../modules.js';

/**
 * @typedef {Object} ToastNotificationData
 * @property {string | undefined} color
 * @property {string} message
 */

const det = {
    color: "",
    message: "",

}



export class BsToasts extends BaseElem {
    constructor() {
        super(false, false);
    }

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener("render-notification", this.onNotification.bind(this));
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener("render-notification", this.onNotification.bind(this));
    }

    /** @param {CustomEvent} event  */
    onNotification(event) {
        console.log("on notification!")
        /** @type {ToastNotificationData} */
        const data = event.detail;
        this.renderToastErrorMessage(data.message);
    }

    renderToastErrorMessage = (message) => {
        const templ = document.createElement("template");
        templ.innerHTML =  /*html*/`
            <div class="toast align-items-center text-bg-danger border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex alert alert-danger p-1">
                    <div class="toast-body">
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>`
        
        const toast = templ.content.firstElementChild?.cloneNode(true);
        if (!(toast instanceof HTMLElement)) return ;
        const onHidden = (el) => {
            toast.removeEventListener("hidden.bs.toast", onHidden);
            toast.remove();
        };
        toast?.addEventListener("hidden.bs.toast", onHidden);
        console.log("toast: ");
        console.log(toast);
        this.toastCont.appendChild(toast);
        const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toast)
        toastBootstrap.show();

    }

    render() {
        return html`
            <div aria-live="polite" aria-atomic="true" class="position-relative">
                <div ${(el)=>{this.toastCont = el;}} class="toast-container top-0 end-0 p-3">
                    
                </div>
            </div>
        `
    }
}
customElements.define("bs-toasts", BsToasts);

// /**
//  * @typedef {Object} ToastNotificationData
//  * @property {string | undefined} color
//  * @property {string} message
//  */

// const det = {
//     color: "",
//     message: "",

// }



// export class BsToasts extends BaseElem {
//     constructor() {
//         super(false, false);
//     }

//     connectedCallback() {
//         super.connectedCallback();
//         document.addEventListener("render-notification", this.onNotification.bind(this));
//     }

//     disconnectedCallback() {
//         super.disconnectedCallback();
//         document.removeEventListener("render-notification", this.onNotification.bind(this));
//     }

//     /** @param {CustomEvent} event  */
//     onNotification(event) {
//         console.log("on notification!")
//         /** @type {ToastNotificationData} */
//         const data = event.detail;
//         this.renderToastErrorMessage(data.message);
//     }

//     renderToastErrorMessage = (message) => {
//         const templ = document.createElement("template");
//         templ.innerHTML =  /*html*/`
//             <div class="toast align-items-center text-bg-danger border-0" role="alert" aria-live="assertive" aria-atomic="true" data-bs-autohide="false">
//                 <div class="d-flex">
//                     <div class="toast-body">
//                         ${message}
//                     </div>
//                     <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
//                 </div>
//             </div>`
//         this.toastCont.appendChild(templ.content.cloneNode(true));
//     }

//     render() {
//         return html`
//             <div ${(el)=>{this.toastCont = el;}} class="toast-container position-static">
                
//             </div>
//         `
//     }
// }
// customElements.define("bs-toasts", BsToasts);
