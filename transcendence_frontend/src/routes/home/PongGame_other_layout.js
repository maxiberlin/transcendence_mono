/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-console */
import { BaseElement, createRef, html, ref } from '../../lib_templ/BaseElement.js';
import GameHub from '../../gaming/manager/gameHub.js';
import { avatarInfo, avatarLink, renderAvatar } from '../../components/bootstrap/AvatarComponent.js';
import { sessionService } from '../../services/api/API_new.js';
import router from '../../services/router.js';
import { ToastNotificationErrorEvent, ToastNotificationSuccessEvent } from '../../components/bootstrap/BsToasts.js';
import BsModal from '../../components/bootstrap/BsModal.js';
import { Modal } from 'bootstrap';

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
    const myObserver = new ResizeObserver((entries) => {
        console.log('obsElem boundingRect: ', obsElem.getBoundingClientRect());
        console.log('contentRect: ', entries[0].contentRect);
        newW = entries[0].contentRect.width;
        newH = entries[0].contentRect.height;
        const calcW = Math.trunc(newH / aspectRatio);
        const calcH = Math.trunc(newW * aspectRatio);
        if (calcH > newH) {
            cb(calcW, newH);
        } else {
            cb(newW, calcH);
        }
    });
    myObserver.observe(obsElem);
    let disconnected = false;
    return () => {
        if (disconnected) return;
        myObserver.disconnect();
        disconnected = true;
    };
}

const renderLoadingModal = () => html`
    <div
        class="modal fade"
        id="loadingModal"
        tabindex="-1"
        aria-labelledby="loadingModalLabel"
        aria-hidden="true"
    >
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="loadingModalLabel">Verbindung wird hergestellt...</h5>
                </div>
                <div class="modal-body text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Laden...</span>
                    </div>
                    <p class="mt-3">Bitte warten, während die Verbindung zum Server hergestellt wird.</p>
                </div>
            </div>
        </div>
    </div>
`;

export default class GameModal2 extends BaseElement {
    static observedAtrributes = ['id'];

    constructor() {
        super(false, false);
        this.session = sessionService.subscribe(this);

        /** @type {GameHub | undefined} */
        this.currentGame = undefined;
    }

    #aspectRatio = 0.5;

    #closeObs;

    // /** @type {HTMLCanvasElement | undefined} */
    // #canvas;

    // /** @type {HTMLDivElement | undefined} */
    // #wrapper;
    /** @type {import('../../lib_templ/BaseElement.js').Ref<HTMLCanvasElement>} */
    #canvas = createRef()

    /** @type {import('../../lib_templ/BaseElement.js').Ref<HTMLDivElement>} */
    #wrapper = createRef()


    /** @type {APITypes.GameScheduleItem | null} */
    #gameData = null;
    onBeforeMount(route, params, url) {
        console.log('game window, params: ', params);
        console.log('session value: ', this.session.value);
        const game = this.session.value?.game_schedule?.find(i => i.schedule_id == params.schedule_id);
        if (game == undefined) {
            document.dispatchEvent(new ToastNotificationErrorEvent("game not found"));
            return router.redirect("/");
        }
        this.#gameData = game;
        console.log('game: ', game);
    }



    #gameReady = false;
    #gameStarted = false;
    connectedCallback() {
        super.connectedCallback();
        console.log('game view connected');
        document.body.classList.add("overflow-hidden");

        

        // super.requestUpdate();

        console.log('connected callback canvas: ', this.#canvas.value);
        console.log('connected callback wrapper: ', this.#wrapper.value);
        console.log('connected callback gameData: ', this.#gameData);
        if (!this.#canvas.value || !this.#wrapper.value || !this.#gameData) return;
        this.currentGame = GameHub.startGame(this.#canvas.value, this.#gameData, true);
        this.#closeObs = useCanvasSizes(this.#wrapper.value, this.#aspectRatio, (newW, newH) => {
            console.log('NEW CANVAS SIZES: ', this.#canvas, ", ", this.#canvas.value);
            if (!this.#canvas.value || !this.#wrapper.value) return;
            this.#canvas.value.style.width = `${newW}px`;
            this.#canvas.value.style.height = `${newH}px`;
            const canvasRect = this.#canvas.value.getBoundingClientRect();
            this.currentGame?.resizeCanvas(canvasRect.x, canvasRect.y, newW, newH, window.devicePixelRatio);
        });

        this.currentGame?.setWorkerMessageHandler("from-worker-game-ready", (msg) => {
            this.#gameReady = true;
            console.log('WORKER GAME READY');
            this.#startGameModal.value?.showModal();
            super.requestUpdate();
        })
        this.currentGame?.setWorkerMessageHandler("from-worker-client-connected", (msg) => {
            // if (msg.user_id !== this.session.value?.user?.id)
            //     document.dispatchEvent(new ToastNotificationSuccessEvent(`${msg.user_id === this.#gameData?.player_one.id ? this.#gameData?.player_one.username : this.#gameData?.player_two.username } joined the game`))
        })
        this.currentGame?.setWorkerMessageHandler("from-worker-client-disconnected", (msg) => {
            
            this.#disconnectedUser.self = msg.user_id === this.session.value?.user?.id ? true : false;
            this.#disconnectedUser.data = msg.user_id === this.#gameData?.player_one.id ? this.#gameData?.player_one : this.#gameData?.player_two;
            this.#disconnectModal.value?.showModal();
            super.requestUpdate();
        })
        this.currentGame?.setWorkerMessageHandler("from-worker-client-reconnected", (msg) => {
            this.#disconnectModal.value?.hideModal();
            super.requestUpdate();
        })
        this.currentGame?.setWorkerMessageHandler("from-worker-game-paused", (msg) => {
            this.#paused = true;
        })
        this.currentGame?.setWorkerMessageHandler("from-worker-game-resumed", (msg) => {
            this.#paused = false;
        })
        this.currentGame?.setWorkerMessageHandler("from-worker-error", (msg) => {
            this.currentGame?.quitGame();
            document.dispatchEvent(new ToastNotificationErrorEvent(msg.error));
            router.redirect('/')
        })
        this.currentGame?.setWorkerMessageHandler("from-worker-player-scored", (msg) => {
            
        })

        this.currentGame?.setWorkerMessageHandler("from-worker-game-done", (br) => {
            
        })
    }


    disconnectedCallback() {
        document.body.classList.remove("overflow-hidden");
        super.disconnectedCallback();
        if (this.#closeObs) this.#closeObs();
        this.currentGame?.quitGame();
    }

    renderFooter = () => html`
        <div class="modal-footer">
            <button type="button" class="btn btn-primary" @click=${() => { this.currentGame?.startGame(); }} >
                start game
            </button>
            <button type="button" class="btn btn-success" @click=${() => { this.currentGame?.quitGame(); }} >
                quit game
            </button>
            <button type="button" class="btn btn-warning" @click=${() => { this.currentGame?.pauseGame(); }} >
                pause game
            </button>
            <button type="button" class="btn btn-info" @click=${() => { this.currentGame?.continueGame(); }} >
                continue game
            </button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"
                @click=${() => { this.currentGame?.quitGame(); }}
            >
                Close
            </button>
        </div>
    `;

    /** @type {{self: boolean, data: APITypes.PlayerData | undefined}} */
    #disconnectedUser = {
        self: false,
        data: undefined
    };
    #paused = false;
    
    /** @type {import('../../lib_templ/BaseElement.js').Ref<BsModal>} */
    #disconnectModal = createRef();
    renderDisconnectModal = () => html`
        
    `

 

    /** @type {import('../../lib_templ/BaseElement.js').Ref<BsModal>} */
    #startGameModal = createRef();
    #gameLoaded = false;
    renderGameScreen = () => html`
        <div ${ref(this.#wrapper)} class="w-100 h-100">
            
            <canvas ${ref(this.#canvas)} ></canvas>
            <bs-modal ${ref(this.#startGameModal)}
                centered
                .header=${html`
                    <span>Pong Match starts in: </span>
                    <timer-comp timeout="3" ></timer-comp>
                `}
                .content=${html`
                    <div class="d-flex align-items-center justify-content-around">
                        ${avatarInfo(this.#gameData?.player_two)}
                        <p class="m-0">VS</p>
                        ${avatarInfo(this.#gameData?.player_one)}
                    </div>
                `}
                .footer=${html`
                    <bs-button text="Start Game" ._async_handler=${(e)=> {
                        this.currentGame?.startGame();
                        this.#startGameModal.value?.hideModal();
                    }} ></bs-button>
                    `}
            >
            </bs-modal>
            <bs-modal ${ref(this.#disconnectModal)}
            centered
            .header=${html`
                <span>Connection Lost</span>
            `}
            .content=${html`
                <div class="d-flex flex-row align-items-center justify-content-center">
                    ${avatarInfo(this.#disconnectedUser.data)}
                    ${this.#disconnectedUser.self ? 'You' : ''}
                    <span>disconnected</span>
                </div>
                <div>
                    ${this.#disconnectedUser.self ? 'attempting to reconnect' : 'waiting for Opponent...'}
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `}
            >
            </bs-modal>
            
            ${ this.#gameReady ? '': html`
                    <div>
                        <div class="spinner-border text-secondary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        Connecting to the Server...
                    </div>
            `}
        </div>
    `;
// z-index:10000
// 
    render() {
        
        return html`
            <div class="p-3 bg-white position-fixed top-0 left-0 vh-100 vw-100" style="${"z-index:10000"}"  >
                <div class="d-flex flex-column">
                    <div class="d-flex flex-row">
                        <button @click=${() => {
                            this.currentGame?.quitGame();
                            router.redirect("/");
                        }} type="button" class="btn-close btn-lg"  aria-label="Close"></button>
                        <button type="button" class=" btn btn-outline-dark"
                            @click=${() => {
                                if (!this.#paused) this.currentGame?.pauseGame();
                                else this.currentGame?.continueGame();
                                super.requestUpdate();
                            }} >
                            <i class="fa-solid fa-${this.#paused ? 'play' : 'pause'}"></i>
                        </button>
                    </div>
                    <div class="">
                        ${this.renderGameScreen()}
                    </div>
                </div>

            </div>
        `;
    }

    // render() {
    //     return html`
    //         <div
    //             @hide.bs.modal=${() => { this.onModalHide(); }}
    //             @shown.bs.modal=${() => { this.onModalShown(); }}
    //             class="modal fade"
    //             id="${this.id}-id"
    //             tabindex="-1"
    //             aria-labelledby="gameModal-label"
    //             aria-hidden="true"
    //             data-bs-keyboard="false"
    //         >
    //             <div class="modal-dialog modal-fullscreen">
    //                 <div class="modal-content">
    //                     ${this.renderHeader(this.props.game_data)}
    //                     <div class="modal-body">
    //                         ${this.renderGameScreen()}
    //                     </div>
    //                     ${this.renderFooter()}
    //                 </div>
    //             </div>
    //         </div>
    //     `;
    // }
}
window.customElements.define('game-modaln', GameModal2);

// /**
//  *
//  * @param {HTMLElement} obsElem
//  * @param {number} aspectRatio
//  * @param {(newW: number, newH: number) => void} cb
//  * @returns {() => void}
//  */
// function useCanvasSizes(obsElem, aspectRatio, cb) {
//     if (!obsElem) throw new Error('undefined wrapper Element');
//     if (aspectRatio <= 0) throw new Error('invalid aspect Ratio');
//     if (!cb) throw new Error('undefined callback');
//     let newW;
//     let newH;
//     const myObserver = new ResizeObserver((entries) => {
//         console.log('obsElem boundingRect: ', obsElem.getBoundingClientRect());
//         console.log('contentRect: ', entries[0].contentRect);
//         newW = entries[0].contentRect.width;
//         newH = entries[0].contentRect.height;
//         const calcW = Math.trunc(newH / aspectRatio);
//         const calcH = Math.trunc(newW * aspectRatio);
//         if (calcH > newH) {
//             cb(calcW, newH);
//         } else {
//             cb(newW, calcH);
//         }
//     });
//     myObserver.observe(obsElem);
//     let disconnected = false;
//     return () => {
//         if (disconnected) return;
//         myObserver.disconnect();
//         disconnected = true;
//     };
// }

// const renderLoadingModal = () => html`
//     <div
//         class="modal fade"
//         id="loadingModal"
//         tabindex="-1"
//         aria-labelledby="loadingModalLabel"
//         aria-hidden="true"
//     >
//         <div class="modal-dialog modal-dialog-centered">
//             <div class="modal-content">
//                 <div class="modal-header">
//                     <h5 class="modal-title" id="loadingModalLabel">Verbindung wird hergestellt...</h5>
//                 </div>
//                 <div class="modal-body text-center">
//                     <div class="spinner-border text-primary" role="status">
//                         <span class="visually-hidden">Laden...</span>
//                     </div>
//                     <p class="mt-3">Bitte warten, während die Verbindung zum Server hergestellt wird.</p>
//                 </div>
//             </div>
//         </div>
//     </div>
// `;

// export default class GameModal2 extends BaseElement {
//     static observedAtrributes = ['id'];

//     constructor() {
//         super(false, false);

//         /** @type {APITypes.GameScheduleItem | undefined} */
//         this.props.game_data = undefined;
        
//         /** @type {GameHub | undefined} */
//         this.currentGame = undefined;
//     }

//     #aspectRatio = 0.5;

//     #closeObs;

//     /** @type {HTMLCanvasElement | undefined} */
//     #canvas;

//     /** @type {HTMLDivElement | undefined} */
//     #wrapper;

//     disconnectedCallback() {
//         super.disconnectedCallback();
//         if (this.#closeObs) this.#closeObs();
//         this.currentGame?.quitGame();
//     }

//     #modalIsOpen = false;

//     async onModalShown() {
//         console.log('on modal shown');

//         this.#modalIsOpen = true;
//         super.requestUpdate();

//         if (!this.#canvas || !this.#wrapper) return;
//         this.currentGame = await GameHub.startGame(this.#canvas, this.props.game_data, true);
//         this.#closeObs = useCanvasSizes(this.#wrapper, this.#aspectRatio, (newW, newH) => {
//             if (!this.#canvas || !this.#wrapper) return;
//             this.#canvas.style.width = `${newW}px`;
//             this.#canvas.style.height = `${newH}px`;
//             const canvasRect = this.#canvas.getBoundingClientRect();
//             this.currentGame?.resizeCanvas(canvasRect.x, canvasRect.y, newW, newH, window.devicePixelRatio);
//         });

//         this.currentGame?.setWorkerMessageHandler("from-worker-game-ready", (msg) => {
            
//         })
//         this.currentGame?.setWorkerMessageHandler("from-worker-client-connected", (msg) => {
            
//         })
//         this.currentGame?.setWorkerMessageHandler("from-worker-client-disconnected", (msg) => {
            
//         })
//         this.currentGame?.setWorkerMessageHandler("from-worker-game-paused", (msg) => {
            
//         })
//         this.currentGame?.setWorkerMessageHandler("from-worker-game-resumed", (msg) => {
            
//         })
//         this.currentGame?.setWorkerMessageHandler("from-worker-error", (msg) => {
            
//         })
//         this.currentGame?.setWorkerMessageHandler("from-worker-player-scored", (msg) => {
            
//         })

//         this.currentGame?.setWorkerMessageHandler("from-worker-game-done", (br) => {
            
//         })
//     }

//     onModalHide() {
//         this.#modalIsOpen = false;
//         super.requestUpdate();
//         this.#closeObs();
//         this.currentGame?.quitGame();
//         // this.currentGame?.terminateGame();
//     }

//     /**
//      * @param {APITypes.GameScheduleItem | undefined} gameData
//      * @returns {import('../../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
//      */
//     renderHeader = (gameData) => html`
//         <div class="modal-header">
//             <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
//         </div>
//     `;

//     renderFooter = () => html`
//         <div class="modal-footer">
//             <button type="button" class="btn btn-primary" @click=${() => { this.currentGame?.startGame(); }} >
//                 start game
//             </button>
//             <button type="button" class="btn btn-success" @click=${() => { this.currentGame?.quitGame(); }} >
//                 quit game
//             </button>
//             <button type="button" class="btn btn-warning" @click=${() => { this.currentGame?.pauseGame(); }} >
//                 pause game
//             </button>
//             <button type="button" class="btn btn-info" @click=${() => { this.currentGame?.continueGame(); }} >
//                 continue game
//             </button>
//             <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"
//                 @click=${() => { this.currentGame?.quitGame(); }}
//             >
//                 Close
//             </button>
//         </div>
//     `;

//     renderPlayerDisconnected = () => html`

    
//     `

    

//     renderOverlay = () => html`
    
//     `

//     #gameLoaded = false;
//     renderGameScreen = () => html`
//         <div ${ (elem) => { this.#wrapper = elem; } } class="w-100 h-100">
//             ${ this.#modalIsOpen
//                 ? html`
//                     <canvas ${ (elem) => { this.#canvas = elem; } }></canvas>
//                 `: html`
//                     <div>
//                         <div class="spinner-border text-secondary" role="status">
//                             <span class="visually-hidden">Loading...</span>
//                         </div>
//                         Connecting to the Server...
//                     </div>
//             `}
//         </div>
//     `;

//     render() {
//         return html`
//             <div
//                 @hide.bs.modal=${() => { this.onModalHide(); }}
//                 @shown.bs.modal=${() => { this.onModalShown(); }}
//                 class="modal fade"
//                 id="${this.id}-id"
//                 tabindex="-1"
//                 aria-labelledby="gameModal-label"
//                 aria-hidden="true"
//                 data-bs-keyboard="false"
//             >
//                 <div class="modal-dialog modal-fullscreen">
//                     <div class="modal-content">
//                         ${this.renderHeader(this.props.game_data)}
//                         <div class="modal-body">
//                             ${this.renderGameScreen()}
//                         </div>
//                         ${this.renderFooter()}
//                     </div>
//                 </div>
//             </div>
//         `;
//     }
// }
// window.customElements.define('game-modaln', GameModal2);
