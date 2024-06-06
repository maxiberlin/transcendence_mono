import { BaseElement, html } from '../../lib_templ/BaseElement.js';
import GameHubRemote from '../../gaming/manager/gameHub_remote.js';
import { renderAvatar } from '../../components/bootstrap/AvatarComponent.js';

// import { GameHub } from '../../services/gameHub.js';

/**
 *
 * @param {HTMLElement} obsElem
 * @param {number} aspectRatio
 * @param {(newW: number, newH: number) => void} cb
 * @returns {() => void}
 */
function useCanvasSizes(obsElem, aspectRatio, cb) {
    if (!obsElem) throw new Error('undefined wrapper Element');
    if (aspectRatio <= 0) throw new Error('invalid aspect Ratio');
    if (!cb) throw new Error('undefined callback');
    let newW;
    let newH;
    // const elemRect = obsElem.getBoundingClientRect();
    const myObserver = new ResizeObserver((entries) => {
        // console.log("window: ", {width: window.innerWidth, height: window.innerHeight});
        // console.log("elemRect: ", elemRect);
        // console.log("rect: ", entries[0].contentRect);
        newW = entries[0].contentRect.width;
        newH = entries[0].contentRect.height;
        const calcW = Math.trunc(newH / aspectRatio);
        const calcH = Math.trunc(newW * aspectRatio);
        if (calcH > newH) {
            cb(calcW, newH);
        } else {
            cb(newW, calcH);
        }
        // // console.log("newW: ", newW);
        // // console.log("newH: ", newH);
    });
    myObserver.observe(obsElem);
    let disconnected = false;
    return () => {
        if (disconnected) return;
        myObserver.disconnect();
        disconnected = true;
    };
}

export default class GameModalRemote extends BaseElement {
    static observedAtrributes = ['id'];

    constructor() {
        super(false, false);

        this.props.currentGameData = undefined;
        this.currentGame = undefined;
    }

    #aspectRatio = 0.5;

    #closeObs;

    /** @type {HTMLCanvasElement | undefined} */
    #canvas;

    /** @type {HTMLDivElement | undefined} */
    #wrapper;

    disconnectedCallback() {
        super.disconnectedCallback();
        this.#closeObs();
        // this.currentGame?.terminateGame();
    }

    onColorChange() {
        // this.#sendWorker(pMsg.changeColor);
    }

    #modalIsOpen = false;

    async onModalShown() {
        // console.log("on modal shown");

        if (!this.#canvas || !this.#wrapper) return;

        this.#modalIsOpen = true;
        super.requestUpdate();
        this.currentGame = await GameHubRemote.startGame(
            'pong',
            this.#canvas,
            this.props.game_data,
            undefined,
        );
        this.#closeObs = useCanvasSizes(
            this.#wrapper,
            this.#aspectRatio,
            (newW, newH) => {
                if (this.#canvas) {
                    this.#canvas.style.width = `${newW}px`;
                    this.#canvas.style.height = `${newH}px`;
                    this.currentGame?.resizeCanvas(
                        newW,
                        newH,
                        window.devicePixelRatio,
                    );
                }
            },
        );
    }

    onModalHide() {
        this.#modalIsOpen = false;
        super.requestUpdate();
        this.#closeObs();
        // this.currentGame?.terminateGame();
    }

    renderHeader = (gameData) => html`
        <div class="modal-header">
            <h1 class="modal-title fs-5" id="gameModal-label">Match:</h1>
            <div class="w-100 d-flex align-items-center justify-content-evenly">
                <div
                    class="d-flex align-items-center p-1 border border-2 border-success rounded-3"
                    @click=${(ev) => {
                        ev.stopPropagation();
                        ev.preventDefault();
                    }}
                >
                    ${renderAvatar(
                        gameData?.player_one.id,
                        gameData?.player_one.username,
                        gameData?.player_one.avatar,
                        '',
                        'before',
                        '',
                    )}
                    <span class="fs-1 px-3"
                        >${this.currentGame?.scorePlayerOne}</span
                    >
                </div>
                <p class="p-2 m-0 fs-3 text-body-emphasis">VS</p>
                <div
                    class="d-flex align-items-center p-1 border border-2 border-danger rounded-3"
                    @click=${(ev) => {
                        ev.stopPropagation();
                        ev.preventDefault();
                    }}
                >
                    <span class="fs-1 px-3"
                        >${this.currentGame?.scorePlayerOne}</span
                    >
                    ${renderAvatar(
                        gameData?.player_two.id,
                        gameData?.player_two.username,
                        gameData?.player_two.avatar,
                        '',
                        'after',
                        '',
                    )}
                </div>
            </div>
            <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
            ></button>
        </div>
    `;

    static renderFooter = () => html`
        <div class="modal-footer">
            <button
                @click=${() => {
                    // this.currentGame?.startGame();
                }}
                type="button"
                class="btn btn-primary"
            >
                start game
            </button>
            <button
                @click=${() => {
                    // this.currentGame?.quitGame();
                }}
                type="button"
                class="btn btn-success"
            >
                quit game
            </button>
            <button
                @click=${() => {
                    // this.currentGame?.pauseGame();
                }}
                type="button"
                class="btn btn-warning"
            >
                pause game
            </button>
            <button
                @click=${() => {
                    // this.currentGame?.continueGame();
                }}
                type="button"
                class="btn btn-info"
            >
                continue game
            </button>
            <button
                type="button"
                class="btn btn-secondary"
                data-bs-dismiss="modal"
            >
                Close
            </button>
            <button type="button" class="btn btn-primary">Save changes</button>
        </div>
    `;

    render() {
        /** @type {APITypes.GameScheduleItem | undefined} */
        const gameData = this.props.game_data;
        // console.log("render game modal: data: ", gameData);
        return html`
            <div
                @hide.bs.modal=${() => {
                    this.onModalHide();
                }}
                @shown.bs.modal=${() => {
                    this.onModalShown();
                }}
                class="modal fade"
                id="${this.id}-id"
                tabindex="-1"
                aria-labelledby="gameModal-label"
                aria-hidden="true"
                data-bs-keyboard="false"
            >
                <div class="modal-dialog modal-fullscreen">
                    <div class="modal-content">
                        ${this.renderHeader(gameData)}
                        <div class="modal-body">
                            ${!this.#modalIsOpen ?
                                ''
                            :   html`
                                    <div
                                        ${(elem) => {
                                            this.#wrapper = elem;
                                        }}
                                        class="w-100 h-100"
                                    >
                                        <canvas
                                            ${(elem) => {
                                                this.#canvas = elem;
                                            }}
                                        ></canvas>
                                    </div>
                                `}
                        </div>
                        ${GameModalRemote.renderFooter()}
                    </div>
                </div>
            </div>
        `;
        //     super.render(html`
        //         <div ${(elem)=> {this.#wrapper = elem}} class="mx-4 my-1">
        //             <canvas ${(elem)=> {this.#canvas = elem}} ></canvas>
        //         </div>
        // `);
    }
}
window.customElements.define('game-modal-remote', GameModalRemote);

// /**
//  *
//  * @param {HTMLElement} obsElem
//  * @param {number} aspectRatio
//  * @param {(newW: number, newH: number) => void} cb
//  * @returns
//  */
// function useCanvasSizes(obsElem, aspectRatio, cb) {
//     let newW, newH;
//     const elemRect = obsElem.getBoundingClientRect();
//     const myObserver = new ResizeObserver(entries => {

// //         console.log("window: ", {width: window.innerWidth, height: window.innerHeight});
// //         console.log("elemRect: ", elemRect);
// //         console.log("rect: ", entries[0].contentRect);
//         newW = entries[0].contentRect.width;
//         newH = entries[0].contentRect.height;
//         const calcW = Math.trunc(newH / aspectRatio);
//         const calcH = Math.trunc(newW * aspectRatio);
//         if (calcH > newH) {
//             cb(calcW, newH);
//         } else {
//             cb(newW, calcH);
//         }
// //         // console.log("newW: ", newW);
// //         // console.log("newH: ", newH);

//     });
//     myObserver.observe(obsElem);
//     return (() => {
//         myObserver.disconnect();
//     });
// }

// // <div class="d-flex justify-content-evenly pt-3 ">
// //                 <button
// //                     class="btn btn-outline-success btn-lg col-4 mb-4 active"
// //                     @click=${{ cb:() => {this.#sendWorker(pMsg.start)} }}
// //                 >
// //                     1 VS 1</button>
// //                 <button class="btn btn-outline-danger btn-lg col-4 mb-4">Tournament</button>
// //             </div>
// //             <div class="d-flex justify-content-evenly">
// //                 <avatar-component src="./assets/images/bild1.jpg" size="30">
// //                     <h6 class="m-0" slot="before">mberline</h6>
// //                 </avatar-component>
// //                 <h3>VS</h3>
// //                 <avatar-component size="30">
// //                     <h6 class="m-0" slot="after">Player 2</h6>
// //                 </avatar-component>
// //             </div>

// export class PongMaingame extends BaseElem {
//     constructor() {
//         super();

//     }
//     #aspectRatio = 0.5;
//     #closeObs;
//     #sendWorker;
//     #closeWorker;
//     /** @type {HTMLCanvasElement} */
//     #canvas;
//     /** @type {HTMLDivElement} */
//     #wrapper;
//     connectedCallback() {
//         // this.render();
//         super.connectedCallback();
//           [this.#sendWorker, this.#closeWorker] = initPong(this.#canvas);
//           this.#closeObs = useCanvasSizes(this.#wrapper, this.#aspectRatio, (newW, newH) => {
//                 this.#canvas.style.width = newW + "px";
//                 this.#canvas.style.height = newH + "px";
//               this.#sendWorker(pMsg.resize, {w: newW, h: newH, dpr: window.devicePixelRatio});
//             });
//     }
//     disconnectedCallback() {
//         super.disconnectedCallback();
//         this.#closeObs();
//         this.#closeWorker();
//     }

//     onColorChange() {
//         this.#sendWorker(pMsg.changeColor);
//     }

//     render() {
//         return html`
//             <div ${(elem)=> {this.#wrapper = elem}} class="w-100 h-100">
//                 <canvas ${(elem)=> {this.#canvas = elem}} ></canvas>
//             </div>
//     `;
//     //     super.render(html`
//     //         <div ${(elem)=> {this.#wrapper = elem}} class="mx-4 my-1">
//     //             <canvas ${(elem)=> {this.#canvas = elem}} ></canvas>
//     //         </div>
//     // `);
//     }
// }
// window.customElements.define("pong-maingame", PongMaingame);

// export class GameWindowww extends BaseElem {
//     constructor() {
//         super();
//     }

//     // connectedCallback() {
//     //     this.render();
//     // }
//     // disconnectedCallback() {
//     // }

//     render() {
//         return html`
//         <div class="w-100 position-relative bg-white d-flex flex-column" >
//             <game-menu></game-menu>
//             <!-- <pong-maingame></pong-maingame> -->
//         </div>
//     `;
//     //     super.render(html`
//     //     <div class="w-100 h-100 position-relative bg-white d-flex flex-column" >
//     //         <pong-maingame></pong-maingame>
//     //     </div>
//     // `);
//     }
// }
// window.customElements.define("game-windowwww", GameWindowww);

// const usersData = [

//     {username: "soildisc", avatar: "https://picsum.photos/100"},
//     {username: "smokerdemonic", avatar: "https://picsum.photos/100"},
//     {username: "absorbeddispirited", avatar: "https://picsum.photos/100"},
//     {username: "salmontram", avatar: "https://picsum.photos/100"},
//     {username: "collectiveplusia", avatar: "https://picsum.photos/100"},
//     {username: "fairfisherman", avatar: "https://picsum.photos/100"},
//     {username: "chemistwith", avatar: "https://picsum.photos/100"},
//     {username: "glowstonepine", avatar: "https://picsum.photos/100"},
//     {username: "joyeuxsleuth", avatar: "https://picsum.photos/100"},
//     {username: "sugarclove", avatar: "https://picsum.photos/100"},
// ];

// /**
//  *
//  * @param {HTMLElement} obsElem
//  * @param {number} aspectRatio
//  * @param {(newW: number, newH: number) => void} cb
//  * @returns
//  */
// function useCanvasSizes(obsElem, aspectRatio, cb) {
//     let newW, newH;
//     const elemRect = obsElem.getBoundingClientRect();
//     const myObserver = new ResizeObserver(entries => {
// //         // console.log("------------------------");
// //         // console.log("rect sizes: ", elemRect);
// //         // console.log("rect of by observer: ", entries[0].contentRect);
// //         // console.log("window inner width: ", window.innerWidth);
// //         // console.log("window inner height: ", window.innerHeight);
// //         // console.log("cont box: ", entries[0].contentBoxSize);
// //         // console.log("bord box: ", entries[0].borderBoxSize);
// //         // console.log("devicePixelContentBoxSize: ", entries[0].devicePixelContentBoxSize);
// //         // console.log("margin: ", obsElem.style.margin);
// //         // console.log("padding: ", obsElem.style.padding);
// //         // console.log("border: ", obsElem.style.border);
//         // newW = elemRect.x + entries[0].contentRect.width > window.innerWidth - elemRect.x ? window.innerWidth - elemRect.x : entries[0].contentRect.width;
//         // newH = elemRect.y + entries[0].contentRect.height > window.innerHeight - elemRect.y ? window.innerHeight - elemRect.y : entries[0].contentRect.height;

//         newW = entries[0].contentRect.width;
//         newH = entries[0].contentRect.height;
//         newH = Math.trunc(newW * aspectRatio);
// //         // console.log("newW: ", newW);
// //         // console.log("newH: ", newH);
// //         // console.log("------------------------");
//         // if (newH < aspectRatio * newW)
//         //     newW = Math.trunc(newH / aspectRatio);
//         // else newH = Math.trunc(newW * aspectRatio);
//         cb(newW, newH);

//     });
//     myObserver.observe(obsElem);
//     return (() => {
//         myObserver.disconnect();
//     });
// }

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

// export class PongMaingame extends BaseCl {
//     constructor() {
//         super("pong-maingame", true, /*html*/`
//             <!-- <div class="d-block position-relative h-100 w-100"> -->
//             <div class="w-100 h-100 position-relative bg-white d-flex flex-column" >
//                 <!-- <p> Hallo, das ist ein TextHallo, das ist ein TextHallo, das ist ein TextHallo, das ist ein TextHallo, das ist ein TextHallo, das ist ein TextHallo, das ist ein TextHallo, das ist ein TextHallo, das ist ein TextHallo, das ist ein TextHallo, das ist ein TextHallo, das ist ein TextHallo, das ist ein TextHallo, das ist ein TextHallo, das ist ein TextHallo, das ist ein TextHallo, das ist ein Text</p> -->
//                 <div class="d-flex justify-content-evenly pt-3 ">
//                     <button id="data-canvas-btn-two-players" class="btn btn-outline-success btn-lg col-4 mb-4 active">1 VS 1</button>
//                     <button id="data-canvas-btn-tournament" class="btn btn-outline-danger btn-lg col-4 mb-4">Tournament</button>
//                 </div>

//                 <div class="d-flex justify-content-evenly">
//                     <avatar-text data-src="./assets/images/bild1.jpg" data-size="40">
//                         <h6 class="m-0" slot="before">mberline</h6>
//                     </avatar-text>
//                     <h3>VS</h3>
//                     <avatar-text data-size="40">
//                         <h6 class="m-0" slot="after">Player 2</h6>
//                     </avatar-text>
//                 <!-- <span class="position-relative d-flex flex-column" style="width: 50px; height: 50px" style="color: lightblue;">
//                     <img style="fill: white;" class="rounded-circle object-fit-cover" src="./assets/bootstrap-icons/person-circle.svg" width="50" height="50">
//                 </span> -->
//                 </div>
//                 <!-- <div class="d-flex justify-content-center align-items-center">
//                     <label for="bg-color-i" class="form-label text-white pe-2 h4">Background Color</label>
//                     <input type="color" name="bg-color" id="bg-color-i" class="form-control form-control-color" value="#000000">
//                     <label for="court-color-i" class="form-label text-white pe-2 h4">Court Color</label>
//                     <input type="color" name="court-color" id="court-color-i" class="form-control form-control-color" value="#FFFFFF">
//                 </div> -->

//                 <div id="canvas-wrapper" class="mx-4 my-1">

//                     <canvas></canvas>
//                 </div>
//                 <!-- <button class="btn btn-outline-dark position-absolute" style="top: 100px; right: 20px">
//                     <span >
//                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-gear-fill" viewBox="0 0 16 16">
//                             <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/>
//                         </svg>
//                     </span>
//                 </button> -->
//                 <!-- <div id="select-mode" class="card col-8 col-md-6 position-absolute top-50 start-50 translate-middle p-4">
//                     <h2 class="card-header bg-white border-0 text-center">select a Game mode</h2>
//                     <div class="card-body d-flex flex-column justify-content-evenly">
//                         <button id="data-canvas-btn-two-players" class="btn btn-outline-dark btn-lg mb-4">1 VS 1</button>
//                         <button id="data-canvas-btn-tournament" class="btn btn-outline-dark btn-lg ">Tournament</button>
//                     </div>
//                 </div> -->
//                 <div id="select-opponent" class="bg-dark card col-8 col-md-6 position-absolute top-50 start-50 translate-middle p-4" style="height: 370px; width: 340px">
//                     <!-- <h2 id="select-opponent-title" class="card-header bg-dark border-0 text-center text-light">Choose your Opponent</h2> -->
//                     <h2 id="select-opponent-title" class="btn btn-outline-light btn-lg active mb-5 m-3" style="cursor: default;">Choose your Opponent</h2>
//                     <div class="card-body d-flex flex-column justify-content-evenly position-relative">
//                         <!-- <h2 id="select-opponent-title" class="btn btn-outline-light btn-lg active mb-5" style="cursor: default;">Choose your Opponent</h2> -->
//                         <button id="data-canvas-btn-opponent-random" class="btn btn-outline-light btn-lg mb-2">Against random player</button>
//                         <button id="data-canvas-btn-opponent-friend" class="btn btn-outline-light btn-lg mb-2">vs Friend</button>
//                         <button id="data-canvas-btn-opponent-guest" class="btn btn-outline-light btn-lg mb-2">vs guest</button>
//                     </div>
//                 </div>

//             </div>
//         `);
//     }
//     #aspectRatio = 0.5;
//     #closeObs;
//     #sendWorker;
//     #closeWorker;

//     #$ = {
//         /** @type {HTMLElement | undefined} */
//         card: undefined,
//         /** @type {HTMLElement | undefined} */
//         cardTitle: undefined,
//         /** @type {HTMLElement | undefined} */
//         cardBody: undefined,
//         /** @type {HTMLElement | undefined} */
//         btn1v1: undefined,
//         /** @type {HTMLElement | undefined} */
//         btnTournament: undefined,
//         /** @type {HTMLElement | undefined} */
//         btnRandom: undefined,
//         /** @type {HTMLElement | undefined} */
//         btnFriend: undefined,
//         /** @type {HTMLElement | undefined} */
//         btnGuest: undefined,
//     };
//     connectedCallback() {
//         super.connectedCallback();

//         /** @type {HTMLElement} */
//         const canvas = this.$("canvas");
//         if (!canvas || ! canvas.parentElement)
//             throw new Error("no canvas!");
//         this.$("#data-canvas-btn-two-players").addEventListener("click", this.onOneVOne.bind(this));
//         this.$("#select-opponent").addEventListener("click", this.onChooseOpponent.bind(this));

//         this.#$.btn1v1 = this.$("#data-canvas-btn-two-players");
//         this.#$.btnTournament = this.$("#data-canvas-btn-tournament");
//         this.#$.card = this.$("#select-opponent");
//         this.#$.cardTitle = this.$("#select-opponent-title");
//         this.#$.cardBody = this.$("#select-opponent div");
//         this.#$.btnRandom = this.$("#data-canvas-btn-opponent-random");
//         this.#$.btnFriend = this.$("#data-canvas-btn-opponent-friend");
//         this.#$.btnGuest = this.$("#data-canvas-btn-opponent-guest");

//         [this.#sendWorker, this.#closeWorker] = initPong(canvas);
//         // this.#closeObs = useCanvasSizes(canvas.parentElement, this.#aspectRatio, (newW, newH) => {
//         this.#closeObs = useCanvasSizes(this.$("#canvas-wrapper"), this.#aspectRatio, (newW, newH) => {
// //             // console.log("resize :)");
//             canvas.style.width = newW + "px";
//             canvas.style.height = newH + "px";
//             this.#sendWorker(pMsg.resize, {w: newW, h: newH, dpr: window.devicePixelRatio});
//         });

//     }
//     onOneVOne() {
//         this.#sendWorker(pMsg.start);
//         // this.$("#select-mode").setAttribute("hidden", "");
//     }
//     makeAnimation(target, first, sec, newElem) {
//         const duration = 300;
//         target.classList.add("active");
//         if (!this.#$.cardTitle) throw new Error("NO CARD TITLE");
//         const titleY = this.#$.cardTitle.getBoundingClientRect().y;
//         /** @type {Animation} */
//         const aR = target.animate([
//             { transform: `translateY(-${target.getBoundingClientRect().y - titleY}px)` },
//         ], {duration: duration});
//         // /** @type {Animation} */
//         // const aT = this.#$.cardTitle.animate([{ opacity: 0 }], {duration: duration});
//         /** @type {Animation} */
//         const aF = first.animate([{ opacity: 0 }], {duration: duration});
//         /** @type {Animation} */
//         const aG = sec.animate([{ opacity: 0 }], {duration: duration});
//         Promise.all([aR.finished, aF.finished, aG.finished]).then((e) => {
// //             console.log("NFNNKLF FWMFWW")
//             first.setAttribute("hidden", "");
//             sec.setAttribute("hidden", "");
//             target.setAttribute("hidden", "");
//             target.classList.remove("active");
//             if (!this.#$.cardTitle) throw new Error("NO CARD TITLE");
//             this.#$.cardTitle.innerText = target.innerText;
//             if (!this.#$.cardBody) throw new Error("NO CARD BODY");
//             this.#$.cardBody.appendChild(newElem);
//             newElem.animate([{ opacity: 0 }, { opacity: 1 }], {duration: duration});
//         });

//         // Promise.all([aR.finished, aF.finished, aG.finished, aT.finished]).then((e) => {

//         //     target.setAttribute("hidden", "");
//         //     first.setAttribute("hidden", "");
//         //     sec.setAttribute("hidden", "");
//         //     if (!this.#$.cardTitle) throw new Error("NO CARD TITLE");
//         //     this.#$.cardTitle.innerText = target.innerText;

//         //     if (!this.#$.cardBody) throw new Error("NO CARD BODY");
//         //     this.#$.cardBody.appendChild(newElem);
//         //     newElem.animate([{ opacity: 0 }, { opacity: 1 }], {duration: duration});
//         // });
//     }

//     onChooseOpponent(event) {
//         if (event.target === this.#$.btnRandom) {

//             this.makeAnimation(event.target, this.#$.btnFriend, this.#$.btnGuest,
//                 this.createNode(/*html*/`
//                     <div
//                         class="d-flex justify-content-center align-items-center"
//                     >
//                         <div
//                             class="spinner-border text-primary spinner-border-sm"
//                             role="status"
//                         >
//                             <span class="visually-hidden">Loading...</span>
//                         </div>
//                     </div>

//                 `));
//         }
//         if (event.target == this.#$.btnFriend) {
//             this.makeAnimation(event.target, this.#$.btnRandom, this.#$.btnGuest, this.createNode(/*html*/`
//                 <div class="btn-group">
//                     <button
//                         class="btn btn-secondary dropdown-toggle"
//                         type="button"
//                         id="triggerId"
//                         data-bs-toggle="dropdown"
//                         aria-haspopup="true"
//                         aria-expanded="false"
//                     >
//                         This dropdown's menu is start/end-aligned
//                     </button>
//                     <div
//                         class="dropdown-menu dropdown-menu-start"
//                         aria-labelledby="triggerId"
//                     >
//                         <a class="dropdown-item" href="#">Action</a>
//                         <a class="dropdown-item disabled" href="#">Disabled action</a>
//                         <h6 class="dropdown-header">Section header</h6>
//                         <a class="dropdown-item" href="#">Action</a>
//                         <div class="dropdown-divider"></div>
//                         <a class="dropdown-item" href="#">After divider action</a>
//                     </div>
//                 </div>

//             `));
//                 // <floating-input-group id="friend-search" type="text" name="search" autofocus></floating-input-group>
//         }
//         if (event.target == this.#$.btnGuest)
//             this.makeAnimation(event.target, this.#$.btnRandom, this.#$.btnFriend);
//     }

//     disconnectedCallback() {
//         super.disconnectedCallback();
//         this.#closeObs();
//         this.#closeWorker();
//         this.$("#data-canvas-btn-two-players").removeEventListener("click", this.onOneVOne.bind(this));
//     }

//     onPongMessage() {

//     }

//     #pong;
// }
// window.customElements.define("pong-maingame", PongMaingame);

// const usersData = [

//     {username: "soildisc", avatar: "https://picsum.photos/100"},
//     {username: "smokerdemonic", avatar: "https://picsum.photos/100"},
//     {username: "absorbeddispirited", avatar: "https://picsum.photos/100"},
//     {username: "salmontram", avatar: "https://picsum.photos/100"},
//     {username: "collectiveplusia", avatar: "https://picsum.photos/100"},
//     {username: "fairfisherman", avatar: "https://picsum.photos/100"},
//     {username: "chemistwith", avatar: "https://picsum.photos/100"},
//     {username: "glowstonepine", avatar: "https://picsum.photos/100"},
//     {username: "joyeuxsleuth", avatar: "https://picsum.photos/100"},
//     {username: "sugarclove", avatar: "https://picsum.photos/100"},
// ];
