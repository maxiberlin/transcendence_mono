/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable no-useless-constructor */
import DrawObj from './DrawObj.js';
import PongPaddle from './Paddle.js';

function calcRandAngleSinCos() {
    const upperBound = (225 * Math.PI) / 180;
    const lowerBound = (135 * Math.PI) / 180;
    const angle = Math.random() * (upperBound - lowerBound) + lowerBound;
    return {
        sin: Math.sin(angle),
        cos: Math.cos(angle),
    };
}

export default class PongBall extends DrawObj {
    static Scored = {
        SCORE_NONE: 0,
        SCORE_LEFT: 1,
        SCORE_RIGHT: 2,
    }

    /**
     * @param {OffscreenCanvasRenderingContext2D} ctx
     * @param {PongGameplayTypes.GameObjData} initDataBall
     * @param {boolean} remote
     */
    constructor(ctx, initDataBall, remote) {
        super(ctx, initDataBall);
        if (!remote) {
            const { sin, cos } = calcRandAngleSinCos();
            this.dx = cos;
            this.dy = sin;
        }
    }

    #calcX(elapsedSec) {
        this.x = this.x + elapsedSec * this.speedX * this.dx;
    }
    #calcY(elapsedSec) {
        this.y = this.y + elapsedSec * this.speedY * this.dy;
    }
    #recalcDirX(elapsedSec, timeWhileCollision) {
        this.#calcX(elapsedSec - timeWhileCollision)
        this.dx = this.dx*-1
        this.#calcX(timeWhileCollision)
    }
    #recalcDirY(elapsedSec, timeWhileCollision) {
        this.#calcY(elapsedSec - timeWhileCollision)
        this.dy = this.dy*-1
        this.#calcY(timeWhileCollision)
    }
    /**
     *
     * @param {PongPaddle} paddleLeft
     * @param {PongPaddle} paddleRight
     * @returns {number}
     */
    updateBall(elapsed, paddleLeft, paddleRight) {
        this.#calcX(elapsed)
        this.#calcY(elapsed)

        const diffY = this.dy > 0 ? this.bottom - this.boundBottom : this.dy < 0 ? this.boundTop - this.top : 0;
        if (diffY > 0) {
            this.#recalcDirY(elapsed, diffY / Math.abs(this.dy * this.speedY))
        }
        if (this.left >= paddleLeft.right && this.right <= paddleRight.left)
            return PongBall.Scored.SCORE_NONE;

        if (this.right <= this.boundLeft)
            return PongBall.Scored.SCORE_LEFT;
        if (this.left >= this.boundRight)
            return PongBall.Scored.SCORE_RIGHT;

        const paddle = this.left < paddleLeft.right ? paddleLeft : paddleRight;
        const [collision, diffTime] = this.coll_ision(paddle);

        if (collision === DrawObj.COLL_RIGHT || collision === DrawObj.COLL_LEFT) {
            this.#recalcDirX(elapsed, diffTime)
        } else if (collision === DrawObj.COLL_BOTTOM || collision === DrawObj.COLL_TOP) {
            this.#recalcDirY(elapsed, diffTime)
        }
        return PongBall.Scored.SCORE_NONE;
       
    }

}

// function calcRandAngleSinCos() {
//     const upperBound = (225 * Math.PI) / 180;
//     const lowerBound = (135 * Math.PI) / 180;
//     const angle = Math.random() * (upperBound - lowerBound) + lowerBound;
//     return {
//         sin: Math.sin(angle),
//         cos: Math.cos(angle),
//     };
// }

// export default class PongBall extends DrawObj {
//     static COLLISION_WALL_LEFT = 1;

//     static COLLISION_WALL_RIGHT = 2;

//     /**
//      * @param {OffscreenCanvasRenderingContext2D} ctx
//      * @param {PongGameplayTypes.GameObjData} initDataBall
//      */
//     constructor(ctx, initDataBall) {
//         super(ctx, initDataBall);
//         const { sin, cos } = calcRandAngleSinCos();
//         this.dx = cos;
//         this.dy = sin;
//     }

//     update(elapsed) {
//         // console.log(`ball: top: ${this.top}`);
//         // console.log(`ball: bottom: ${this.bottom}`);
//         this.x += elapsed * this.speedX * this.dx;
//         this.y += elapsed * this.speedY * this.dy;

//         if (this.dx > 0 && this.right > this.boundRight) {
//             this.x = this.boundLeft;
//             this.dx = -this.dx;
//         } else if (this.dx < 0 && this.left < this.boundLeft) {
//             this.x = this.boundLeft;
//             this.dx = -this.dx;
//         }
//         if (this.dy > 0 && this.bottom > this.boundBottom) {
//             this.y = this.boundBottom - this.h;
//             this.dy = -this.dy;
//         } else if (this.dy < 0 && this.top < this.boundTop) {
//             this.y = this.boundTop;
//             this.dy = -this.dy;
//         }
//     }

//     /**
//      *
//      * @param {PongPaddle} paddleLeft
//      * @param {PongPaddle} paddleRight
//      * @returns {number | undefined}
//      */
//     checkCollision(paddleLeft, paddleRight) {
//         // console.log('ball width: ', this.w);
//         // console.log('ball height: ', this.h);
//         if (this.left >= paddleLeft.right && this.right <= paddleRight.left)
//             return undefined;

//         if (this.left <= this.boundLeft) return PongBall.COLLISION_WALL_LEFT;

//         if (this.right >= this.boundRight) return PongBall.COLLISION_WALL_RIGHT;

//         const paddle = this.left < paddleLeft.right ? paddleLeft : paddleRight;
//         // const collision = this.collision(paddle);
//         const collision = this.coll_ision(paddle);

//         if (collision === DrawObj.COLL_NONE) return undefined;

//         if (collision === DrawObj.COLL_RIGHT || collision === DrawObj.COLL_LEFT) {
//             this.dx = -this.dx;
//         } else {
//             this.dy = -this.dy;
//         }
//         if (collision === DrawObj.COLL_LEFT)
//             this.x = paddle.right;
//         if (collision === DrawObj.COLL_RIGHT)
//             this.x = paddle.left - this.w;
//         if (collision === DrawObj.COLL_TOP)
//             this.y = paddle.bottom;
//         if (collision === DrawObj.COLL_BOTTOM)
//             this.y = paddle.top - this.h;
//         return undefined;
//     }

// }


    // /** @param {PongPaddle} paddle  */
    // increaseSpeed(paddle) {
    //     // if (paddle.dir === -1) {
    //     //     // const old = this.dy;
    //     //     this.speedY *= this.speedY < 0 ? 0.5 : 1.5;
    //     // } else if (paddle.dir === 1) {
    //     //     // const old = this.dy;
    //     //     this.speedY *= this.speedY < 0 ? 1.5 : 0.5;
    //     // }
    //     // if (paddle.dir === PongPaddle.MOVE_UP) {
    //     //     let old = this.dy;
    //     //     this.dy = this.dy * (this.dy < 0 ? 0.5 : 1.5);
    //     // } else if (paddle.dir === PongPaddle.MOVE_DOWN) {
    //     //     let old = this.dy;
    //     //     this.dy = this.dy * (this.dy < 0 ? 1.5 : 0.5);
    //     // }
    // }