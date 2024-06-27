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
    static COLLISION_WALL_LEFT = 1;

    static COLLISION_WALL_RIGHT = 2;

    /**
     * @param {OffscreenCanvasRenderingContext2D} ctx
     * @param {PongGameplayTypes.GameObjData} initDataBall
     */
    constructor(ctx, initDataBall) {
        super(ctx, initDataBall);
        const { sin, cos } = calcRandAngleSinCos();
        this.dx = cos;
        this.dy = sin;
    }

    update(elapsed) {
        this.x += elapsed * this.speedX * this.dx;
        this.y += elapsed * this.speedY * this.dy;

        if (this.dx > 0 && this.right > this.boundRight) {
            this.x = this.boundLeft;
            this.dx = -this.dx;
        } else if (this.dx < 0 && this.left < this.boundLeft) {
            this.x = this.boundLeft;
            this.dx = -this.dx;
        }
        if (this.dy > 0 && this.bottom > this.boundBottom) {
            this.y = this.boundBottom - this.h;
            this.dy = -this.dy;
        } else if (this.dy < 0 && this.top < this.boundTop) {
            this.y = this.boundTop;
            this.dy = -this.dy;
        }
    }

    /**
     *
     * @param {PongPaddle} paddleLeft
     * @param {PongPaddle} paddleRight
     * @returns {number | undefined}
     */
    checkCollision(paddleLeft, paddleRight) {
        // console.log('ball width: ', this.w);
        // console.log('ball height: ', this.h);
        if (this.left >= paddleLeft.right && this.right <= paddleRight.left)
            return undefined;

        if (this.left <= this.boundLeft) return PongBall.COLLISION_WALL_LEFT;

        if (this.right >= this.boundRight) return PongBall.COLLISION_WALL_RIGHT;

        const paddle = this.left < paddleLeft.right ? paddleLeft : paddleRight;
        // const collision = this.collision(paddle);
        const collision = this.coll_ision(paddle);

        if (collision === DrawObj.COLL_NONE) return undefined;

        if (collision === DrawObj.COLL_RIGHT || collision === DrawObj.COLL_LEFT) {
            // console.log('collision -> change dx');
            this.dx = -this.dx;
        } else {
            this.dy = -this.dy;
        }
        if (collision === DrawObj.COLL_LEFT)
            // left
            this.x = paddle.right;
        if (collision === DrawObj.COLL_RIGHT)
            // right
            this.x = paddle.left - this.w;
        if (collision === DrawObj.COLL_TOP)
            // top
            this.y = paddle.top - this.h;
        if (collision === DrawObj.COLL_BOTTOM)
            // bottom
            this.y = paddle.bottom;
        // this.increaseSpeed(paddle);
        return undefined;
    }

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
}

// export class PongBall extends DrawObj {

//     static COLLISION_WALL_LEFT = 1;
//     static COLLISION_WALL_RIGHT = 2;

//     /**
//      *
//      * @param {number} x
//      * @param {number} y
//      * @param {number} w
//      * @param {number} h
//      * @param {DrawObj} parent
//      */
//     constructor(x, y, w, h, initialScale_x, initialScale_y, parent) {

//         super(x, y, w, h, initialScale_x, initialScale_y, parent);
//         this.parent = parent;
//         const upperBound = (225 * Math.PI) / 180;
//         const lowerBound = (135 * Math.PI) / 180;
//         const angle = Math.random() * (upperBound - lowerBound) + lowerBound;
//         // this.dx = 1;
//         // this.dy = 0;
//         this.dx = Math.cos(angle);
//         this.dy = Math.sin(angle);
//         this.ballSpeed = s.ball_speed;
//         this.ballSpeedUnscaled = this.ballSpeed / initialScale_x;
//     }
//     setScale(newWidth, newHeight) {
//         super.setScale(newWidth, newHeight);
//         this.ballSpeed = this.ballSpeedUnscaled * newWidth;
//     }
//     update(elapsed) {

//         console.log("update ball, elapsed: ", elapsed);

//         this.x_start  = this.x_start + (elapsed * this.dx * s.ball_speed);
//         this.y_start  = this.y_start + (elapsed * this.dy * s.ball_speed);

//         if ((this.dx > 0) && (this.x_end > this.parent.x_end)) {
//             this.x_start = this.parent?.x_end - this.w;
//             this.dx = -this.dx;
//         }
//         else if ((this.dx < 0) && (this.x_start < this.parent.x_start)) {
//             this.x_start = this.parent?.x_start;
//             this.dx = -this.dx;
//         }
//         if ((this.dy > 0) && (this.y_start > this.parent.y_end - this.h)) {
//             this.y_start = this.parent?.y_end - this.h;
//             this.dy = -this.dy;
//           }
//           else if ((this.dy < 0) && (this.y_start < this.parent?.y_start)) {
//             this.y_start = this.parent?.y_start;
//             this.dy = -this.dy;
//         }
//     }

//     /**
//      *
//      * @param {PongPaddle} paddleL
//      * @param {PongPaddle} paddleR
//      * @returns {number | undefined}
//      */
//     checkCollision(paddleL, paddleR) {
//         if (this.x_start >= paddleL.x_end && this.x_end <= paddleR.x_start)
//             return ;

//         if (this.offsetLeft <= 0)
//             return (PongBall.COLLISION_WALL_LEFT);

//         if (this.offsetRight <= 0)
//             return (PongBall.COLLISION_WALL_RIGHT);

//         let paddle = this.x_start < paddleL.x_end ? paddleL : paddleR;
//         const collision = this.collision(paddle);

//         if (collision === PongBall.COLLISION_NONE)
//             return ;

//         if (collision === PongBall.COLLISION_RIGHT || collision === PongBall.COLLISION_LEFT) {
//             console.log("collision -> change dx");
//             this.dx = -this.dx;
//         } else {
//             this.dy = -this.dy;
//         }
//         if (collision === PongBall.COLLISION_LEFT) // left
//             this.x_start = paddle.x_end;
//         if (collision === PongBall.COLLISION_RIGHT) // right
//             this.x_start = paddle.x_start - this.w;
//         if (collision === PongBall.COLLISION_TOP) // top
//             this.y_start = paddle.y_start - this.h;
//         if (collision === PongBall.COLLISION_BOTTOM) // bottom
//             this.y_start = paddle.y_end;
//         this.increaseSpeed(paddle);
//     }

//     /** @param {PongPaddle} paddle  */
//     increaseSpeed(paddle) {
//         if (paddle.dir === -1) {
//             let old = this.dy;
//             this.dy = this.dy * (this.dy < 0 ? 0.5 : 1.5);
//         } else if (paddle.dir === 1) {
//             let old = this.dy;
//             this.dy = this.dy * (this.dy < 0 ? 1.5 : 0.5);
//         }
//         // if (paddle.dir === PongPaddle.MOVE_UP) {
//         //     let old = this.dy;
//         //     this.dy = this.dy * (this.dy < 0 ? 0.5 : 1.5);
//         // } else if (paddle.dir === PongPaddle.MOVE_DOWN) {
//         //     let old = this.dy;
//         //     this.dy = this.dy * (this.dy < 0 ? 1.5 : 0.5);
//         // }
//     }
// }
