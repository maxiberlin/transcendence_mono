/* eslint-disable no-useless-constructor */
import DrawObj from './DrawObj.js';

/// <reference path="../../types.d.ts"/>

/**
 * @param {number} min
 * @param {number} curr
 * @param {number} max
 * @returns {number}
 */
function clamp(min, curr, max) {
    return Math.max(min, Math.min(curr, max));
}

export default class PongPaddle extends DrawObj {
    static PADDLE_POS_LEFT = 0;

    static PADDLE_POS_RIGHT = 1;

    /**
     * @param {OffscreenCanvasRenderingContext2D} ctx
     * @param {PongGameplayTypes.GameObjData} initialDataPaddle
     */
    constructor(ctx, initialDataPaddle) {
        super(ctx, initialDataPaddle);
        this.dy = 0;
    }

    moveUp(stop) {
        if (!stop) {
            this.dy = -1;
        } else if (this.dy === -1) {
            this.dy = 0;
        }
    }

    moveDown(stop) {
        if (!stop) {
            this.dy = 1;
        } else if (this.dy === 1) {
            this.dy = 0;
        }
    }

    /**
     *
     * @param {PongClientTypes.ClientMoveDirection} action
     */
    setDir(action) {
        console.log(`move paddle. pos: x:${this.x*this.canvasWidth} y: ${this.y*this.canvasHeight}`);
        switch (action) {
            case 'up':
                this.dy = -1;
                break;
            case 'down':
                this.dy = 1;
                break;
            case 'release_up':
                this.dy = this.dy === -1 ? 0 : this.dy;
                break;
            case 'release_down':
                this.dy = this.dy === 1 ? 0 : this.dy;
                break;
            default:
                throw new TypeError(`invalid action ${action}`);
        }
    }

    /**
     * @param {number} nY 
     */
    setPaddlePosition(nY) {
        this.y = clamp(this.boundTop, nY, this.boundBottom - this.h);
    }

    update(elapsed) {
        // if (this.x < 0.5) {
        //     console.log(`paddle left: top: ${this.top}`);
        //     console.log(`paddle left: bottom: ${this.bottom}`);
        // }
        const nY = this.y + this.speedY * elapsed * this.dy;
        if (nY === 0) throw new Error('nY === 0');

        if (this.dy !== 0 || elapsed === 0) {
            this.setPaddlePosition(nY);
        }
    }
}
