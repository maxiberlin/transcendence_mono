/* eslint-disable no-useless-constructor */
// @ts-check
import DrawObj from './DrawObj.js';
import { pushMessageToMainThread } from './utils.js';

export default class PongPaddle extends DrawObj {
    /** @param {PongGameplayTypes.GameObjData} initialDataPaddle */
    constructor(initialDataPaddle) {
        super(initialDataPaddle);
        this.dy = 0;
    }

    #DIR_NONE = /** @type {const} */(0);
    #DIR_UP = /** @type {const} */(-1);
    #DIR_DOWN = /** @type {const} */(1);

    /**
     * @param {boolean} shouldUpdate
     * @param {ToWorkerGameMessageTypes.KeyEvent} d
     * @param {string} keyUp
     * @param {string} keyDown
     * @returns {PongClientTypes.ClientMoveDirection | null}
     */
    handleKey(shouldUpdate, d, keyUp, keyDown) {
        if (d.key === keyUp) {
            if (d.type === 'keydown') {
                if (shouldUpdate)
                    this.dy = this.#DIR_UP;
                return ("up");
            }
            else if (d.type === 'keyup') {
                if (shouldUpdate)
                    this.dy = this.dy === this.#DIR_UP ? this.#DIR_NONE : this.dy
                return ("release_up");
            }
        } else if (d.key === keyDown) {
            if (d.type === 'keydown') {
                if (shouldUpdate)
                    this.dy = this.#DIR_DOWN;
                return ("down");
            }
            else if (d.type === 'keyup') {
                if (shouldUpdate)
                    this.dy = this.dy === this.#DIR_DOWN ? this.#DIR_NONE : this.dy
                return ("release_down");
            }
        }
        return (null);
    }

    /** @param {number} nY @returns {number} */
    #getPaddlePosition(nY) {
        return Math.max(this.boundTop, Math.min(nY, this.boundBottom - this.h));
    }

    /** @param {number} elapsed */
    update(elapsed) {
        const nY = this.y + this.speedY * elapsed * this.dy;
        if (nY === 0) throw new Error('nY === 0');

        if (this.dy !== this.#DIR_NONE || elapsed === 0) {
            this.y = this.#getPaddlePosition(nY);
        }
    }

    /** @type {number | null} */
    #ident = null;
    /** @type {ToWorkerGameMessageTypes.GameTouchRect | null} */
    #lastTouch = null;
    /** @param {ToWorkerGameMessageTypes.GameTouchRect} touchRect  */
    #checkOverlap = (touchRect) => this.left < touchRect.right && this.right > touchRect.left
                                && this.top < touchRect.bottom && this.bottom > touchRect.top;

    /**
     * @param {boolean} shouldUpdate
     * @param {ToWorkerGameMessageTypes.GameTouchEvent} d
     * @returns {number | boolean | null}
     */
    handleMouseTouch(shouldUpdate, d) {
        if (d.type === "start" && d.touchRect !== undefined) {
            if (this.#checkOverlap(d.touchRect)) {
                console.log('VALID TOUCH START');
                this.#ident = d.touchRect.ident;
                this.#lastTouch = d.touchRect;
                return (true);
            } else {
                console.log('INVALID TOUCH START');
                return (false);
            }
        } else if (d.type === "move" && d.touchRect !== undefined) {
            console.log('handle touch move!');
            if (d.touchRect && this.#lastTouch && d.touchRect.ident === this.#ident) {
                const pos = this.#getPaddlePosition(this.y + (d.touchRect.y - this.#lastTouch.y));
                this.#lastTouch = d.touchRect;
                console.log('VALID MOVE!');
                if (shouldUpdate) {
                    console.log('Update now');
                    this.dy = this.#DIR_NONE;
                    this.y = pos;
                }
                return (pos);
            }
        } else if (d.type === "end" && d.ident !== undefined) {
            if (d.ident === this.#ident) {
                this.#ident = null;
                this.#lastTouch = null;
            }
        }
        return (null);
    }
}
