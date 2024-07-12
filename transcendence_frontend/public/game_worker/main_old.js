/* eslint-disable prettier/prettier */
/* eslint-disable no-console */
/* eslint-disable jsdoc/no-undefined-types */
import PongBall from './Ball.js';
import PongPaddle from './Paddle.js';
import GameCourt from './GameCourt.js';
import DrawObj from './DrawObj.js';

/// <reference path="../../types.d.ts"/>

/**
 * @returns {number}
 */
function getTimeMsUnix() {
    return performance.now() + performance.timeOrigin;
}

const useScale = (scaleX, scaleY) => {
    const scY = 1 / scaleY;
    const scX = 1 / scaleX;
    // const ratio = scaleX / scaleY;
    return {
        downscaleX: (x) => x * scX,
        downscaleY: (y) => y * scY,
    };
};
    // const renderFunc = (sinceWorkerTimeStamp) => {
    //     const unixTimeStamp = sinceWorkerTimeStamp + performance.timeOrigin + unixServerStartTimeMsDiff;
    //     if (prevTimeStamp === undefined) prevTimeStamp = unixTimeStamp;
    //     const elapsed = (unixTimeStamp - prevTimeStamp) / 1000;
    //     prevTimeStamp = unixTimeStamp;
    //     const shouldRenderNextFrame = callback(once, elapsed, unixTimeStamp, prevTimeStamp);
    //     if (shouldRenderNextFrame && !once) {
    //         currFrame = requestAnimationFrame(renderFunc);
    //     } else {
    //         currFrame = undefined;
    //         prevTimeStamp = undefined;
    //     }
    // };

const useServerTime = () => {
    let serverTimeMs = performance.timeOrigin;
    let serverTimeDiffMs = 0;
    const syncTime = (timestampMs) => {
        performance.timeOrigin
    };

    const timeOriginMs = () => {

    };

    const serverNowMs = () => {

    };
}
// console.log(`current client Time since Worker: ${curr}`);
// console.log(`current client Time since Unix: ${curr_unix}`);
// console.log(`server Game Start Time Unix: ${syncTimeUnixMs}`);
// console.log(`client - Server timediff on start: ${curr_unix - syncTimeUnixMs}`);
// // console.log('unixServerStartTimeMsDiff: ', unixServerStartTimeMsDiff);

/** @param {(once: boolean, elapsedTimeS: number, currUnixTimeStampMs: number, prevUnixTimeStampMs: number) => void} callback */
const useFrame = (callback) => {
    if (typeof callback !== 'function') throw new Error('invalid callback');
    let prevTimeStamp;
    let prevRaw;
    let currFrame;

    // let serverGameStartTimeMs = 0;
    // let unixServerStartTimeMsDiff = 0;

    let timeOrigin = performance.timeOrigin;

    let once = false;
    let stopped = true;

    const syncTime = (syncTimeUnixMs) => {
        if (syncTimeUnixMs) {
            timeOrigin = syncTimeUnixMs - performance.now();
            // const curr = performance.now();
            // const curr_unix = curr + performance.timeOrigin;
            // serverGameStartTimeMs = syncTimeUnixMs;
            // unixServerStartTimeMsDiff = curr_unix - syncTimeUnixMs;

            
            if (prevTimeStamp)
                timeOrigin + prevRaw;
                // prevTimeStamp = performance.timeOrigin + prevRaw + unixServerStartTimeMsDiff;
        }
    };

    /** @param {number} sinceWorkerTimeStamp */
    const renderFunc = (sinceWorkerTimeStamp) => {
        // const unixTimeStamp =( performance.timeOrigin + sinceWorkerTimeStamp) - unixServerStartTimeMsDiff;
        const unixTimeStamp = timeOrigin + sinceWorkerTimeStamp;
        if (prevTimeStamp === undefined) {
            prevTimeStamp = unixTimeStamp;
            prevRaw = sinceWorkerTimeStamp;
        }
        const elapsedTimeMs = sinceWorkerTimeStamp - prevRaw;
        const elapsed = elapsedTimeMs / 1000;

        prevTimeStamp = unixTimeStamp;
        prevRaw = sinceWorkerTimeStamp;

        callback(once, elapsed, unixTimeStamp, elapsedTimeMs);
        if (!stopped && !once) {
            currFrame = requestAnimationFrame(renderFunc);
        } else {
            currFrame = undefined;
            prevTimeStamp = undefined;
            once = false;
        }
    };
    /** @param {number} [startTime] */
    const startRender = (startTime) => {
        if (currFrame) return;
        if (startTime) syncTime(startTime);
        stopped = false;
        currFrame = requestAnimationFrame(renderFunc);
    };
    const stopRender = () => {
        if (currFrame) {
            // console.log('stopRender!: has current Frame');
            cancelAnimationFrame(currFrame);
            currFrame = undefined;
            prevTimeStamp = undefined;
            stopped = true;

        } else {
            // console.log('stopRender: no current Frame');
        }
    };

    const resetTime = () => {
        prevTimeStamp = undefined;
    };

    const getCurrentServerTime = () => {
        // return (performance.timeOrigin + performance.now()) - unixServerStartTimeMsDiff;
        return timeOrigin + performance.now();
    }

    const renderAtMostOnce = () => {
        // console.log('render once!');
        if (!currFrame) {
            once = true;
            // console.log('render once no current Frame!');
            currFrame = requestAnimationFrame(renderFunc);
        } else {
            // console.log('NO render once has current Frame!');
        }
    };

    return {
        syncTime,
        startRender,
        stopRender,
        resetTime,
        renderAtMostOnce,
        getCurrentServerTime
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

/** @type {PongGameplayTypes.GameSettings} */
const defaultSettings = {
    initial_serve_to: 'initial-serve-left',
    max_score: 10,
    point_wait_time_ms: 1000,
    serve_mode: 'serve-winner',
    tick_duration_ms: 50,
};

const { downscaleX, downscaleY } = useScale(20000, 20000);
const g_speeddef = 4000
const sizesDefault = {
    width: downscaleX(20000),
    height: downscaleY(20000),
    paddle_width: downscaleX(300),
    paddle_height: downscaleY(2600),
    paddle_speed_x: downscaleX(0),
    paddle_speed_y: downscaleY(g_speeddef),
    wall_dist: downscaleX(300),
    ball_width: downscaleX(300),
    ball_height: downscaleY(600),
    ball_speed_x: downscaleX(g_speeddef),
    ball_speed_y: downscaleY(g_speeddef),
    border_width: downscaleX(600),
    border_height: downscaleY(600),
};

/** @type {PongGameplayTypes.GameObjData} */
const courtDefault = {
    x: 0.0,
    y: sizesDefault.border_height,
    w: sizesDefault.width,
    h: sizesDefault.height - 2 * sizesDefault.border_height,
    speed_x: 0.0,
    speed_y: 0.0,
    dx: 0.0,
    dy: 0.0,
    bound_left: 0.0,
    bound_right: 1.0,
    bound_top: 0.0,
    bound_bottom: 0.0,
};

/** @type {PongGameplayTypes.GameObjData} */
const paddleLeftDefault = {
    x: sizesDefault.wall_dist,
    y: sizesDefault.height / 2.0 - sizesDefault.paddle_height / 2.0,
    w: sizesDefault.paddle_width,
    h: sizesDefault.paddle_height,
    speed_x: sizesDefault.paddle_speed_x,
    speed_y: sizesDefault.paddle_speed_y,
    dx: 0.0,
    dy: 0.0,
    bound_left: courtDefault.x,
    bound_right: courtDefault.w,
    bound_top: courtDefault.y,
    bound_bottom: courtDefault.y + courtDefault.h,
};

/**  @type {PongGameplayTypes.GameObjData} */
const paddleRightDefault = {
    x:
        sizesDefault.width -
        (sizesDefault.wall_dist + sizesDefault.paddle_width),
    y: sizesDefault.height / 2.0 - sizesDefault.paddle_height / 2.0,
    w: sizesDefault.paddle_width,
    h: sizesDefault.paddle_height,
    speed_x: sizesDefault.paddle_speed_x,
    speed_y: sizesDefault.paddle_speed_y,
    dx: 0.0,
    dy: 0.0,
    bound_left: courtDefault.x,
    bound_right: courtDefault.w,
    bound_top: courtDefault.y,
    bound_bottom: courtDefault.y + courtDefault.h,
};

/** @type {PongGameplayTypes.GameObjData} */
const ballDefault = {
    x: sizesDefault.width / 2.0 - sizesDefault.ball_width / 2.0,
    y: sizesDefault.height / 2.0 - sizesDefault.ball_height / 2.0,
    w: sizesDefault.ball_width,
    h: sizesDefault.ball_height,
    speed_x: sizesDefault.ball_speed_x,
    speed_y: sizesDefault.ball_speed_y,
    dx: 0.0,
    dy: 0.0,
    bound_left: courtDefault.x,
    bound_right: courtDefault.w,
    bound_top: courtDefault.y,
    bound_bottom: courtDefault.y + courtDefault.h,
};

/**
 * @param {APITypes.GameScheduleItem} data
 * @returns {PongServerTypes.GameReady}
 */
const initialDataDefault = (data) => ({
    tag: 'server-game-ready',
    timestamp: Date.now(),
    court: courtDefault,
    ball: ballDefault,
    paddle_left: paddleLeftDefault,
    paddle_right: paddleRightDefault,
    settings: defaultSettings,
    timeout_time_sec: 10,
    user_id_left: data.player_one.id,
    user_id_right: data.player_two.id,
});

export default class Pong {
    /** @param {ToWorkerGameMessageTypes.Create} d */
    constructor(d) {
        // console.log('constructor Pong!');

        /** @type {OffscreenCanvas} */
        this.canvas = d.offscreencanvas;
        /** @type {OffscreenCanvasRenderingContext2D | null} */
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            throw new Error('could not get canvas context');
        }

        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.frame = useFrame(
            (once, elapsedTimeS, currUnixTimeStampMs, prevUnixTimeStampMs) => {
                return this.render(
                    once,
                    elapsedTimeS,
                    currUnixTimeStampMs,
                    prevUnixTimeStampMs,
                );
            },
        );
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
        if (d.message === 'game_worker_create_local') {
            this.remote = false;
            this.initGameObjects(initialDataDefault(d.data));
        } else {
            this.remote = true;
        }

        this.startGameTime = 0;
        this.elapsedSinceStart = 0;
 
    }

    /**
     * @param {PongServerTypes.GameReady} initialData
     */
    initGameObjects(initialData) {
        // console.log('init game obj: ', initialData);
        // console.log(
        //     'init game obj original: ',
        //     initialDataDefault(this.gameScheduleItem),
        // );
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
        this.ball = new PongBall(this.ctx, initialData.ball);
        this.ball.setCanvasSizes(this.width, this.height);
        this.initialized = true;
        this.initialData = initialData;
        this.frame.renderAtMostOnce();
    }

    /**
     * @param {PongServerTypes.GameUpdate} update
     */
    updateGameObjects(update) {
        // console.log('update Game Objects ball: ', update.ball);
        // console.log('update Game Objects paddle left: ', update.paddle_left);
        // console.log('update Game Objects paddle right: ', update.paddle_right);
        // console.log('update game objects, new timestamp: ', update.timestamp);
        // console.log('update game objects, new timestamp - diff: ', update.timestamp - this.startGameTime);
        this.updateQueue.push(update);
        this.frame.syncTime(update.timestamp);
        // this.ball?.updataPositions(update.ball);
        // this.paddleL?.updataPositions(update.paddle_left);
        // this.paddleR?.updataPositions(update.paddle_right);
    }

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
        return Math.trunc(this.frame.getCurrentServerTime());
    }

    /** @param {number} [startTimeMs] */
    startGame(startTimeMs) {
        console.log('start game!!');
        // console.log('sart game, init?: ', this.initialized, this.initialData);
        if (!this.initialData || !this.initialized)
            throw new Error("Pong: startGame: no initialData");
        if (this.gameDone)
            throw new Error("Pong: startGame: game already Done");
        if (startTimeMs) {
            console.log(`start Game: curr time ms: ${getTimeMsUnix()}`);
            console.log(`start Game: time origin: ${performance.timeOrigin}`);
            console.log(`start Game: startTimeMs input: ${startTimeMs}`);
            console.log(`start Game: timediff: ${startTimeMs - performance.timeOrigin}`);
            this.startGameTime = startTimeMs;
            this.startGameTimeDiff = getTimeMsUnix() - this.startGameTime;
        }
        this.runningGame = true;
        this.frame?.startRender(startTimeMs);
        // this.frame?.startRender();
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
        this.width = d.width;
        this.height = d.height;
        this.ctx.canvas.width = Math.floor(this.width * d.dpr);
        this.ctx.canvas.height = Math.floor(this.height * d.dpr);
        this.ctx.scale(d.dpr, d.dpr);
        this.ball?.setCanvasSizes(d.width, d.height);
        this.paddleL?.setCanvasSizes(d.width, d.height);
        this.paddleR?.setCanvasSizes(d.width, d.height);
        this.gamePlane?.setCanvasSizes(d.width, d.height);
        // this.frame?.startRender();
        this.frame.renderAtMostOnce();
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
            this.ball = new PongBall(this.ctx, this.initialData.ball);
            this.ball.setCanvasSizes(this.width, this.height);
            // this.ball.setScale(this.width, this.height);
            this.scoreBreak = false;
            // timediff = Date.now();
        }, this.initialData.settings.point_wait_time_ms);
    }

    lerp = (a, b, alpha) => a + alpha * (b - a);
    
    lerp2 = (start, end, time) => start * (1 - time) + end * time;
    /**
     * @param {DrawObj} obj
     * @param {PongGameplayTypes.GameObjPositionData} lastUpdate 
     * @param {PongGameplayTypes.GameObjPositionData} nextUpdate
     * @param {number} elapsedSinceUpdate
     */
    interpolateGameObject(obj, lastUpdate, nextUpdate, elapsedSinceUpdate) {
        // console.log('elapsed sinceUpdate:', elapsedSinceUpdate);
        obj.x = this.lerp2(lastUpdate.x, nextUpdate.x, elapsedSinceUpdate);
        obj.y = this.lerp2(lastUpdate.y, nextUpdate.y, elapsedSinceUpdate);
    }

    // elapsedSinceLastSnapshot = 0;
    // interpolate(currUnixTimeStampMs, elapsedTimeMs) {
    //     if (!this.gamePlane || !this.ball || !this.paddleL || !this.paddleR || !this.ctx)
    //         throw new Error('Objects not defined');

    //     const interpMs = 100;
    //     // while (this.updateQueue.length >= 2 && this.updateQueue[1].timestamp < renderTime) {
    //     //     this.updateQueue.shift();
    //     // }
    //     this.elapsedSinceLastSnapshot += elapsedTimeMs;

        
    //     if (this.updateQueue.length >= 2) {
    //         const currUpdate = this.updateQueue[0];
    //         const nextUpdate = this.updateQueue[1];
    //         const elapsedSinceLastUpdate = (renderTime - currUpdate.timestamp) / interpMs;
    //         this.interpolateGameObject(this.ball, currUpdate.ball, nextUpdate.ball, elapsedSinceLastUpdate);
    //         this.interpolateGameObject(this.paddleL, currUpdate.paddle_left, nextUpdate.paddle_left, elapsedSinceLastUpdate);
    //         this.interpolateGameObject(this.paddleR, currUpdate.paddle_right, nextUpdate.paddle_right, elapsedSinceLastUpdate);
    //         return (true);
    //     }
    //     return (false);
    // }
    interpolate(elapsedMs, currUnixTimeStampMs) {
        if (!this.gamePlane || !this.ball || !this.paddleL || !this.paddleR || !this.ctx)
            throw new Error('Objects not defined');

        const interpMs = this.initialData?.settings.tick_duration_ms ? 2*this.initialData?.settings.tick_duration_ms : 100;
        const renderTime = currUnixTimeStampMs - interpMs;
        while (this.updateQueue.length >= 2 && this.updateQueue[1].timestamp < renderTime) {
            this.updateQueue.shift();
        }
        if (this.updateQueue.length >= 2) {
         
            
            const currUpdate = this.updateQueue[0];
            const nextUpdate = this.updateQueue[1];
            console.log(`updateQueue len: ${this.updateQueue.length}`);
            console.log(`renderTime: ${renderTime}`);
            console.log('renderTime - currUpdate.timestamp: ', renderTime - currUpdate.timestamp);
            console.log('timediff next - curr: ', (nextUpdate.timestamp - currUpdate.timestamp));
            // console.log('timediff curr - start: ', (currUpdate.timestamp - this.startGameTime));
            const elapsedSinceLastUpdate = (renderTime - currUpdate.timestamp) / (nextUpdate.timestamp - currUpdate.timestamp);
            // const elapsedSinceLastUpdate = (renderTime - currUpdate.timestamp) / interpMs;
            // console.log(`elapsedSinceLastUpdate: ${elapsedSinceLastUpdate}`);
            this.interpolateGameObject(this.ball, currUpdate.ball, nextUpdate.ball, elapsedSinceLastUpdate);
            this.ball.draw();
            // if (this.userId !== this.gameScheduleItem.player_one.id) {
                this.interpolateGameObject(this.paddleL, currUpdate.paddle_left, nextUpdate.paddle_left, elapsedSinceLastUpdate);
                this.paddleL.draw();
            // }
            // if (this.userId !== this.gameScheduleItem.player_two.id) {
                this.interpolateGameObject(this.paddleR, currUpdate.paddle_right, nextUpdate.paddle_right, elapsedSinceLastUpdate);
                this.paddleR.draw();
            // }
            return (true);
        }
        return (false);
    }
    // interpolate(elapsedMs) {
    //     if (!this.gamePlane || !this.ball || !this.paddleL || !this.paddleR || !this.ctx)
    //         throw new Error('Objects not defined');

        
    //     const interpMs = this.initialData?.settings.tick_duration_ms ? 2*this.initialData?.settings.tick_duration_ms : 100;
    //     const renderTime = this.startGameTime - interpMs;
    //     console.log('renderTime: ', renderTime);
    //     console.log('currentGameTime: ', this.startGameTime);
    //     console.log('interpMs: ', interpMs);
    //     while (this.updateQueue.length >= 2 && this.updateQueue[1].timestamp < renderTime) {
    //         // console.log('renderTime: ', renderTime);
    //         // console.log('this.updateQueue[0].timestamp: ',  this.updateQueue[0].timestamp);
    //         // console.log('shift!');
    //         this.updateQueue.shift();
    //     }
    //     if (this.updateQueue.length >= 2) {
         
            
    //         const currUpdate = this.updateQueue[0];
    //         const nextUpdate = this.updateQueue[1];
    //         console.log(`updateQueue len: ${this.updateQueue.length}`);
    //         console.log(`renderTime: ${renderTime}`);
    //         console.log('renderTime - currUpdate.timestamp: ', renderTime - currUpdate.timestamp);
    //         console.log('timediff next - curr: ', (nextUpdate.timestamp - currUpdate.timestamp));
    //         console.log('timediff curr - start: ', (currUpdate.timestamp - this.startGameTime));
    //         // const elapsedSinceLastUpdate = (renderTime - currUpdate.timestamp) / (nextUpdate.timestamp - currUpdate.timestamp);
    //         const elapsedSinceLastUpdate = (renderTime - currUpdate.timestamp) / interpMs;
    //         // console.log(`elapsedSinceLastUpdate: ${elapsedSinceLastUpdate}`);
    //         this.interpolateGameObject(this.ball, currUpdate.ball, nextUpdate.ball, elapsedSinceLastUpdate);
    //         this.ball.draw();
    //         if (this.userId !== this.gameScheduleItem.player_one.id) {
    //             this.interpolateGameObject(this.paddleL, currUpdate.paddle_left, nextUpdate.paddle_left, elapsedSinceLastUpdate);
    //             this.paddleL.draw();
    //         }
    //         if (this.userId !== this.gameScheduleItem.player_two.id) {
    //             this.interpolateGameObject(this.paddleR, currUpdate.paddle_right, nextUpdate.paddle_right, elapsedSinceLastUpdate);
    //             this.paddleR.draw();
    //         }
    //         return (true);
    //     }
    //     return (false);
    // }

    render(once, elapsedTimeS, currUnixTimeStampMs, elapsedTimeMs) {
        // this.startGameTime += elapsedTimeMs;
        if (!this.gamePlane || !this.ball || !this.paddleL || !this.paddleR || !this.ctx)
            return;

        // console.log(`render: once: ${once}`);
        // console.log(`render: elapsedTimeS: ${elapsedTimeS}`);
        // console.log(`render: currUnixTimeStampMs: ${currUnixTimeStampMs}`);
        // console.log(`render: prevUnixTimeStampMs: ${prevUnixTimeStampMs}`);
        let interpolated = false;
        this.gamePlane.draw(elapsedTimeS);
        if (once) {
            this.ball.draw();
            this.paddleL.draw();
            this.paddleR.draw();
            return;
        } else if (this.remote) {
            // interpolated = this.interpolate(elapsedTimeMs);
            interpolated = this.interpolate(elapsedTimeMs, currUnixTimeStampMs);
            // if (this.userId === this.gameScheduleItem.player_one.id)
            //     this.paddleL.draw(elapsedTimeS);
            // if (this.userId === this.gameScheduleItem.player_two.id)
            //     this.paddleR.draw(elapsedTimeS);
        } else if (!this.remote) {
            this.paddleL.draw(elapsedTimeS);
            this.paddleR.draw(elapsedTimeS);
            if (!this.scoreBreak && this.runningGame && !this.paused) {
                this.ball.draw(elapsedTimeS);
                const score = this.ball.checkCollision(this.paddleL, this.paddleR);
            this.resetBall(score);
        }
        }

        // console.log(`\nupdatequeue:`);
        // this.updateQueue.forEach((item)=>{
        //     console.log(`timestamp: ${item.timestamp}`);
        // })
        
        
        // this.paddleL.draw(this.ctx, this.colorBlack, elapsed, this.width, this.height);
        // this.paddleR.draw(this.ctx, this.colorBlack, elapsed, this.width, this.height);
        // if (!this.scoreBreak && this.runningGame && !this.paused) {
        //     this.ball.draw(this.ctx, this.colorBlack, elapsed, this.width, this.height);
        //     const score = this.ball.checkCollision(this.paddleL, this.paddleR);
        //     this.resetBall(score);
        // }

        // this.paddleL.draw(this.ctx, this.colorBlack, elapsed, this.width, this.height);
        // this.paddleR.draw(this.ctx, this.colorBlack, elapsed, this.width, this.height);
        // if (!this.scoreBreak && this.runningGame && !this.paused) {
        //     this.ball.draw(this.ctx, this.colorBlack, elapsed, this.width, this.height);
        //     const score = this.ball.checkCollision(this.paddleL, this.paddleR);
        //     this.resetBall(score);
        // }
        
        // return !this.paused && this.runningGame;
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
