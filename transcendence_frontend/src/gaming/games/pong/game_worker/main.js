/* eslint-disable prettier/prettier */
/* eslint-disable no-console */
/* eslint-disable jsdoc/no-undefined-types */
import PongBall from './Ball.js';
import PongPaddle from './Paddle.js';
import GameCourt from './GameCourt.js';
import DrawObj from './DrawObj.js';
import initialDataDefault from './localInitial.js';
import { useFrame, useMouseTouchHandler } from './utils.js';

/// <reference path="../../types.d.ts"/>

const useMedian = () => {
    let median = 0;
    let sum = 0;
    let count = 0;
    /** @param {number} val */
    const addValue = (val) => {
        sum += val;
        count += 1;
        median = sum / count;
    }
    const getMedian = () => median;
    return ({addValue, getMedian});
}

export default class Pong {
    /** @param {ToWorkerGameMessageTypes.Create} d */
    constructor(d) {
        // // // // console.log('constructor Pong!');

        /** @type {OffscreenCanvas} */
        this.canvas = d.offscreencanvas;
        /** @type {OffscreenCanvasRenderingContext2D | null} */
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) throw new Error('could not get canvas context');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.frame = useFrame(this.render.bind(this))
        this.runningGame = false;
        this.gameDone = false;
        this.paused = false;
        this.scoreBreak = false;
        this.initialized = false;
        /** @type {PongServerTypes.GameReady | undefined} */
        this.initialData = undefined;
        /** @type {APITypes.GameScheduleItem} */
        this.gameScheduleItem = d.data;
        this.userId = d.userId;
        /** @type {PongServerTypes.GameUpdate[]} */
        this.updateQueue = [];
        /** 
         * @typedef {Object} PaddlePrediction
         * @property {PongGameplayTypes.GameObjPositionData} data
         * @property {number} timestamp_ms
         */
        /** @type {PaddlePrediction[]} */
        this.paddlePredictions = [];
        this.serverGameTime = 0;
        if (d.message === 'game_worker_create_local') {
            this.remote = false;
            this.initGameObjects(initialDataDefault(d.data));
        } else {
            this.remote = true;
            this.serverOffset = useMedian();
            this.serverRTT = useMedian();
        }

    }

    /**
     * @param {PongServerTypes.GameReady} initialData
     */
    initGameObjects(initialData) {
        if (!this.ctx) return;



        /** @type {GameCourt} */
        this.gamePlane = new GameCourt(this.ctx,initialData.court);
        this.gamePlane.setCanvasSizes(this.width, this.height);
        /** @type {PongPaddle} */
        this.paddleL = new PongPaddle(this.ctx, initialData.paddle_left);
        this.paddleL.setCanvasSizes(this.width, this.height);
        /** @type {PongPaddle} */
        this.paddleR = new PongPaddle(this.ctx, initialData.paddle_right);
        this.paddleR.setCanvasSizes(this.width, this.height);
        /** @type {PongBall} */
        this.ball = new PongBall(this.ctx, initialData.ball, this.remote);
        this.ball.setCanvasSizes(this.width, this.height);
        this.initialized = true;
        this.initialData = initialData;

        if (this.remote) {
            const interpolationRatio = 4;
            this.interpMs =  (interpolationRatio / initialData.settings.tick_rate) * 1000;
            this.serverFrameTimeMs = (1 / initialData.settings.tick_rate) * 1000;
        }

        this.touchHandlerLeft = useMouseTouchHandler(this.paddleL);
        this.touchHandlerRight = useMouseTouchHandler(this.paddleR);
        
        this.frame.renderAtMostOnce();
        // // console.log('jox');
        this.startGame();
    }

    currentFrame = 0;
    /** @param {PongServerTypes.GameUpdate} update  */
    updateGameObjects(update) {
        this.updateQueue.push(update);
        this.updateQueue.sort((upd1, upd2)=>upd1.timestamp - upd2.timestamp)
        this.frame.syncTime(update.timestamp)
        this.currentFrame += 0;
        // if (this.serverRTT)
        //     this.currentFrameNo = update.tickno + (this.serverRTT.getMedian() / this.serverFrameTimeMs)
            // this.simBuffer = 0;

        // if (this.serverRTT)
        //     this.serverGameTime = update.timestamp - this.serverRTT.getMedian();
        
    }

    getGameTime = () => this.serverGameTime + (performance.now() - this.prevvv);
    // getGameTime = () => (performance.timeOrigin + performance.now()) - this.medianoffset;

    /**
     * @param {PongClientTypes.ClientMoveDirection} [action]
     * @param {number} [new_y]
     * @returns {number}
     */
    movePaddle(action, new_y) {
        if (!action) throw new TypeError('invalid action');
        if (this.initialData?.user_id_left === this.userId) {
            this.paddleL?.setDir(action);
        } else if (this.initialData?.user_id_right === this.userId) {
            this.paddleR?.setDir(action);
        } else {
            throw new TypeError('invalid action');
        }
        return (this.getGameTime());
    }

    /** @param {number} [startTimeMs] */
    startGame(startTimeMs) {
        if (!this.initialData || !this.initialized)
            throw new Error("Pong: startGame: no initialData");
        if (this.gameDone)
            throw new Error("Pong: startGame: game already Done");
        if (startTimeMs) {
            this.serverGameTime = startTimeMs;
            // this.currentFrameNo = 0;
            // this.serverGameStartTime = startTimeMs;
        }
        this.runningGame = true;
        this.frame.startRender(startTimeMs);
    }

    /** @param {PongServerTypes.Pong} serverResponse */
    handeTimeSync(serverResponse) {
        const t1 = serverResponse.client_timestamp_ms, t2 = serverResponse.server_timestamp_ms, t3 = performance.timeOrigin + performance.now()
        const serverOffset =  t2 - (t1 + (t3 - t1) / 2)
        this.serverOffset?.addValue(serverOffset);
        this.serverRTT?.addValue((t3 - t1) / 2)
    }

    quitGame() {
        // if (!this.initialData || !this.initialized)
        //     throw new Error("Pong: quitGame: no initialData");
        // if (this.gameDone)
        //     throw new Error("Pong: quitGame: game already Done");
        // if (!this.runningGame)
        //     throw new Error("Pong: quitGame: game not running");
        this.runningGame = false;
        this.gameDone = true;
        this.frame.stopRender();
    }

    pauseGame() {
        if (!this.initialData || !this.initialized)
            throw new Error("Pong: pauseGame: no initialData");
        if (this.gameDone)
            throw new Error("Pong: pauseGame: game already Done");
        if (!this.runningGame)
            throw new Error("Pong: pauseGame: game not running");
        this.paused = true;
        this.updateQueue.length = 0;
        this.frame?.stopRender();
    }

    resumeGame() {
        if (!this.initialData || !this.initialized)
            throw new Error("Pong: pauseGame: no initialData");
        if (this.gameDone)
            throw new Error("Pong: pauseGame: game already Done");
        if (!this.runningGame)
            throw new Error("Pong: pauseGame: game not running");
        if (!this.paused) return;
        this.paused = false;
        this.frame?.startRender();
    }

    /** @param {ToWorkerGameMessageTypes.ChangeColor} d */
    changeColor(d) {
        if (d.colorWhite && typeof d.colorWhite === 'string' && d.colorBlack && typeof d.colorBlack === 'string') {
            this.ball?.setColor(d.colorBlack);
            this.paddleL?.setColor(d.colorBlack);
            this.paddleR?.setColor(d.colorBlack);
            this.gamePlane?.setColor(d.colorWhite, d.colorBlack);
            this.frame.renderAtMostOnce();
        }
    }

    /** @param {ToWorkerGameMessageTypes.Resize} d */
    setCanvasSizes(d) {
        if (!this.ctx) return;
        // // console.log('setCanvasSizes');
        this.width = d.width;
        this.height = d.height;
        this.canvasX = d.canvasX;
        this.canvasY = d.canvasY;
        this.ctx.canvas.width = Math.floor(this.width * d.dpr);
        this.ctx.canvas.height = Math.floor(this.height * d.dpr);

        this.ctx.scale(d.dpr, d.dpr);
        this.ball?.setCanvasSizes(d.width, d.height);
        this.paddleL?.setCanvasSizes(d.width, d.height);
        this.paddleR?.setCanvasSizes(d.width, d.height);
        this.gamePlane?.setCanvasSizes(d.width, d.height);
        
        this.frame.renderAtMostOnce();
    }



    /**
     * @returns {"left" | "right" | "local"}
     */
    getYourSide = () => !this.remote ? "local" : this.userId === this.gameScheduleItem.player_one.id ? "left" : "right";

    /**
     * @param {ToWorkerGameMessageTypes.GameTouchEvent} d
     * @returns {[number, number] | undefined}
     */
    handeTouch(d) {
        /** @type {FromWorkerGameMessageTypes.GameTouchValid} */
        let msg;
        if (!this.touchHandlerLeft || !this.touchHandlerRight || !d) return;
        const side = this.getYourSide();

        if (d.type === "start" && d.touchRect !== undefined) {
            const validL = this.touchHandlerLeft.handleTouchStart(d.touchRect);
            const validR = this.touchHandlerRight.handleTouchStart(d.touchRect);
            // console.log('check validity: side: ', side, ' : l: ', validL, ', r: ', validR);
            const ident = d.touchRect.ident;
            const valid = validL && (side === "left" || side === "local") ? validL
                        : validR && (side === "right" || side === "local") ? validR
                        : false;
            msg = {message: "from-worker-game-touch-valid", ident, valid}
            self.postMessage(msg)
        } else if (d.type === "move") {
            const newYLeft = this.touchHandlerLeft.handleTouchMove(d.touchRect);
            const newYRight = this.touchHandlerRight.handleTouchMove(d.touchRect);
            if (newYLeft && side === "local") {
                this.paddleL?.setPaddlePosition(newYLeft);
            } else if (newYRight && side === "local") {
                this.paddleR?.setPaddlePosition(newYRight);
            } else {
                if (newYLeft && side === "left")
                    this.paddleL?.setPaddlePosition(newYLeft)
                else if (newYRight && side === "right")
                    this.paddleR?.setPaddlePosition(newYRight);
                return [this.getGameTime(), newYLeft ?? newYRight ?? 0];
            }
        } else if (d.type === "end") {
            this.touchHandlerLeft.handleTouchEnd(d.ident);
            this.touchHandlerRight.handleTouchEnd(d.ident);
        }
        
    }

    resetBall(side) {
        if (
            !this.initialized ||
            this.paused ||
            !this.initialData ||
            !this.gamePlane
        )
            return;
        if (side === 1) {
            this.gamePlane.scoreL++;
            // postMessage(msg_to_main.player_1_score);
            if (this.gamePlane.scoreL === this.initialData.settings.max_score) {
                // postMessage(msg_to_main.player_1_win);
            }
        } else if (side === 2) {
            this.gamePlane.scoreR++;
            // postMessage(msg_to_main.player_2_score);
            if (this.gamePlane.scoreR === this.initialData.settings.max_score) {
                // postMessage(msg_to_main.player_2_win);
            }
        } else return;

        this.scoreBreak = true;

        setTimeout(() => {
            if (!this.ball || !this.initialData || !this.ctx) return;
            this.ball = new PongBall(this.ctx, this.initialData.ball, this.remote);
            this.ball.setCanvasSizes(this.width, this.height);
            // this.ball.setScale(this.width, this.height);
            this.scoreBreak = false;
            // timediff = Date.now();
        }, this.initialData.settings.point_wait_time_ms);
    }

    // interpolate(elapsedSec, currUnixTimeStampMs) {
    //     if (!this.gamePlane || !this.ball || !this.paddleL || !this.paddleR || !this.ctx || !this.interpMs)
    //         throw new Error('Objects not defined');

       
    //     const renderTime = currUnixTimeStampMs - this.interpMs;
    //     while (this.updateQueue.length >= 2 && this.updateQueue[1].timestamp < renderTime) {
    //         this.updateQueue.shift();
    //     }
    //     if (this.updateQueue.length >= 2) {
    //         const currUpdate = this.updateQueue[0];
    //         const nextUpdate = this.updateQueue[1];
    //         // // // console.log('interpolate');
    //         // // // console.log(`renderTime: ${renderTime}, updateQueue len: ${this.updateQueue.length}`);
    //         const elapsedSinceLastUpdate = (renderTime - currUpdate.timestamp) / (nextUpdate.timestamp - currUpdate.timestamp);
    //         this.ball.interpolate(currUpdate.ball, nextUpdate.ball, elapsedSinceLastUpdate);

    //         const side = this.getYourSide();
    //         if (side === "left") {
    //             this.paddleL.update(elapsedSec);
    //             this.paddleR.interpolate(currUpdate.paddle_right, nextUpdate.paddle_right, elapsedSinceLastUpdate);
    //         } else if (side === "right") {
    //             this.paddleR.update(elapsedSec);
    //             this.paddleL.interpolate(currUpdate.paddle_left, nextUpdate.paddle_left, elapsedSinceLastUpdate);
    //         }
    //         // if (this.userId === this.initialData?.user_id_left) this.paddleL.update(elapsedSec)
    //         // else this.paddleL.interpolate(currUpdate.paddle_left, nextUpdate.paddle_left, elapsedSinceLastUpdate);
    //         // if (this.userId === this.initialData?.user_id_right) this.paddleR.update(elapsedSec)
    //         // else this.paddleR.interpolate(currUpdate.paddle_right, nextUpdate.paddle_right, elapsedSinceLastUpdate);
    //     } 
    //     // else {
    //     // //     // // console.log('extrapolate');
    //     //     this.paddleL.update(elapsedSec);
    //     //     this.paddleR.update(elapsedSec);
    //     //     this.ball.updateBall(elapsedSec, this.paddleL, this.paddleR);
    //     // }
    //     this.ball.draw();
    //     this.paddleL.draw();
    //     this.paddleR.draw();
    // }

    interpolate_frame(elapsedSec, currUnixTimeStampMs) {
        if (!this.gamePlane || !this.ball || !this.paddleL || !this.paddleR || !this.ctx || !this.interpMs)
            throw new Error('Objects not defined');

       
        const renderTime = this.serverGameTime - this.interpMs;
        // const renderTime = currUnixTimeStampMs - this.interpMs;


        while (this.updateQueue.length >= 2 && this.updateQueue[1].timestamp < renderTime) {
            // // // console.log('SHIFT!');
            this.updateQueue.shift();
            // if (d) this.simBuffer = renderTime - d?.timestamp
        }
        if (this.updateQueue.length >= 2) {
            const currUpdate = this.updateQueue[0];
            const nextUpdate = this.updateQueue[1];

            // const queuestamps = this.updateQueue.map((q) => q.timestamp)
            // // // console.log('update Queue: ', queuestamps);

            // // // // console.log('interpolate');
            // // // console.log(`this.serverGameTime: ${this.serverGameTime}, interp: ${this.interpMs}, lastUp: ${currUpdate.timestamp}, nextUp: ${nextUpdate.timestamp}, renderTime: ${renderTime}, updateQueue len: ${this.updateQueue.length}`);
            // const elapsedSinceLastUpdate = (renderTime - currUpdate.timestamp) / (nextUpdate.timestamp - currUpdate.timestamp);
            const elapsedSinceLastUpdate = (renderTime - currUpdate.timestamp) / (nextUpdate.timestamp - currUpdate.timestamp);
            
            // console.log(`predicted frame no: ${this.currentFrameNo}`);
            // const frameAlt = (this.serverGameTime - this.serverGameStartTime) / this.serverFrameTimeMs;
            // // console.log(`predicted frame no ALT: ${frameAlt}`);
            // console.log('queuelen: ', this.updateQueue.length);
            // console.log(`maybee frame no orig: ${this.updateQueue.at(-1)?.tickno}`);
            // const prr = this.updateQueue.at(-1)?.tickno + (this.serverRTT?.getMedian() / this.serverFrameTimeMs)
            // console.log(`maybee frame no + rtt: ${prr}`);
            // console.log('frame diff: ', this.currentFrameNo - currUpdate.tickno);
            // console.log('frame diff ALT: ', frameAlt - currUpdate.tickno);
            // console.log('frame diff ALT ALT: ', this.currentFrameNo - prr);
            // const elapsedSinceLastUpdatePaddle = (this.serverGameTime - this.paddlePredictions.at(-2).timestamp_ms) / (this.paddlePredictions.at(-1).timestamp_ms - this.paddlePredictions.at(-2).timestamp_ms);
            // // // console.log(`elapsedSinceLastUpdate: ${elapsedSinceLastUpdate}, this.paddlePredictions len: ${this.paddlePredictions.length}`);
            this.ball.interpolate(currUpdate.ball, nextUpdate.ball, elapsedSinceLastUpdate);

            const side = this.getYourSide();
            if (side === "left") {
                this.paddleL.update(elapsedSec);
                this.paddleR.interpolate(currUpdate.paddle_right, nextUpdate.paddle_right, elapsedSinceLastUpdate);
            } else if (side === "right") {
                this.paddleR.update(elapsedSec);
                this.paddleL.interpolate(currUpdate.paddle_left, nextUpdate.paddle_left, elapsedSinceLastUpdate);
            }
            // this.paddleL.interpolate(currUpdate.paddle_left, nextUpdate.paddle_left, elapsedSinceLastUpdate);
            // this.paddleR.interpolate(currUpdate.paddle_right, nextUpdate.paddle_right, elapsedSinceLastUpdate);
        } else {
            // // // console.log('extrapolate');
            this.paddleL.update(elapsedSec);
            this.paddleR.update(elapsedSec);
            this.ball.updateBall(elapsedSec, this.paddleL, this.paddleR);
        }
        this.ball.draw();
        this.paddleL.draw();
        this.paddleR.draw();
    }



    prevvv = 0;
    render(once, elapsedTimeSec, currUnixTimeStampMs, elapsedTimeMs, prevRaw, sinceWorkerTimeStamp) {

        
        this.serverGameTime += elapsedTimeMs;
        

        this.prevvv = prevRaw;

        if (!this.gamePlane || !this.ball || !this.paddleL || !this.paddleR || !this.ctx)
            return;
        this.gamePlane.draw(elapsedTimeSec);
        if (once) {
            this.ball.draw();
            this.paddleL.draw();
            this.paddleR.draw();
            return;
        } else if (this.remote) {
            
            // if (this.simBuffer + elapsedTimeMs > this.serverFrameTimeMs) {
            //     this.currentFrameNo += 1;
            //     this.simBuffer = Math.abs((this.simBuffer + elapsedTimeMs) - this.serverFrameTimeMs);
            // } else {
            //     this.simBuffer += elapsedTimeMs;
            // }
            
            
            // this.interpolate(elapsedTimeSec, currUnixTimeStampMs);
            // if (this.simBuffer + elapsedTimeMs > this.serverFrameTimeMs) {
            //     this.simBuffer = Math.abs((this.simBuffer + elapsedTimeMs) - this.serverFrameTimeMs);
            //     this.predictionTime += this.serverFrameTimeMs;
            //     this.calcPaddle.update(this.serverFrameTimeMs);
            //     this.paddlePredictions.push({
            //         timestamp_ms: this.predictionTime,
            //         data: {
            //             x: this.calcPaddle.x,
            //             y: this.calcPaddle.y,
            //             dx: this.calcPaddle.dx,
            //             dy: this.calcPaddle.dy
            //         }
            //     });
            // }
            // this.simBuffer += elapsedTimeMs;
            this.interpolate_frame(elapsedTimeSec, currUnixTimeStampMs)
            



        } else if (!this.remote) {
            this.paddleL.update(elapsedTimeSec)
            this.paddleL.draw();
            this.paddleR.update(elapsedTimeSec)
            this.paddleR.draw();
            if (!this.scoreBreak && this.runningGame && !this.paused) {
                const score = this.ball.updateBall(elapsedTimeSec, this.paddleL, this.paddleR);
                this.ball.draw();
                this.resetBall(score);
            }
        }
    }
}

// export default class Pong {
//     /** @param {ToWorkerGameMessageTypes.Create} d */
//     constructor(d) {
// // // //         // console.log('constructor Pong!');

//         /** @type {OffscreenCanvas} */
//         this.canvas = d.offscreencanvas;
//         /** @type {OffscreenCanvasRenderingContext2D | null} */
//         this.ctx = this.canvas.getContext('2d');
//         if (!this.ctx) {
//             throw new Error('could not get canvas context');
//         }

//         this.width = this.canvas.width;
//         this.height = this.canvas.height;

//         // this.frame = useFrame(
//         //     (once, elapsedTimeS, currUnixTimeStampMs, prevUnixTimeStampMs) => {
//         //         return this.render(
//         //             once,
//         //             elapsedTimeS,
//         //             currUnixTimeStampMs,
//         //             prevUnixTimeStampMs,
//         //         );
//         //     },
//         // );
//         this.frame = useFrame(this.render.bind(this))
//         this.runningGame = false;
//         this.gameDone = false;
//         this.paused = false;
//         this.scoreBreak = false;
//         this.initialized = false;
//         /** @type {PongServerTypes.GameReady | undefined} */
//         this.initialData = undefined;
//         /** @type {APITypes.GameScheduleItem} */
//         this.gameScheduleItem = d.data;
//         this.userId = d.userId;
//         /** @type {PongServerTypes.GameUpdate[]} */
//         this.updateQueue = [];
//         this.serverGameTime = 0;
//         if (d.message === 'game_worker_create_local') {
//             this.remote = false;
//             this.initGameObjects(initialDataDefault(d.data));
//         } else {
//             this.remote = true;
//         }
//     }

//     /**
//      * @param {PongServerTypes.GameReady} initialData
//      */
//     initGameObjects(initialData) {
// // // //         // console.log('init game obj: ', initialData);
// // // //         // console.log(
//         //     'init game obj original: ',
//         //     initialDataDefault(this.gameScheduleItem),
//         // );
//         if (!this.ctx) return;

//         /** @type {GameCourt} */
//         this.gamePlane = new GameCourt(this.ctx,initialData.court);
//         this.gamePlane.setCanvasSizes(this.width, this.height);
//         /** @type {PongPaddle} */
//         this.paddleL = new PongPaddle(this.ctx, initialData.paddle_left);
//         this.paddleL.setCanvasSizes(this.width, this.height);
//         /** @type {PongPaddle} */
//         this.paddleR = new PongPaddle(this.ctx, initialData.paddle_right);
//         this.paddleR.setCanvasSizes(this.width, this.height);
//         /** @type {PongBall} */
//         this.ball = new PongBall(this.ctx, initialData.ball);
//         this.ball.setCanvasSizes(this.width, this.height);
//         this.initialized = true;
//         this.initialData = initialData;

//         if (this.remote) {
//             const interpolationRatio = 8;
//             // this.interpMs = Math.trunc((interpolationRatio / initialData.settings.tick_rate) * 1000);
//             this.interpMs = interpolationRatio * Math.trunc((1 / initialData.settings.tick_rate) * 1000)
//             // this.interpMs = (interpolationRatio / initialData.settings.tick_rate) * 1000;
//         }

//         this.frame.renderAtMostOnce();
//     }

//     /**
//      * @param {PongServerTypes.GameUpdate} update
//      */
//     updateGameObjects(update) {
//         // for (let i = 0; i < update.invalid_ticks; i++) {
//         //     this.updateQueue.pop()
// // // //         //     console.log(`invalid no: ${update.invalid_ticks}, erase last`);
//         // }
//         this.updateQueue.push(update);
//         this.updateQueue.sort((upd1, upd2)=>upd1.timestamp - upd2.timestamp)
//         this.frame.syncTime(update.timestamp);
// // // //         console.log(`queuelen: ${this.updateQueue.length}`);
//     }

//     /**
//      * @param {PongClientTypes.ClientMoveDirection} [action]
//      * @param {number} [new_y]
//      * @returns {number}
//      */
//     movePaddle(action, new_y) {
//         if (!action) throw new TypeError('invalid action');
//         if (this.initialData?.user_id_left === this.userId) {
//             this.paddleL?.setDir(action);
//         } else if (this.initialData?.user_id_right === this.userId) {
//             this.paddleR?.setDir(action);
//         } else {
//             throw new TypeError('invalid action');
//         }
//         // return Math.trunc(this.frame.getCurrentServerTime());
//         // return (this.serverGameTime + (performance.now() - this.prevvv));
//         // return (this.serverGameTime + Math.round(performance.now()) - this.prevvv);
//         return (this.serverGameTime);
//     }

//     /** @param {number} [startTimeMs] */
//     startGame(startTimeMs) {
// // // //         console.log('start game!!');
// // // //         // console.log('sart game, init?: ', this.initialized, this.initialData);
//         if (!this.initialData || !this.initialized)
//             throw new Error("Pong: startGame: no initialData");
//         if (this.gameDone)
//             throw new Error("Pong: startGame: game already Done");
//         if (startTimeMs) {
// // // //             console.log(`start Game: startTimeMs input: ${startTimeMs}`);
//             this.serverGameTime = startTimeMs;
//         }
//         this.runningGame = true;
//         this.frame?.startRender(startTimeMs);
//         // this.frame?.startRender();
//     }

//     quitGame() {
//         // if (!this.initialData || !this.initialized)
//         //     throw new Error("Pong: quitGame: no initialData");
//         // if (this.gameDone)
//         //     throw new Error("Pong: quitGame: game already Done");
//         // if (!this.runningGame)
//         //     throw new Error("Pong: quitGame: game not running");
//         this.runningGame = false;
//         this.gameDone = true;
//         this.frame.stopRender();
//     }

//     pauseGame() {
//         if (!this.initialData || !this.initialized)
//             throw new Error("Pong: pauseGame: no initialData");
//         if (this.gameDone)
//             throw new Error("Pong: pauseGame: game already Done");
//         if (!this.runningGame)
//             throw new Error("Pong: pauseGame: game not running");
//         this.paused = true;
//         this.updateQueue.length = 0;
//         this.frame?.stopRender();
//     }

//     resumeGame() {
//         if (!this.initialData || !this.initialized)
//             throw new Error("Pong: pauseGame: no initialData");
//         if (this.gameDone)
//             throw new Error("Pong: pauseGame: game already Done");
//         if (!this.runningGame)
//             throw new Error("Pong: pauseGame: game not running");
//         if (!this.paused) return;
//         this.paused = false;
//         this.frame?.startRender();
//     }

//     /** @param {ToWorkerGameMessageTypes.ChangeColor} d */
//     changeColor(d) {
//         if (d.colorWhite && typeof d.colorWhite === 'string' && d.colorBlack && typeof d.colorBlack === 'string') {
//             this.ball?.setColor(d.colorBlack);
//             this.paddleL?.setColor(d.colorBlack);
//             this.paddleR?.setColor(d.colorBlack);
//             this.gamePlane?.setColor(d.colorWhite, d.colorBlack);
//             this.frame.renderAtMostOnce();
//         }
//     }

//     /** @param {ToWorkerGameMessageTypes.Resize} d */
//     setCanvasSizes(d) {
//         if (!this.ctx) return;
//         this.width = d.width;
//         this.height = d.height;
//         this.ctx.canvas.width = Math.floor(this.width * d.dpr);
//         this.ctx.canvas.height = Math.floor(this.height * d.dpr);
//         this.ctx.scale(d.dpr, d.dpr);
//         this.ball?.setCanvasSizes(d.width, d.height);
//         this.paddleL?.setCanvasSizes(d.width, d.height);
//         this.paddleR?.setCanvasSizes(d.width, d.height);
//         this.gamePlane?.setCanvasSizes(d.width, d.height);
//         // this.frame?.startRender();
//         this.frame.renderAtMostOnce();
//     }

//     resetBall(side) {
//         if (
//             !this.initialized ||
//             this.paused ||
//             !this.initialData ||
//             !this.gamePlane
//         )
//             return;
//         if (side === 1) {
//             this.gamePlane.scoreL++;
//             // postMessage(msg_to_main.player_1_score);
//             if (this.gamePlane.scoreL === this.initialData.settings.max_score) {
//                 // postMessage(msg_to_main.player_1_win);
//             }
//         } else if (side === 2) {
//             this.gamePlane.scoreR++;
//             // postMessage(msg_to_main.player_2_score);
//             if (this.gamePlane.scoreR === this.initialData.settings.max_score) {
//                 // postMessage(msg_to_main.player_2_win);
//             }
//         } else return;

//         this.scoreBreak = true;

//         setTimeout(() => {
//             if (!this.ball || !this.initialData || !this.ctx) return;
//             this.ball = new PongBall(this.ctx, this.initialData.ball);
//             this.ball.setCanvasSizes(this.width, this.height);
//             // this.ball.setScale(this.width, this.height);
//             this.scoreBreak = false;
//             // timediff = Date.now();
//         }, this.initialData.settings.point_wait_time_ms);
//     }

//     interpolate(elapsedSec, currUnixTimeStampMs) {
//         if (!this.gamePlane || !this.ball || !this.paddleL || !this.paddleR || !this.ctx || !this.interpMs)
//             throw new Error('Objects not defined');

       
//         const renderTime = currUnixTimeStampMs - this.interpMs;
//         while (this.updateQueue.length >= 2 && this.updateQueue[1].timestamp < renderTime) {
//             this.updateQueue.shift();
//         }
//         if (this.updateQueue.length >= 2) {
//             const currUpdate = this.updateQueue[0];
//             const nextUpdate = this.updateQueue[1];
// // // //             console.log('interpolate');
// // // //             console.log(`renderTime: ${renderTime}, updateQueue len: ${this.updateQueue.length}`);
//             const elapsedSinceLastUpdate = (renderTime - currUpdate.timestamp) / (nextUpdate.timestamp - currUpdate.timestamp);
//             this.ball.interpolate(currUpdate.ball, nextUpdate.ball, elapsedSinceLastUpdate);

//             this.paddleL.interpolate(currUpdate.paddle_left, nextUpdate.paddle_left, elapsedSinceLastUpdate);
//             this.paddleR.interpolate(currUpdate.paddle_right, nextUpdate.paddle_right, elapsedSinceLastUpdate);
//             // if (this.userId === this.initialData?.user_id_left) this.paddleL.update(elapsedSec)
//             // else this.paddleL.interpolate(currUpdate.paddle_left, nextUpdate.paddle_left, elapsedSinceLastUpdate);
//             // if (this.userId === this.initialData?.user_id_right) this.paddleR.update(elapsedSec)
//             // else this.paddleR.interpolate(currUpdate.paddle_right, nextUpdate.paddle_right, elapsedSinceLastUpdate);
//         } else {
// // // //             console.log('extrapolate');
//             this.paddleL.update(elapsedSec);
//             this.paddleR.update(elapsedSec);
//             this.ball.updateBall(elapsedSec, this.paddleL, this.paddleR);
//         }
//         this.ball.draw();
//         this.paddleL.draw();
//         this.paddleR.draw();
//     }
//     interpolate_frame(elapsedSec) {
//         if (!this.gamePlane || !this.ball || !this.paddleL || !this.paddleR || !this.ctx || !this.interpMs)
//             throw new Error('Objects not defined');

       
//         const renderTime = this.serverGameTime - this.interpMs;
//         while (this.updateQueue.length >= 2 && this.updateQueue[1].timestamp < renderTime) {
//             this.updateQueue.shift();
//         }
//         if (this.updateQueue.length >= 2) {
//             const currUpdate = this.updateQueue[0];
//             const nextUpdate = this.updateQueue[1];
// // // //             // console.log('interpolate');
// // // //             console.log(`this.serverGameTime: ${this.serverGameTime}, interp: ${this.interpMs}, lastUp: ${currUpdate.timestamp}, nextUp: ${nextUpdate.timestamp}, renderTime: ${renderTime}, updateQueue len: ${this.updateQueue.length}`);
//             // const elapsedSinceLastUpdate = (renderTime - currUpdate.timestamp) / (nextUpdate.timestamp - currUpdate.timestamp);
//             const elapsedSinceLastUpdate = (renderTime - currUpdate.timestamp) / (nextUpdate.timestamp - currUpdate.timestamp);
// // // //             console.log(`elapsedSinceLastUpdate: ${elapsedSinceLastUpdate}`);
//             this.ball.interpolate(currUpdate.ball, nextUpdate.ball, elapsedSinceLastUpdate);

//             this.paddleL.interpolate(currUpdate.paddle_left, nextUpdate.paddle_left, elapsedSinceLastUpdate);
//             this.paddleR.interpolate(currUpdate.paddle_right, nextUpdate.paddle_right, elapsedSinceLastUpdate);
//             // if (this.userId === this.initialData?.user_id_left) this.paddleL.update(elapsedSec)
//             // else this.paddleL.interpolate(currUpdate.paddle_left, nextUpdate.paddle_left, elapsedSinceLastUpdate);
//             // if (this.userId === this.initialData?.user_id_right) this.paddleR.update(elapsedSec)
//             // else this.paddleR.interpolate(currUpdate.paddle_right, nextUpdate.paddle_right, elapsedSinceLastUpdate);
//         } else {
// // // //             console.log('extrapolate');
//             this.paddleL.update(elapsedSec);
//             this.paddleR.update(elapsedSec);
//             this.ball.updateBall(elapsedSec, this.paddleL, this.paddleR);
//         }
//         this.ball.draw();
//         this.paddleL.draw();
//         this.paddleR.draw();
//     }
//     prevvv = 0;
//     render(once, elapsedTimeSec, currUnixTimeStampMs, elapsedTimeMs, prevRaw, sinceWorkerTimeStamp) {
// // // //         // console.log(`render elapsed: ${elapsedTimeMs}`);
//         // this.serverGameTime += elapsedTimeMs;
//         const roundedprev = Math.round(prevRaw)
//         const roundednow = Math.round(sinceWorkerTimeStamp)
//         this.serverGameTime = this.serverGameTime + (roundednow - roundedprev);
// // // //         console.log(`prevRaw: ${prevRaw}, sinceWorkerTimeStamp: ${sinceWorkerTimeStamp}`);
// // // //         console.log(`roundedprev: ${roundedprev}, roundednow: ${roundednow}`);
// // // //         console.log(``);
//         this.prevvv = roundedprev;
//         // this.prevvv = prevRaw;
//         if (!this.gamePlane || !this.ball || !this.paddleL || !this.paddleR || !this.ctx)
//             return;

//         let interpolated = false;
//         this.gamePlane.draw(elapsedTimeSec);
//         if (once) {
//             this.ball.draw();
//             this.paddleL.draw();
//             this.paddleR.draw();
//             return;
//         } else if (this.remote) {
//             // this.interpolate(elapsedTimeSec, currUnixTimeStampMs);
//             this.interpolate_frame(elapsedTimeSec)
//         } else if (!this.remote) {
//             this.paddleL.update(elapsedTimeSec)
//             this.paddleL.draw();
//             this.paddleR.update(elapsedTimeSec)
//             this.paddleR.draw();
//             if (!this.scoreBreak && this.runningGame && !this.paused) {
//                 const score = this.ball.updateBall(elapsedTimeSec, this.paddleL, this.paddleR);
//                 this.ball.draw();
//                 this.resetBall(score);
//             }
//         }
//     }
// }
