import DrawObj from './DrawObj.js';

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
     *
     * @param {number} paddleWidth
     * @param {number} paddleHeight
     * @param {number} wallDist
     * @param {number} paddlePos
     * @param {number} paddleSpeed
     * @param {DrawObj} parent
     */
    constructor(
        paddleWidth,
        paddleHeight,
        wallDist,
        paddlePos,
        paddleSpeed,
        parent,
    ) {
        if (
            !(
                paddlePos === PongPaddle.PADDLE_POS_LEFT ||
                paddlePos === PongPaddle.PADDLE_POS_RIGHT
            )
        )
            throw new Error('invalid paddle Position');
        const x =
            paddlePos === PongPaddle.PADDLE_POS_LEFT ?
                wallDist
            :   1.0 - (paddleWidth + wallDist);
        super(x, 0.5 - paddleHeight / 2.0, paddleWidth, paddleHeight, parent);
        this.speedfact = 1;
        this.dir = 0;
        this.dyUnscaled = paddleSpeed;
        this.dy = 0;
        this.parent = parent;
    }

    moveUp(stop) {
        // console.log('stop?: ', !stop);
        if (!stop) {
            this.dir = -1;
        } else if (this.dir === -1) {
            this.dir = 0;
        }
    }

    moveDown(stop) {
        // console.log('stop?: ', !stop);
        if (!stop) {
            this.dir = 1;
        } else if (this.dir === 1) {
            this.dir = 0;
        }
    }

    setScale(newWidth, newHeight) {
        super.setScale(newWidth, newHeight);
        this.dy = this.dyUnscaled * newHeight;
    }

    update(elapsed) {
        const nY = this.y_start + this.dy * elapsed * this.dir;

        if (this.dir !== 0 || elapsed === 0) {
            this.y_start = Math.floor(
                clamp(this.parent.y_start, nY, this.parent.y_end - this.h),
            );
        }
    }
}
