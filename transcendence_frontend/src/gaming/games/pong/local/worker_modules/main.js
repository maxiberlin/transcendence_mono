import PongBall from './Ball.js';
import PongPaddle from './Paddle.js';
import GameCourt from './GameCourt.js';

import { msg_to_main } from '../../../../exchange/game_msg.js';

/**
 * @param {(elapsedTimeMs: number) => boolean | undefined} callback
 * @returns {{startRender: () => void, stopRender: () => void, resetTime: () => void}}
 */
const useFrame = (callback) => {
    if (typeof callback !== 'function') throw new Error('invalid callback');
    let prevTimeStamp;
    let currFrame;
    console.log('Use Frame!!: ');
    const renderFunc = (timeStamp) => {
        console.log('render! currFrame: ', currFrame);
        if (prevTimeStamp === undefined) prevTimeStamp = timeStamp;
        const elapsed = (timeStamp - prevTimeStamp) / 1000;
        prevTimeStamp = timeStamp;
        if (callback(elapsed)) {
            currFrame = requestAnimationFrame(renderFunc);
        } else {
            currFrame = undefined;
            prevTimeStamp = undefined;
        }
    };
    const startRender = () => {
        console.log('startRender!');
        if (currFrame) return;
        console.log('startRender! yohhh');
        currFrame = requestAnimationFrame(renderFunc);
    };
    const stopRender = () => {
        if (!currFrame) return;
        cancelAnimationFrame(currFrame);
        currFrame = undefined;
        prevTimeStamp = undefined;
    };

    const resetTime = () => {
        prevTimeStamp = undefined;
    };

    return {
        startRender,
        stopRender,
        resetTime,
    };
};

/**
 * @param {number} time
 * @returns {(newTime: number) => number}
 */
// eslint-disable-next-line no-unused-vars
function useFps(time) {
    let currTime = time ?? performance.now();
    let fpsCount = 0;
    let currFps = 0;
    return (newTime) => {
        fpsCount += 1000;
        const diff = newTime - currTime;
        if (diff > 1000) {
            currFps = Math.floor(fpsCount / diff);
            currTime = newTime;
            fpsCount = 0;
        }
        return currFps;
    };
}

export default class Pong {
    /** @param {import('../../../../exchange/game_msg.js').WorkerDataInit} d */
    constructor(d) {
        console.log('constructor Pong!');

        this.canvas = d.canvas;
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            postMessage(msg_to_main.error);
            return;
        }

        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.gameSettings = d.gameSettings ?? { speed: 10, maxScore: 2 };

        this.colorWhite = '#FFF';
        this.colorBlack = '#000';
        this.resetTime = 1000;

        this.initGameObjects();

        this.frame = useFrame(this.render.bind(this));
    }

    initGameObjects() {
        this.runningGame = false;
        this.paused = false;
        this.scoreBreak = false;

        console.log('initGameObjects!');

        /** @type {GameCourt} */
        this.gamePlane = new GameCourt(5 / 300);
        this.gamePlane.setScale(this.width, this.height);
        /** @type {PongPaddle} */
        this.paddleL = new PongPaddle(
            5 / 300,
            25 / 200,
            5 / 300,
            PongPaddle.PADDLE_POS_LEFT,
            250 / 300,
            this.gamePlane,
        );
        this.paddleL.setScale(this.width, this.height);
        /** @type {PongPaddle} */
        this.paddleR = new PongPaddle(
            5 / 300,
            25 / 200,
            5 / 300,
            PongPaddle.PADDLE_POS_RIGHT,
            250 / 300,
            this.gamePlane,
        );
        this.paddleR.setScale(this.width, this.height);
        /** @type {PongBall} */
        this.ball = new PongBall(5 / 300, 150 / 300, this.gamePlane);
        this.ball.setScale(this.width, this.height);

        console.log('initGameObjects! done: ', this);
        this.frame?.startRender();
    }

    startGame() {
        this.runningGame = true;
        this.frame?.startRender();
    }

    quitGame() {
        this.initGameObjects();
        this.frame?.startRender();
    }

    pauseGame() {
        if (!this.ctx) return;
        if (this.paused) return;
        this.paused = true;
        this.frame?.stopRender();
    }

    continueGame() {
        if (!this.ctx) return;
        if (!this.paused) return;
        this.paused = false;
        this.frame?.startRender();
    }

    /** @param {import('../../../../exchange/game_msg.js').WorkerDataChangeColors} d */
    changeColor(d) {
        if (
            d.colorWhite &&
            typeof d.colorWhite === 'string' &&
            d.colorBlack &&
            typeof d.colorBlack === 'string'
        ) {
            this.colorWhite = d.colorWhite;
            this.colorBlack = d.colorBlack;
        }
    }

    /** @param {import('../../../../exchange/game_msg.js').WorkerDataKeyEvent} d */
    handleKey(d) {
        if (d.keyevent === 'keydown') {
            switch (d.key) {
                case 'ArrowUp':
                    this.paddleR?.moveUp();
                    break;
                case 'ArrowDown':
                    this.paddleR?.moveDown();
                    break;
                case 'a':
                    this.paddleL?.moveUp();
                    break;
                case 'y':
                    this.paddleL?.moveDown();
                    break;
                case 'Escape':
                    if (this.paused) this.continueGame();
                    else this.pauseGame();
                    break;
                default:
                    break;
            }
        } else if (d.keyevent === 'keyup') {
            switch (d.key) {
                case 'ArrowUp':
                    this.paddleR?.moveUp(true);
                    break;
                case 'ArrowDown':
                    this.paddleR?.moveDown(true);
                    break;
                case 'a':
                    this.paddleL?.moveUp(true);
                    break;
                case 'y':
                    this.paddleL?.moveDown(true);
                    break;
                default:
                    break;
            }
        }
    }

    /** @param {import('../../../../exchange/game_msg.js').WorkerDataResize} d */
    setCanvasSizes(d) {
        console.log('set canvas sizes');
        if (!this.ctx) return;
        console.log('set canvas sizes joooo: ', d);
        this.width = d.width;
        this.height = d.height;
        console.log('this.width: ', this.width);
        console.log('this.height: ', this.height);
        this.ctx.canvas.width = Math.floor(this.width * d.dpr);
        this.ctx.canvas.height = Math.floor(this.height * d.dpr);
        this.ctx.scale(d.dpr, d.dpr);
        this.gamePlane?.setScale(this.width, this.height);
        this.ball?.setScale(this.width, this.height);
        this.paddleL?.setScale(this.width, this.height);
        this.paddleR?.setScale(this.width, this.height);

        this.frame?.startRender();
    }

    // resetBall(side) {
    //     if (!this.ctx || ! this.gamePlane || !this.gameSettings) return ;
    //     if (side === 1) {
    //         this.gamePlane.scoreL++;
    //         postMessage(msg_to_main.player_1_score);
    //         if (this.gamePlane.scoreL === this.gameSettings.maxScore) {
    //             postMessage(msg_to_main.player_1_win);
    //         }
    //     } else if (side === 2) {
    //         this.gamePlane.scoreR++;
    //         postMessage(msg_to_main.player_2_score);
    //         if (this.gamePlane.scoreR === this.gameSettings.maxScore) {
    //             postMessage(msg_to_main.player_2_win);
    //         }
    //     }  else return ;

    //     this.scoreBreak = true;

    //     setTimeout(() => {
    //         this.ball = new PongBall(s.ball_x, s.ball_y, s.ball_width, s.ball_height, s.width, s.height, this.gamePlane);
    //         this.ball.setScale(this.width, this.height);
    //         this.scoreBreak = false;
    //         // timediff = Date.now();
    //     }, s.resetTime);
    // }

    resetBall(side) {
        if (!this.ctx || !this.gamePlane || !this.gameSettings) return;
        if (side === 1) {
            this.gamePlane.scoreL++;
            postMessage(msg_to_main.player_1_score);
            if (this.gamePlane.scoreL === this.gameSettings.maxScore) {
                postMessage(msg_to_main.player_1_win);
            }
        } else if (side === 2) {
            this.gamePlane.scoreR++;
            postMessage(msg_to_main.player_2_score);
            if (this.gamePlane.scoreR === this.gameSettings.maxScore) {
                postMessage(msg_to_main.player_2_win);
            }
        } else return;

        this.scoreBreak = true;

        setTimeout(() => {
            if (!this.gamePlane || !this.ball || !this.paddleL || !this.paddleR)
                return;
            this.ball = new PongBall(5 / 300, 150 / 300, this.gamePlane);
            this.ball.setScale(this.width, this.height);
            this.scoreBreak = false;
            // timediff = Date.now();
        }, this.resetTime);
    }

    #drawRectColor(color, obj, cb) {
        if (!this.ctx) return;
        this.ctx.fillStyle = color;
        if (typeof cb === 'function') cb();
        this.ctx.fillRect(obj.x_start, obj.y_start, obj.w, obj.h);
    }

    render(elapsed) {
        if (!this.gamePlane || !this.ball || !this.paddleL || !this.paddleR)
            return undefined;
        this.#drawRectColor(this.colorBlack, {
            x_start: 0,
            y_start: 0,
            w: this.width,
            h: this.height,
        });
        this.gamePlane?.draw(this.ctx, this.colorWhite, this.colorBlack);

        this.#drawRectColor(this.colorBlack, this.paddleL, () =>
            this.paddleL?.update(elapsed),
        );
        this.#drawRectColor(this.colorBlack, this.paddleR, () =>
            this.paddleR?.update(elapsed),
        );
        if (!this.scoreBreak && this.runningGame && !this.paused) {
            this.#drawRectColor(this.colorBlack, this.ball, () =>
                this.ball?.update(elapsed),
            );
            const score = this.ball?.checkCollision(this.paddleL, this.paddleR);
            this.resetBall(score);
        }
        return !this.paused && this.runningGame;
    }
}

// export class Pong {
//     /** @param {import('../../../services/game_worker_messages.js').WorkerDataInit} d */
//     constructor(d) {
//         this.canvas = d.canvas;
//         this.ctx = this.canvas.getContext("2d");
//         if (!this.ctx) {
//             postMessage(msg_to_main.error);
//             return ;
//         }

//         this.width = this.canvas.width;
//         this.height = this.canvas.height;

//         this.gameSettings = d.gameSettings ?? { speed: 10, maxScore: 10 };

//         this.colorWhite = "#FFF";
//         this.colorBlack = "#000";

//         this.initGameObjects();
//     }

//     initGameObjects() {

//         this.runningGame = false;
//         this.paused = false;
//         this.scoreBreak = false;

//         /** @type {GameCourt} */
//         this.gamePlane = new GameCourt(0, s.border_height, s.width, s.height - 2*s.border_height, s.border_width, s.border_height, s.width, s.height);
//         this.gamePlane.setScale(this.width,  this.height);
//         /** @type {PongPaddle} */
//         this.paddleL = new PongPaddle(s.paddle_l_x, s.paddle_l_y, s.paddle_width, s.paddle_height, s.width, s.height, this.gamePlane);
//         this.paddleL.setScale(this.width,  this.height);
//         /** @type {PongPaddle} */
//         this.paddleR = new PongPaddle(s.paddle_r_x, s.paddle_r_y, s.paddle_width, s.paddle_height, s.width, s.height, this.gamePlane);
//         this.paddleR.setScale(this.width,  this.height);
//         /** @type {PongBall} */
//         this.ball = new PongBall(s.ball_x, s.ball_y, s.ball_width, s.ball_height, s.width, s.height, this.gamePlane);
//         this.ball.setScale(this.width,  this.height);
//     }

//     startGame() {
//         this.runningGame = true;
//         this.currentFrame = requestAnimationFrame((t) => this.render(t));
//     }

//     quitGame() {
//         if (this.currentFrame)
//             cancelAnimationFrame(this.currentFrame);
//     }

//     pauseGame() {
//         if (!this.ctx) return ;
//         if (this.paused) return ;
//         this.paused = true;
//         if (this.currentFrame)
//             cancelAnimationFrame(this.currentFrame);
//         this.currentFrame = undefined;
//     }

//     continueGame() {
//         if (!this.ctx) return ;
//         if (!this.paused) return ;
//         this.paused = false;
//         this.prevTimestamp = undefined;
//         this.currentFrame = requestAnimationFrame((t) => this.render(t));
//     }

//     /** @param {import('../../../services/game_worker_messages.js').WorkerDataChangeColors} d */
//     changeColor(d) {
//         if (d.colorWhite && typeof d.colorWhite === "string" && d.colorBlack && typeof d.colorBlack === "string") {
//             this.colorWhite = d.colorWhite;
//             this.colorBlack = d.colorBlack;
//         }
//     }

//     /** @param {import('../../../services/game_worker_messages.js').WorkerDataKeyEvent} d */
//     handleKey(d) {
//         if (d.keyevent === "keydown") {
//             switch (d.key) {
//                 case "ArrowUp": this.paddleR?.moveUp();
//                     break;
//                 case "ArrowDown": this.paddleR?.moveDown();
//                     break;
//                 case "a": this.paddleL?.moveUp();
//                     break;
//                 case "y": this.paddleL?.moveDown();
//                     break;
//                 case "Escape":
//                     if (this.pausedpause) this.continueGame();
//                     else this.pauseGame();
//                     break;
//             }
//         } else if (d.keyevent === "keyup") {
//             switch (d.key) {
//                 case "ArrowUp": this.paddleR?.moveUp(true);
//                     break;
//                 case "ArrowDown": this.paddleR?.moveDown(true);
//                     break;
//                 case "a": this.paddleL?.moveUp(true);
//                     break;
//                 case "y": this.paddleL?.moveDown(true);
//                     break;
//             }
//         }
//     }

//     /** @param {import('../../../services/game_worker_messages.js').WorkerDataMouseEvent} d */
//     handleMouse(d) {

//     }

//     /** @param {import('../../../services/game_worker_messages.js').WorkerDataResize} d */
//     setCanvasSizes(d) {
//         if (!this.ctx) return ;
//         this.width = d.width;
//         this.height = d.height
//         this.ctx.canvas.width = Math.floor(this.width * d.dpr);
//         this.ctx.canvas.height = Math.floor(this.height * d.dpr);
//         this.ctx.scale(d.dpr, d.dpr);
//         this.gamePlane?.setScale(this.width, this.width);
//         this.ball?.setScale(this.width, this.width);
//         this.paddleL?.setScale(this.width, this.width);
//         this.paddleR?.setScale(this.width, this.width);
//         this.#cancelNextFrame();
//         this.currentFrame = requestAnimationFrame((t)=>{this.render(t)});
//     }

//     resetBall(side) {
//         if (!this.ctx || ! this.gamePlane || !this.gameSettings) return ;
//         if (side === 1) {
//             this.gamePlane.scoreL++;
//             postMessage(msg_to_main.player_1_score);
//             if (this.gamePlane.scoreL === this.gameSettings.maxScore) {
//                 postMessage(msg_to_main.player_1_win);
//                 this.initGameObjects();
//             }
//         } else if (side === 2) {
//             this.gamePlane.scoreR++;
//             postMessage(msg_to_main.player_2_score);
//             if (this.gamePlane.scoreR === this.gameSettings.maxScore) {
//                 postMessage(msg_to_main.player_2_win);
//                 this.initGameObjects();
//             }
//         }  else return ;

//         this.scoreBreak

//         setTimeout(() => {
//             this.ball = new PongBall(s.ball_x, s.ball_y, s.ball_width, s.ball_height, s.width, s.height, this.gamePlane);
//             this.ball.setScale(this.width, this.height);
//             this.scoreBreak = false;
//             // timediff = Date.now();
//         }, s.resetTime);
//     }

//     #cancelNextFrame() {
//         if (this.currentFrame) {
//             cancelAnimationFrame(this.currentFrame);
//             this.currentFrame = undefined;
//         }
//     }

//     #getNextFrame() {
//         this.currentFrame = requestAnimationFrame((t) => this.render(t));
//     }

//     #makeScore() {

//     }

//     #drawRectColor(color, obj, cb) {
//         if (!this.ctx) return ;
//         this.ctx.fillStyle = color;
//         if (typeof cb === "function") cb();
//         this.ctx.fillRect(obj.x_start, obj.y_start, obj.w, obj.h);
//     }

//     render(timestamp) {
//         if (!this.ctx) return ;

//         if (this.prevTimestamp === undefined) this.prevTimestamp = timestamp;
//         const elapsed = Math.floor(timestamp - this.prevTimestamp) / 1000;
//         this.prevTimestamp = timestamp;

//         this.#drawRectColor(s.colorBlack, {x_start: 0, y_start: 0, w: globals.currW, h: globals.currH});

//         this.gamePlane?.draw(this.ctx, s.colorWhite, s.colorBlack);

//         this.#drawRectColor(s.colorBlack, this.paddleL, () => this.paddleL?.update(elapsed) );
//         this.#drawRectColor(s.colorBlack, this.paddleR, () => this.paddleR?.update(elapsed) );
//         if (!this.scoreBreak && this.runningGame && !this.paused) {
//             this.#drawRectColor(s.colorBlack, this.ball, () => this.ball?.update(elapsed) );
//             const score = this.ball?.checkCollision(this.paddleL, this.paddleR);
//             this.resetBall(score);
//         }
//         if (!this.paused && this.runningGame)
//             this.#getNextFrame();
//             this.currentFrame = requestAnimationFrame((t) => this.render(t));
//     }
// }

// /**
//  * @param {(elapsedTimeMs: number) => void} callback
//  */
// function useFrame(callback) {

//     let prevTimeStamp;
//     const renderFunc = (timeStamp) => {

//     };
//     const pauseFrame = () => {

//     };
//     const continueFrame = () => {

//     };

// }

// function useFps(time) {
//     let currTime = time ?? performance.now();
//     let fpsCount = 0;
//     let currFps = 0;
//     return (newTime) => {
//         fpsCount += 1000;
//         const diff = newTime - currTime;
//         if (diff > 1000) {
//             currFps = Math.floor(fpsCount / diff);
//             currTime = newTime;
//             fpsCount = 0;
//         }
//         return (currFps);
//     };
// }
