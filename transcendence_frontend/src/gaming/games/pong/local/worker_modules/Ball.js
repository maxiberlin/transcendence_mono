import DrawObj from './DrawObj.js';
import PongPaddle from './Paddle.js';

export default class PongBall extends DrawObj {
    static COLLISION_WALL_LEFT = 1;

    static COLLISION_WALL_RIGHT = 2;

    /**
     *
     * @param {number} ballSize
     * @param {number} ballSpeed
     * @param {DrawObj} parent
     */
    constructor(ballSize, ballSpeed, parent) {
        super(
            0.5 - ballSize / 2.0,
            0.5 - ballSize / 2.0,
            ballSize,
            ballSize * 2.0,
            parent,
        );
        this.parent = parent;
        const upperBound = (225 * Math.PI) / 180;
        const lowerBound = (135 * Math.PI) / 180;
        const angle = Math.random() * (upperBound - lowerBound) + lowerBound;
        // this.dx = 1;
        // this.dy = 0;
        this.dx = Math.cos(angle);
        this.dy = Math.sin(angle);
        this.ballSpeedUnscaled = ballSpeed;
        this.ballSpeed = 0;
    }

    setScale(newWidth, newHeight) {
        // console.log('ball: aspect ratio: ', newWidth / newHeight);
        super.setScale(newWidth, newHeight);
        this.ballSpeed = this.ballSpeedUnscaled * newWidth;
    }

    update(elapsed) {
        // console.log('update ball, elapsed: ', elapsed);

        const speed = 1200;
        this.x_start += elapsed * this.dx * speed;
        this.y_start += elapsed * this.dy * speed;

        if (this.parent && this.dx > 0 && this.x_end > this.parent.x_end) {
            this.x_start = this.parent.x_end - this.w;
            this.dx = -this.dx;
        } else if (
            this.parent &&
            this.dx < 0 &&
            this.x_start < this.parent.x_start
        ) {
            this.x_start = this.parent.x_start;
            this.dx = -this.dx;
        }
        if (
            this.parent &&
            this.dy > 0 &&
            this.y_start > this.parent.y_end - this.h
        ) {
            this.y_start = this.parent.y_end - this.h;
            this.dy = -this.dy;
        } else if (
            this.parent &&
            this.dy < 0 &&
            this.y_start < this.parent?.y_start
        ) {
            this.y_start = this.parent.y_start;
            this.dy = -this.dy;
        }
    }

    /**
     *
     * @param {PongPaddle} paddleL
     * @param {PongPaddle} paddleR
     * @returns {number | undefined}
     */
    checkCollision(paddleL, paddleR) {
        // console.log('ball width: ', this.w);
        // console.log('ball height: ', this.h);
        if (this.x_start >= paddleL.x_end && this.x_end <= paddleR.x_start)
            return undefined;

        if (this.offsetLeft <= 0) return PongBall.COLLISION_WALL_LEFT;

        if (this.offsetRight <= 0) return PongBall.COLLISION_WALL_RIGHT;

        const paddle = this.x_start < paddleL.x_end ? paddleL : paddleR;
        const collision = this.collision(paddle);

        if (collision === PongBall.COLLISION_NONE) return undefined;

        if (
            collision === PongBall.COLLISION_RIGHT ||
            collision === PongBall.COLLISION_LEFT
        ) {
            // console.log('collision -> change dx');
            this.dx = -this.dx;
        } else {
            this.dy = -this.dy;
        }
        if (collision === PongBall.COLLISION_LEFT)
            // left
            this.x_start = paddle.x_end;
        if (collision === PongBall.COLLISION_RIGHT)
            // right
            this.x_start = paddle.x_start - this.w;
        if (collision === PongBall.COLLISION_TOP)
            // top
            this.y_start = paddle.y_start - this.h;
        if (collision === PongBall.COLLISION_BOTTOM)
            // bottom
            this.y_start = paddle.y_end;
        this.increaseSpeed(paddle);
        return undefined;
    }

    /** @param {PongPaddle} paddle  */
    increaseSpeed(paddle) {
        if (paddle.dir === -1) {
            // const old = this.dy;
            this.dy *= this.dy < 0 ? 0.5 : 1.5;
        } else if (paddle.dir === 1) {
            // const old = this.dy;
            this.dy *= this.dy < 0 ? 1.5 : 0.5;
        }
        // if (paddle.dir === PongPaddle.MOVE_UP) {
        //     let old = this.dy;
        //     this.dy = this.dy * (this.dy < 0 ? 0.5 : 1.5);
        // } else if (paddle.dir === PongPaddle.MOVE_DOWN) {
        //     let old = this.dy;
        //     this.dy = this.dy * (this.dy < 0 ? 1.5 : 0.5);
        // }
    }
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
