/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-console */
import { BaseElement, html } from '../../lib_templ/BaseElement.js';
import GameHub from '../../gaming/manager/gameHub.js';
import { renderAvatar } from '../../components/bootstrap/AvatarComponent.js';

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

        /** @type {APITypes.GameScheduleItem | undefined} */
        this.props.game_data = undefined;
        
        /** @type {GameHub | undefined} */
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
        if (this.#closeObs) this.#closeObs();
        this.currentGame?.quitGame();
    }

    #modalIsOpen = false;

    async onModalShown() {
        console.log('on modal shown');

        this.#modalIsOpen = true;
        super.requestUpdate();

        if (!this.#canvas || !this.#wrapper) return;
        this.currentGame = await GameHub.startGame(this.#canvas, this.props.game_data, true);
        this.#closeObs = useCanvasSizes(this.#wrapper, this.#aspectRatio, (newW, newH) => {
            if (!this.#canvas || !this.#wrapper) return;
            this.#canvas.style.width = `${newW}px`;
            this.#canvas.style.height = `${newH}px`;
            const canvasRect = this.#canvas.getBoundingClientRect();
            this.currentGame?.resizeCanvas(canvasRect.x, canvasRect.y, newW, newH, window.devicePixelRatio);
        });
    }

    onModalHide() {
        this.#modalIsOpen = false;
        super.requestUpdate();
        this.#closeObs();
        this.currentGame?.quitGame();
        // this.currentGame?.terminateGame();
    }

    /**
     * @param {APITypes.GameScheduleItem | undefined} gameData
     * @returns {import('../../lib_templ/templ/TemplateAsLiteral.js').TemplateAsLiteral}
     */
    renderHeader = (gameData) => html`
        <div class="modal-header">
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
    `;

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

    #gameLoaded = false;

    renderGameScreen = () => html`
        <div ${ (elem) => { this.#wrapper = elem; } } class="w-100 h-100">
            ${ this.#modalIsOpen
                ? html`
                    <canvas ${ (elem) => { this.#canvas = elem; } }></canvas>
                `: html`
                    <div>
                        <div class="spinner-border text-secondary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        Connecting to the Server...
                    </div>
            `}
        </div>
    `;

    render() {
        return html`
            <div
                @hide.bs.modal=${() => { this.onModalHide(); }}
                @shown.bs.modal=${() => { this.onModalShown(); }}
                class="modal fade"
                id="${this.id}-id"
                tabindex="-1"
                aria-labelledby="gameModal-label"
                aria-hidden="true"
                data-bs-keyboard="false"
            >
                <div class="modal-dialog modal-fullscreen">
                    <div class="modal-content">
                        ${this.renderHeader(this.props.game_data)}
                        <div class="modal-body">
                            ${this.renderGameScreen()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
window.customElements.define('game-modaln', GameModal2);
