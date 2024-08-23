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
        /** @type {"none"} */
        SCORE_NONE: "none",
        /** @type {PongGameplayTypes.PongGameSides} */
        SCORE_LEFT: "left",
        /** @type {PongGameplayTypes.PongGameSides} */
        SCORE_RIGHT: "right",
    }

    /**
     * @param {PongGameplayTypes.GameObjData} initDataBall
     * @param {boolean} setBallAngle
     */
    constructor(initDataBall, setBallAngle) {
        super(initDataBall);
        if (setBallAngle) {
            // console.log('ball set Ball angles');
            // console.log(this);
            const { sin, cos } = calcRandAngleSinCos();
            this.dx = cos;
            this.dy = sin;
            // console.log('init data: ', initDataBall);
        }
    }

    // /** @param {number} currX @param {number} elapsedSec @returns {number} */
    // #getCalcX(currX, elapsedSec) {
    //     return currX + elapsedSec * this.speedX * this.dx;
    // }
    // /** @param {number} currY @param {number} elapsedSec @returns {number} */
    // #getCalcY(currY, elapsedSec) {
    //     return currY + elapsedSec * this.speedY * this.dy;
    // }
    // /** @param {number} currX @param {number} elapsedSec @param {number} timeWhileCollision @returns {[number, number]}  */
    // #getRecalcDirX(currX, elapsedSec, timeWhileCollision) {
    //     const x = this.#getCalcX(currX, elapsedSec - timeWhileCollision)
    //     const dx = this.dx*-1;
    //     return [dx, this.#getCalcX(x, timeWhileCollision)];
    // }
    // /** @param {number} currY @param {number} elapsedSec @param {number} timeWhileCollision @returns {[number, number]} */
    // #getRecalcDirY(currY, elapsedSec, timeWhileCollision) {
    //     const y = this.#getCalcY(currY, elapsedSec - timeWhileCollision)
    //     const dy = this.dy*-1;
    //     return [dy, this.#getCalcY(y, timeWhileCollision)];
    // }
    // /**
    //  *
    //  * @param {boolean} shouldUpdate
    //  * @param {number} elapsed
    //  * @param {PongPaddle} paddleLeft
    //  * @param {PongPaddle} paddleRight
    //  * @returns {PongGameplayTypes.PongGameSides | "none"}
    //  */
    // updateBall(shouldUpdate, elapsed, paddleLeft, paddleRight) {
    //     if (!paddleLeft || !paddleRight) {
    //         throw new Error('NO PADDLE DEFINED WHEN UPDATING THE BALL');
    //     }

    //     /** @type {number} */
    //     let newY = this.y, newX = this.x, newDY = this.dy, newDX = this.dx;
    //     newX = this.#getCalcX(newX, elapsed);
    //     newY = this.#getCalcY(newY, elapsed);

    //     let scored;

    //     const diffY = newY > 0 ? this.bottom - this.boundBottom : newY < 0 ? this.boundTop - this.top : 0;
    //     if (diffY > 0) {
    //         [newDY, newY] = this.#getRecalcDirY(newY, elapsed, diffY / Math.abs(newY * this.speedY));
    //     }

    //     if (this.right <= this.boundLeft) {
    //         scored = PongBall.Scored.SCORE_LEFT;
    //     } else  if (this.left >= this.boundRight) {
    //         scored = PongBall.Scored.SCORE_RIGHT;
    //     } else if (this.left >= paddleLeft.right && this.right <= paddleRight.left) {
    //         scored = PongBall.Scored.SCORE_NONE;
    //     } else {
    //         scored = PongBall.Scored.SCORE_NONE;
    //         const paddle = this.left < paddleLeft.right ? paddleLeft : paddleRight;
    //         const [collision, diffTime] = this.coll_ision(paddle);
    
    //         if (collision === DrawObj.COLL_RIGHT || collision === DrawObj.COLL_LEFT) {
    //             [newDX, newX] = this.#getRecalcDirX(newX, elapsed, diffTime)
    //         } else if (collision === DrawObj.COLL_BOTTOM || collision === DrawObj.COLL_TOP) {
    //             [newDY, newY] = this.#getRecalcDirY(newY, elapsed, diffTime)
    //         }
    //     }

    //     if (shouldUpdate) {
    //         this.x = newX;
    //         this.y = newY;
    //         this.dx = newDX;
    //         this.dy = newDY;
    //     }
    //     return scored;
    // }


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
     * @param {number} elapsed
     * @param {PongPaddle} paddleLeft
     * @param {PongPaddle} paddleRight
     * @returns {PongGameplayTypes.PongGameSides | "none"}
     */
    #internalUpdateBall(elapsed, paddleLeft, paddleRight) {
        if (!paddleLeft || !paddleRight) {
            throw new Error('NO PADDLE DEFINED WHEN UPDATING THE BALL');
        }
        // console.log('update ball: tickduration: ', elapsed);
        // console.log('update ball: old x: ', this.x);
        // console.log('update ball: old y: ', this.y);
        this.#calcX(elapsed)
        this.#calcY(elapsed)
        // console.log('update ball: new x: ', this.x);
        // console.log('update ball: new y: ', this.y);

        

        const diffY = this.dy > 0 ? this.bottom - this.boundBottom : this.dy < 0 ? this.boundTop - this.top : 0;
        if (diffY > 0) {
            this.#recalcDirY(elapsed, diffY / Math.abs(this.dy * this.speedY))
        }

        let scored;
        if (this.right <= this.boundLeft) {
            scored = PongBall.Scored.SCORE_LEFT;
        } else if (this.left >= this.boundRight) {
            scored = PongBall.Scored.SCORE_RIGHT;
        } else if (this.left >= paddleLeft.right && this.right <= paddleRight.left) {
            scored = PongBall.Scored.SCORE_NONE;
        } else {
            scored = PongBall.Scored.SCORE_NONE;
            const paddle = this.left < paddleLeft.right ? paddleLeft : paddleRight;
            const [collision, diffTime] = this.coll_ision(paddle);
    
            if (collision === DrawObj.COLL_RIGHT || collision === DrawObj.COLL_LEFT) {
                this.#recalcDirX(elapsed, diffTime)
            } else if (collision === DrawObj.COLL_BOTTOM || collision === DrawObj.COLL_TOP) {
                this.#recalcDirY(elapsed, diffTime)
            }
        }
        return scored;
    }

    /**
     * @param {number} elapsed
     * @param {PongPaddle} paddleLeft
     * @param {PongPaddle} paddleRight
     * @returns {PongGameplayTypes.PongGameSides | "none"}
     */
    updateBall(elapsed, paddleLeft, paddleRight) {
        return this.#internalUpdateBall(elapsed, paddleLeft, paddleRight);
    }

    /**
     * @param {PongServerTypes.GameObjPosBinary} last
     * @param {number} elapsed
     * @param {PongPaddle} paddleLeft
     * @param {PongPaddle} paddleRight
     * @returns {PongServerTypes.GameObjPosBinary}
     */
    getPredictedXY(last, elapsed, paddleLeft, paddleRight) {
        // console.log('PongBall: getPredictedXY: myCurrent x: ', this.x);
        // console.log('PongBall: getPredictedXY: myCurrent y: ', this.y);
        // console.log('PongBall: getPredictedXY: last x: ', last.x);
        // console.log('PongBall: getPredictedXY: last y: ', last.y);
        const currX = this.x;
        const currY = this.y;
        const currDX = this.dx;
        const currDY = this.dy;
        this.x = last.x;
        this.y = last.y;
        this.dy = last.dy;
        this.dx = last.dx;
        // console.log('PongBall: getPredictedXY: myNew x: ', this.x);
        // console.log('PongBall: getPredictedXY: myNew y: ', this.y);
        
        this.#internalUpdateBall(elapsed, paddleLeft, paddleRight);
        /** @type {PongServerTypes.GameObjPosBinary} */
        const res = {x: this.x, y: this.y, dx: this.dx, dy: this.dy};
        
        // console.log('PongBall: getPredictedXY: new calc x: ', this.x);
        // console.log('PongBall: getPredictedXY: new calc y: ', this.y);

        this.x = currX;
        this.y = currY;
        this.dx = currDX;
        this.dy = currDY;
        return res;
    }


    // #calcX(elapsedSec) {
    //     this.x = this.x + elapsedSec * this.speedX * this.dx;
    // }
    // #calcY(elapsedSec) {
    //     this.y = this.y + elapsedSec * this.speedY * this.dy;
    // }
    // #recalcDirX(elapsedSec, timeWhileCollision) {
    //     this.#calcX(elapsedSec - timeWhileCollision)
    //     this.dx = this.dx*-1
    //     this.#calcX(timeWhileCollision)
    // }
    // #recalcDirY(elapsedSec, timeWhileCollision) {
    //     this.#calcY(elapsedSec - timeWhileCollision)
    //     this.dy = this.dy*-1
    //     this.#calcY(timeWhileCollision)
    // }

    // /**
    //  *
    //  * @param {PongPaddle} [paddleLeft]
    //  * @param {PongPaddle} [paddleRight]
    //  * @returns {PongGameplayTypes.PongGameSides | "none"}
    //  */
    // updateBall(elapsed, paddleLeft, paddleRight) {
    //     this.#calcX(elapsed)
    //     this.#calcY(elapsed)

    //     const diffY = this.dy > 0 ? this.bottom - this.boundBottom : this.dy < 0 ? this.boundTop - this.top : 0;
    //     if (diffY > 0)
    //         this.#recalcDirY(elapsed, diffY / Math.abs(this.dy * this.speedY))

    //     if (this.right <= this.boundLeft)
    //         return PongBall.Scored.SCORE_LEFT;
    //     if (this.left >= this.boundRight)
    //         return PongBall.Scored.SCORE_RIGHT;

    //     if (!paddleLeft || !paddleRight) {
    //         // console.log('NO PADDLE!!');
    //         return PongBall.Scored.SCORE_NONE;
    //     }
    //     if (this.left >= paddleLeft.right && this.right <= paddleRight.left)
    //         return PongBall.Scored.SCORE_NONE;
    //     const paddle = this.left < paddleLeft.right ? paddleLeft : paddleRight;
    //     const [collision, diffTime] = this.coll_ision(paddle);

    //     if (collision === DrawObj.COLL_RIGHT || collision === DrawObj.COLL_LEFT) {
    //         this.#recalcDirX(elapsed, diffTime)
    //     } else if (collision === DrawObj.COLL_BOTTOM || collision === DrawObj.COLL_TOP) {
    //         this.#recalcDirY(elapsed, diffTime)
    //     }
    //     return PongBall.Scored.SCORE_NONE;
       
    // }


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
// //         // console.log(`ball: top: ${this.top}`);
// //         // console.log(`ball: bottom: ${this.bottom}`);
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
// //         // console.log('ball width: ', this.w);
// //         // console.log('ball height: ', this.h);
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