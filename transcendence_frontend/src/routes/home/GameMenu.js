/* eslint-disable max-classes-per-file */
import { BaseElement, html } from '../../lib_templ/BaseElement.js';

// eslint-disable-next-line func-names
const getNextNo = (function () {
    let i = 0;
    return () => ++i;
})();

export class BsCheck extends BaseElement {
    static observedAttributes = [
        'label',
        'name',
        'checked',
        'disabled',
        'type',
        'btn',
    ];

    static formAssociated = true;

    constructor() {
        super(false, false);
        this.label = '';
        this.name = '';
        this.type = '';
        this.btn = false;
        this.checked = false;
        this.disabled = false;
        this.#internals = this.attachInternals();
    }

    #inputElem;

    #internals;

    render() {
        const id = getNextNo();
        return html`
            <div
                class="form-check ${this.type === 'switch' ?
                    'form-switch'
                :   ''}"
            >
                <input
                    @input=${{
                        cb: (e) => {
                            this.#internals.setFormValue(e.target.value);
                        },
                    }}
                    class="form-check-input"
                    type="${this.type === 'radio' ? 'radio' : 'checkbox'}"
                    role="switch"
                    id="${this.name}-id-${id}"
                    ?checked=${this.checked}
                    ?disabled=${this.disabled}
                    name="${this.name}"
                />
                <label class="form-check-label" for="${this.name}-id-${id}">
                    ${this.label}
                </label>
            </div>
        `;
    }
}
customElements.define('bs-check', BsCheck);

export class BsRadioGroup extends BaseElement {
    static observedAttributes = ['name'];

    constructor() {
        super();
        this.name = '';
    }

    connectedCallback() {
        super.connectedCallback();
        this.shadowRoot
            ?.querySelector('slot')
            ?.assignedElements()
            .forEach((elem) => {
                // console.log('ELEM TAG NAME: ', elem.tagName);
                elem.setAttribute('name', this.name);
            });
    }

    render() {
        return html` <slot></slot> `;
    }
}
customElements.define('bs-radio-group', BsRadioGroup);

export class GameMenu extends BaseElement {
    static handleForm(e) {
        e.preventDefault();
        // console.log('target: ', e.target);
        // const formdata = new FormData(e.target);
        // console.log('formData: ', formdata.entries());
        // console.log('submitted values: ');
        // while (formdata.entries().next()) {
        //     console.log(pair[0], pair[1]);
        // }
    }

    render() {
        return html`
            <div>
                <form action="" @submit=${GameMenu.handleForm.bind(this)}>
                    <!-- <bs-radio-group name="peace"> -->
                    <bs-check label="HAAALLLOOO" type="radio"></bs-check>
                    <bs-check label="HAAALLLOOO" type="radio"></bs-check>
                    <bs-check label="HAAALLLOOO" type="radio"></bs-check>
                    <bs-check label="HAAALLLOOO" type="check"></bs-check>
                    <input type="text" name="huhu" id="fwofpp" />
                    <button type="submit" class="btn btn-primary">
                        Submit
                    </button>
                    <!-- </bs-radio-group> -->
                </form>
            </div>
        `;
    }
}
customElements.define('game-menu', GameMenu);

// class GameMenu extends BaseElem {
//     constructor() {
//         super();
//     }
//     render() {

//         super.render(html`
//             <div id="select-opponent" class="bg-dark card col-8 col-md-6 position-absolute top-50 start-50 translate-middle p-4" style="height: 370px; width: 340px">
//                 <!-- <h2 id="select-opponent-title" class="card-header bg-dark border-0 text-center text-light">Choose your Opponent</h2> -->
//                 <h2 id="select-opponent-title" class="btn btn-outline-light btn-lg active mb-5 m-3" style="cursor: default;">Choose your Opponent</h2>
//                 <div class="card-body d-flex flex-column justify-content-evenly position-relative">
//                     <!-- <h2 id="select-opponent-title" class="btn btn-outline-light btn-lg active mb-5" style="cursor: default;">Choose your Opponent</h2> -->
//                     <button id="data-canvas-btn-opponent-random" class="btn btn-outline-light btn-lg mb-2">Against random player</button>
//                     <button id="data-canvas-btn-opponent-friend" class="btn btn-outline-light btn-lg mb-2">vs Friend</button>
//                     <button id="data-canvas-btn-opponent-guest" class="btn btn-outline-light btn-lg mb-2">vs guest</button>
//                 </div>
//             </div>
//     `)}
// }
// window.customElements.define("game-menu", GameMenu);

// #$ = {
//     /** @type {HTMLElement | undefined} */
//     card: undefined,
//     /** @type {HTMLElement | undefined} */
//     cardTitle: undefined,
//     /** @type {HTMLElement | undefined} */
//     cardBody: undefined,
//     /** @type {HTMLElement | undefined} */
//     btn1v1: undefined,
//     /** @type {HTMLElement | undefined} */
//     btnTournament: undefined,
//     /** @type {HTMLElement | undefined} */
//     btnRandom: undefined,
//     /** @type {HTMLElement | undefined} */
//     btnFriend: undefined,
//     /** @type {HTMLElement | undefined} */
//     btnGuest: undefined,
// };

// onOneVOne() {
//     this.#sendWorker(pMsg.start);
//     // this.$("#select-mode").setAttribute("hidden", "");
// }
// makeAnimation(target, first, sec, newElem) {
//     const duration = 300;
//     target.classList.add("active");
//     if (!this.#$.cardTitle) throw new Error("NO CARD TITLE");
//     const titleY = this.#$.cardTitle.getBoundingClientRect().y;
//     /** @type {Animation} */
//     const aR = target.animate([
//         { transform: `translateY(-${target.getBoundingClientRect().y - titleY}px)` },
//     ], {duration: duration});
//     // /** @type {Animation} */
//     // const aT = this.#$.cardTitle.animate([{ opacity: 0 }], {duration: duration});
//     /** @type {Animation} */
//     const aF = first.animate([{ opacity: 0 }], {duration: duration});
//     /** @type {Animation} */
//     const aG = sec.animate([{ opacity: 0 }], {duration: duration});
//     Promise.all([aR.finished, aF.finished, aG.finished]).then((e) => {
//         console.log("NFNNKLF FWMFWW")
//         first.setAttribute("hidden", "");
//         sec.setAttribute("hidden", "");
//         target.setAttribute("hidden", "");
//         target.classList.remove("active");
//         if (!this.#$.cardTitle) throw new Error("NO CARD TITLE");
//         this.#$.cardTitle.innerText = target.innerText;
//         if (!this.#$.cardBody) throw new Error("NO CARD BODY");
//         this.#$.cardBody.appendChild(newElem);
//         newElem.animate([{ opacity: 0 }, { opacity: 1 }], {duration: duration});
//     });

//     // Promise.all([aR.finished, aF.finished, aG.finished, aT.finished]).then((e) => {

//     //     target.setAttribute("hidden", "");
//     //     first.setAttribute("hidden", "");
//     //     sec.setAttribute("hidden", "");
//     //     if (!this.#$.cardTitle) throw new Error("NO CARD TITLE");
//     //     this.#$.cardTitle.innerText = target.innerText;

//     //     if (!this.#$.cardBody) throw new Error("NO CARD BODY");
//     //     this.#$.cardBody.appendChild(newElem);
//     //     newElem.animate([{ opacity: 0 }, { opacity: 1 }], {duration: duration});
//     // });
// }

// onChooseOpponent(event) {
//     if (event.target === this.#$.btnRandom) {

//         this.makeAnimation(event.target, this.#$.btnFriend, this.#$.btnGuest,
//             this.createNode(/*html*/`
//                 <div
//                     class="d-flex justify-content-center align-items-center"
//                 >
//                     <div
//                         class="spinner-border text-primary spinner-border-sm"
//                         role="status"
//                     >
//                         <span class="visually-hidden">Loading...</span>
//                     </div>
//                 </div>

//             `));
//     }
//     if (event.target == this.#$.btnFriend) {
//         this.makeAnimation(event.target, this.#$.btnRandom, this.#$.btnGuest, this.createNode(/*html*/`
//             <div class="btn-group">
//                 <button
//                     class="btn btn-secondary dropdown-toggle"
//                     type="button"
//                     id="triggerId"
//                     data-bs-toggle="dropdown"
//                     aria-haspopup="true"
//                     aria-expanded="false"
//                 >
//                     This dropdown's menu is start/end-aligned
//                 </button>
//                 <div
//                     class="dropdown-menu dropdown-menu-start"
//                     aria-labelledby="triggerId"
//                 >
//                     <a class="dropdown-item" href="#">Action</a>
//                     <a class="dropdown-item disabled" href="#">Disabled action</a>
//                     <h6 class="dropdown-header">Section header</h6>
//                     <a class="dropdown-item" href="#">Action</a>
//                     <div class="dropdown-divider"></div>
//                     <a class="dropdown-item" href="#">After divider action</a>
//                 </div>
//             </div>

//         `));
//             // <floating-input-group id="friend-search" type="text" name="search" autofocus></floating-input-group>
//     }
//     if (event.target == this.#$.btnGuest)
//         this.makeAnimation(event.target, this.#$.btnRandom, this.#$.btnFriend);
// }

// disconnectedCallback() {
//     super.disconnectedCallback();
//     this.#closeObs();
//     this.#closeWorker();
//     this.$("#data-canvas-btn-two-players").removeEventListener("click", this.onOneVOne.bind(this));
// }

// onPongMessage() {

// }

// OLD V
// <div class="card col-8 col-md-6 position-absolute top-50 start-50 translate-middle">
//                     <h2 class="card-header">select a Game mode</h2>
//                     <div class="card-body d-flex flex-column justify-content-evenly">
//                             <button id="data-canvas-btn-two-players" class="btn btn-outline-secondary btn-lg mb-2">1 VS 1</button>
//                             <button id="data-canvas-btn-tournament" class="btn btn-outline-secondary btn-lg mb-2">Tournament</button>

//                         <h4>Timeout</h4>
//                         <div class="btn-group" role="group" aria-label="Basic radio toggle button group">
//                             <input type="radio" class="btn-check" name="timeout" id="btnradio1" autocomplete="off">
//                             <label class="btn btn-outline-secondary" for="btnradio1">none</label>

//                             <input type="radio" class="btn-check" name="timeout" id="btnradio2" autocomplete="off" checked>
//                             <label class="btn btn-outline-secondary" for="btnradio2">1 min</label>

//                             <input type="radio" class="btn-check" name="timeout" id="btnradio3" autocomplete="off">
//                             <label class="btn btn-outline-secondary" for="btnradio3">3 min</label>

//                             <input type="radio" class="btn-check" name="timeout" id="btnradio4" autocomplete="off">
//                             <label class="btn btn-outline-secondary" for="btnradio4">10 min</label>

//                         </div>
//                         <h4>Score to Win</h4>
//                         <div class="btn-group" role="group" aria-label="Basic radio toggle button group">
//                             <input type="radio" class="btn-check" name="score" id="btnradio5" autocomplete="off" checked>
//                             <label class="btn btn-outline-secondary" for="btnradio5">5</label>

//                             <input type="radio" class="btn-check" name="score" id="btnradio6" autocomplete="off">
//                             <label class="btn btn-outline-secondary" for="btnradio6">10</label>

//                             <input type="radio" class="btn-check" name="score" id="btnradio7" autocomplete="off">
//                             <label class="btn btn-outline-secondary" for="btnradio7">15</label>

//                             <input type="radio" class="btn-check" name="score" id="btnradio8" autocomplete="off">
//                             <label class="btn btn-outline-secondary" for="btnradio8">20</label>
//                         </div>

//                         <h4>Ball slower during serve</h4>
//                         <div class="btn-group" role="group" aria-label="Basic radio toggle button group">
//                             <input type="radio" class="btn-check" name="slow" id="btnradio9" autocomplete="off" checked>
//                             <label class="btn btn-outline-secondary" for="btnradio9">yes</label>

//                             <input type="radio" class="btn-check" name="slow" id="btnradio10" autocomplete="off">
//                             <label class="btn btn-outline-secondary" for="btnradio10">no</label>
//                         </div>
//                         <h4>Paddle Speed</h4>
//                             <label for="customRange1" class="form-label"></label>
//                             <input type="range" class="form-range" id="customRange1">
//                         <h4>who starts after a point</h4>
//                         <div class="btn-group" role="group" aria-label="Basic radio toggle button group">
//                             <input type="radio" class="btn-check" name="score-win" id="btnradio11" autocomplete="off" checked>
//                             <label class="btn btn-outline-secondary" for="btnradio11">Winner</label>

//                             <input type="radio" class="btn-check" name="score-win" id="btnradio12" autocomplete="off">
//                             <label class="btn btn-outline-secondary" for="btnradio12">Loser</label>

//                             <input type="radio" class="btn-check" name="score-win" id="btnradio13" autocomplete="off">
//                             <label class="btn btn-outline-secondary" for="btnradio13">Alternate</label>
//                         </div>

//                     </div>

//                 </div>

// ^
// | OLD

// class PongGameSettings extends BaseCl {
//     constructor() {
//         super("pong-game-settings", true);
//         super.setTemplate(/*html*/`
//             <div class="modal show d-block">
//                 <div class="modal-dialog">
//                     <div class="modal-content">
//                         <div class="modal-header">
//                             <h2 class="modal-title">Game Settings</h2>
//                         </div>
//                         <div class="modal-body">
//                             <div class=" d-flex justify-content-evenly row">
//                                 <div class="d-flex flex-column col-xs-12 col-sm-6">
//                                     <h4>Timeout</h4>
//                                     <div class="btn-group-vertical btn-group-sm mb-3 " role="group" aria-label="Basic radio toggle button group">
//                                         <input type="radio" class="btn-check" name="timeout" id="btnradio1" autocomplete="off">
//                                         <label class="btn btn-outline-dark" for="btnradio1">none</label>

//                                         <input type="radio" class="btn-check" name="timeout" id="btnradio2" autocomplete="off" checked>
//                                         <label class="btn btn-outline-dark" for="btnradio2">1 min</label>

//                                         <input type="radio" class="btn-check" name="timeout" id="btnradio3" autocomplete="off">
//                                         <label class="btn btn-outline-dark" for="btnradio3">3 min</label>

//                                         <input type="radio" class="btn-check" name="timeout" id="btnradio4" autocomplete="off">
//                                         <label class="btn btn-outline-dark" for="btnradio4">10 min</label>
//                                     </div>
//                                 </div>
//                                 <div class="d-flex flex-column col-xs-12 col-sm-6">
//                                     <h4>Score to Win</h4>
//                                     <div class="btn-group-vertical btn-group-sm mb-3" role="group" aria-label="Basic radio toggle button group">
//                                         <input type="radio" class="btn-check" name="score" id="btnradio5" autocomplete="off" checked>
//                                         <label class="btn btn-outline-dark" for="btnradio5">5</label>

//                                         <input type="radio" class="btn-check" name="score" id="btnradio6" autocomplete="off">
//                                         <label class="btn btn-outline-dark" for="btnradio6">10</label>

//                                         <input type="radio" class="btn-check" name="score" id="btnradio7" autocomplete="off">
//                                         <label class="btn btn-outline-dark" for="btnradio7">15</label>

//                                         <input type="radio" class="btn-check" name="score" id="btnradio8" autocomplete="off">
//                                         <label class="btn btn-outline-dark" for="btnradio8">20</label>
//                                     </div>
//                                 </div>
//                                 <div class="d-flex flex-column col-xs-12 col-sm-6">
//                                     <h5 class="text-wrap">Ball slower during serve</h5>
//                                     <div class="btn-group-vertical btn-group-sm mb-3" role="group" aria-label="Basic radio toggle button group">
//                                         <input type="radio" class="btn-check" name="slow" id="btnradio9" autocomplete="off" checked>
//                                         <label class="btn btn-outline-dark" for="btnradio9">yes</label>

//                                         <input type="radio" class="btn-check" name="slow" id="btnradio10" autocomplete="off">
//                                         <label class="btn btn-outline-dark" for="btnradio10">no</label>
//                                     </div>
//                                 </div>
//                                 <div class="d-flex flex-column col-xs-12 col-sm-6">
//                                     <h4>start after point</h4>
//                                     <div class="btn-group-vertical btn-group-sm mb-3" role="group" aria-label="Basic radio toggle button group">
//                                         <input type="radio" class="btn-check" name="score-win" id="btnradio11" autocomplete="off" checked>
//                                         <label class="btn btn-outline-dark" for="btnradio11">Winner</label>

//                                         <input type="radio" class="btn-check" name="score-win" id="btnradio12" autocomplete="off">
//                                         <label class="btn btn-outline-dark" for="btnradio12">Loser</label>

//                                         <input type="radio" class="btn-check" name="score-win" id="btnradio13" autocomplete="off">
//                                         <label class="btn btn-outline-dark" for="btnradio13">Alternate</label>
//                                     </div>
//                                 </div>
//                             </div>
//                             <div class="mb-3">
//                                 <!-- <h4>Paddle Speed</h4> -->
//                                 <label for="customRange1" class="form-label h5">Paddle speed</label>
//                                 <input type="range" class="form-range" id="customRange1">
//                             </div>
//                             <div class="modal-footer">
//                                 <button class="btn btn-outline-dark">Cancel</button>
//                                 <button class="btn btn-dark">Apple</button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//             <!-- <div class="modal show d-block">
//                 <div class="modal-dialog">
//                     <div class="modal-content">
//                         <div class="modal-header">
//                             <h2 class="modal-title">Game Settings</h2>
//                         </div>
//                         <div class="modal-body">
//                             <div class=" d-flex justify-content-evenly">
//                                 <div class="d-flex flex-column flex-grow-1">
//                                     <h4>Timeout</h4>
//                                     <div class="btn-group-vertical mb-3 " role="group" aria-label="Basic radio toggle button group">
//                                         <input type="radio" class="btn-check" name="timeout" id="btnradio1" autocomplete="off">
//                                         <label class="btn btn-outline-dark" for="btnradio1">none</label>

//                                         <input type="radio" class="btn-check" name="timeout" id="btnradio2" autocomplete="off" checked>
//                                         <label class="btn btn-outline-dark" for="btnradio2">1 min</label>

//                                         <input type="radio" class="btn-check" name="timeout" id="btnradio3" autocomplete="off">
//                                         <label class="btn btn-outline-dark" for="btnradio3">3 min</label>

//                                         <input type="radio" class="btn-check" name="timeout" id="btnradio4" autocomplete="off">
//                                         <label class="btn btn-outline-dark" for="btnradio4">10 min</label>
//                                     </div>
//                                 </div>
//                                 <div class="d-flex flex-column flex-grow-1">
//                                     <h4>Score to Win</h4>
//                                     <div class="btn-group-vertical mb-3" role="group" aria-label="Basic radio toggle button group">
//                                         <input type="radio" class="btn-check" name="score" id="btnradio5" autocomplete="off" checked>
//                                         <label class="btn btn-outline-dark" for="btnradio5">5</label>

//                                         <input type="radio" class="btn-check" name="score" id="btnradio6" autocomplete="off">
//                                         <label class="btn btn-outline-dark" for="btnradio6">10</label>

//                                         <input type="radio" class="btn-check" name="score" id="btnradio7" autocomplete="off">
//                                         <label class="btn btn-outline-dark" for="btnradio7">15</label>

//                                         <input type="radio" class="btn-check" name="score" id="btnradio8" autocomplete="off">
//                                         <label class="btn btn-outline-dark" for="btnradio8">20</label>
//                                     </div>
//                                 </div>
//                                 <div class="d-flex flex-column flex-grow-1">
//                                     <h5 class="text-wrap">Ball slower during serve</h5>
//                                     <div class="btn-group-vertical mb-3" role="group" aria-label="Basic radio toggle button group">
//                                         <input type="radio" class="btn-check" name="slow" id="btnradio9" autocomplete="off" checked>
//                                         <label class="btn btn-outline-dark" for="btnradio9">yes</label>

//                                         <input type="radio" class="btn-check" name="slow" id="btnradio10" autocomplete="off">
//                                         <label class="btn btn-outline-dark" for="btnradio10">no</label>
//                                     </div>
//                                 </div>
//                             </div>
//                             <div class=" d-flex justify-content-evenly">

//                                 <div class="d-flex flex-column">
//                                     <h4>who starts after a point</h4>
//                                     <div class="btn-group-vertical mb-3" role="group" aria-label="Basic radio toggle button group">
//                                         <input type="radio" class="btn-check" name="score-win" id="btnradio11" autocomplete="off" checked>
//                                         <label class="btn btn-outline-dark" for="btnradio11">Winner</label>

//                                         <input type="radio" class="btn-check" name="score-win" id="btnradio12" autocomplete="off">
//                                         <label class="btn btn-outline-dark" for="btnradio12">Loser</label>

//                                         <input type="radio" class="btn-check" name="score-win" id="btnradio13" autocomplete="off">
//                                         <label class="btn btn-outline-dark" for="btnradio13">Alternate</label>
//                                     </div>
//                                 </div>
//                             </div>
//                             <div>
//                                 <h4>Paddle Speed</h4>
//                                 <label for="customRange1" class="form-label"></label>
//                                 <input type="range" class="form-range" id="customRange1">
//                             </div>
//                             <div class="modal-footer">
//                                 <button class="btn btn-outline-dark">Cancel</button>
//                                 <button class="btn btn-dark">Apple</button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div> -->
//     `);
//     }
// }
// customElements.define("pong-game-settings", PongGameSettings);

// <!-- <button class="btn btn-outline-dark position-absolute" style="top: 100px; right: 20px">
// <span >
//     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-gear-fill" viewBox="0 0 16 16">
//         <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/>
//     </svg>
// </span>
// </button> -->
// <!--
// <div id="select-mode" class="card col-8 col-md-6 position-absolute top-50 start-50 translate-middle p-4">
// <h2 class="card-header bg-white border-0 text-center">select a Game mode</h2>
// <div class="card-body d-flex flex-column justify-content-evenly">
//     <button id="data-canvas-btn-two-players" class="btn btn-outline-dark btn-lg mb-4">1 VS 1</button>
//     <button id="data-canvas-btn-tournament" class="btn btn-outline-dark btn-lg ">Tournament</button>
// </div>
// </div>
// -->
