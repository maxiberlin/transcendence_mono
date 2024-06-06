// export class DrawObjRemote {
//     /**
//      *
//      * @param {number} w
//      * @param {number} h
//      * @param settings
//      */
//     constructor(w, h, settings) {
//         this.scale.w = w;
//         this.scale.h = h;

//         this.x_start = 0;
//         this.y_start = 0;
//         this.w = 0;
//         this.w_half = 0;
//         this.h = 0;
//         this.h_half = 0;
//         this.dx = 0;
//         this.dy = 0;
//         /** @type {PongGameTypes.GameSettingsRemote} */
//         this.settings = settings;
//         this.dir = 0;

//         this.serverPos = {
//             x: 0,
//             y: 0,
//         };
//     }

//     scale = {
//         x: 0,
//         y: 0,
//         w: 0,
//         h: 0,
//         scale_x: 0,
//         scale_y: 0,
//     };

//     get x_center() {
//         return this.x_start + this.w_half;
//     }

//     get y_center() {
//         return this.y_start + this.h_half;
//     }

//     get x_end() {
//         return this.x_start + this.w;
//     }

//     get y_end() {
//         return this.y_start + this.h;
//     }

//     printt() {
//         // console.log(this.x_start);
//         // console.log(this.y_start);
//         // console.log(this.w);
//         // console.log(this.h);
//         // console.log(this.w_half);
//         // console.log(this.h_half);
//     }

//     setScale(scaleX, scaleY) {
//         this.scale.scale_x = scaleX;
//         this.scale.scale_y = scaleY;

//         this.x_start = this.scale.x * scaleX;
//         this.y_start = this.scale.y * scaleY;
//         this.w = this.scale.w * scaleX;
//         this.w_half = this.w / 2.0;
//         this.h = this.scale.h * scaleY;
//         this.h_half = this.h / 2.0;
//     }

//     newUpdateTime = 0;

//     /**
//      * @param {PongGameTypes.GameObj} gameObj
//      */
//     updatePos(gameObj) {
//         this.scale.x = gameObj.x;
//         this.scale.y = gameObj.y;
//         this.serverPos.x = gameObj.x;
//         this.serverPos.y = gameObj.y;
//         if (this.serverPos.x === 0) this.x_start = gameObj.x;
//         if (this.serverPos.y === 0) this.y_start = gameObj.y;

//         this.x_start = gameObj.x * this.scale.scale_x;
//         this.y_start = gameObj.y * this.scale.scale_y;

//         this.dx = gameObj.dx;
//         this.dy = gameObj.dy;
//         this.dir = gameObj.direction ?? 0;
//         this.newUpdateTime = this.settings.tick_duration;
//     }

//     lerp(start, end, time) {
//         return start * (1 - time) + end * time;
//     }

//     /**
//      *
//      * @param {number} elapsed
//      * @param ball
//      */
//     update(elapsed, ball) {
//         // if (this.newUpdateTime > 0) { // use linear interpolation
//         //     this.x_start = this.lerp(this.x_start, this.serverPos.x, elapsed / this.settings.tick_duration);
//         //     this.y_start = this.lerp(this.y_start, this.serverPos.y, elapsed / this.settings.tick_duration);
//         //     this.newUpdateTime -= elapsed;
//         //     console.log("new update time: ", this.newUpdateTime);
//         // } else { // do not use linear interpolation
//         //     this.x_start = this.serverPos.x;
//         //     this.y_start = this.serverPos.y;
//         // }
//         // const sp = ball ? this.settings.ball_speed : this.settings.paddle_speed * this.dir;
//         // const xx = Math.trunc(((this.dx * (elapsed) * sp) / this.settings.width) * this.scale.scale_x);
//         // const yy = Math.trunc(((this.dy * (elapsed) * sp) / this.settings.height) * this.scale.scale_y);
//         // this.x_start = this.x_start + xx;
//         // this.y_start = this.y_start + yy;
//         // if (this.newUpdate) {
//         //     if (this.newUpdateFrames === 0) {
//         //         this.newUpdate = false;
//         //     } else {
//         //         this.x_start =
//         //     }
//         // } else {
//         // }
//         // // console.log("elapsed: ", elapsed)
//         // const sp = ball ? this.settings.ball_speed : this.settings.paddle_speed * this.dir;
//         // // console.log("ball?: ", ball, " | speed: ", sp);
//         // // const xx = Math.floor(((this.dx * (elapsed) * sp) / this.settings.width) * this.scale.scale_x);
//         // // const yy = Math.floor(((this.dy * (elapsed) * sp) / this.settings.height) * this.scale.scale_y);
//         // // const xx = Math.trunc((((this.scale.x * this.settings.width) + this.dx * (elapsed) * sp) / this.settings.width) * this.scale.scale_x);
//         // // const yy = Math.trunc((((this.scale.y * this.settings.height) + this.dy * (elapsed) * sp) / this.settings.height) * this.scale.scale_y);
//         // // // console.log("xx: ", xx);
//         // // // console.log("yy: ", yy);
//         // // this.x_start = xx;
//         // // this.y_start = yy;
//         // const xx = Math.trunc(((this.dx * (elapsed) * sp) / this.settings.width) * this.scale.scale_x);
//         // const yy = Math.trunc(((this.dy * (elapsed) * sp) / this.settings.height) * this.scale.scale_y);
//         // this.x_start = this.x_start + xx;
//         // // // // console.log("updated x: ", this.x_start)
//         // this.y_start = this.y_start + yy;
//         // // // console.log("updated y: ", this.y_start)
//     }

//     /**
//      *
//      * @param {CanvasRenderingContext2D} ctx
//      * @param {string} color
//      * @param elapsed
//      * @param ball
//      * @returns
//      */
//     draw(ctx, color, elapsed, ball) {
//         if (!ctx) return;
//         this.update(elapsed, ball);
//         ctx.fillStyle = color;
//         ctx.fillRect(this.x_start, this.y_start, this.w, this.h);
//     }
// }

// class GameCourtRemote {
//     // constructor(x, y, w, h, borderW, borderH, initialScale_x, initialScale_y) {
//     /**
//      * @param {number} borderWidth
//      * @param {number} borderHeight
//      */
//     constructor(borderWidth, borderHeight) {
//         this.bW_unscaled = borderWidth;
//         this.bH_unscaled = borderHeight;
//         this.bW = 0;
//         this.bH = 0;
//         this.x = 0;
//         this.y = 0;
//         this.w = 0;
//         this.h = 0;
//         this.x_center = 0;

//         this.scoreL = 0;
//         this.scoreR = 0;
//         this.runningGame = false;
//     }

//     #textHeight = 70;

//     setScale(newWidth, newHeight) {
//         this.bW = this.bW_unscaled * newWidth;
//         this.bH = this.bH_unscaled * newHeight;
//         this.x = 0;
//         this.y = this.bH;
//         this.w = newWidth;
//         this.h = newHeight - 2 * this.bH;
//         this.x_center = this.x + Math.floor(this.w / 2);
//     }

//     draw(ctx, colorWhite, colorBlack) {
//         ctx.fillStyle = colorWhite;
//         ctx.fillRect(this.x, this.y, this.w, this.h);
//         ctx.strokeStyle = colorBlack;
//         ctx.lineWidth = this.bW;
//         ctx.beginPath();
//         ctx.setLineDash([this.bH, this.bH]);
//         ctx.moveTo(this.x_center, this.y + this.bH / 2.0);
//         ctx.lineTo(this.x_center, this.y + this.h);
//         ctx.stroke();

//         ctx.fillStyle = colorBlack;
//         ctx.font = `${this.#textHeight}px sans-serif`;
//         ctx.textAlign = 'right';
//         ctx.fillText(
//             this.scoreL,
//             this.x_center - this.bH,
//             this.bH + this.#textHeight,
//         );
//         ctx.textAlign = 'left';
//         ctx.fillText(
//             this.scoreR,
//             this.x_center + this.bH,
//             this.bH + this.#textHeight,
//         );
//     }
// }

// export class PongRemote {
//     /** @param {import('../../../../exchange/game_msg.js').WorkerDataInit} d */
//     constructor(d) {
//         // // console.log("constructor Pong!");

//         this.canvas = d.canvas;
//         this.ctx = this.canvas.getContext('2d');
//         if (!this.ctx) {
//             // postMessage(msg_to_main.error);
//             return;
//         }

//         this.width = this.canvas.width;
//         this.height = this.canvas.height;

//         this.colorWhite = '#FFF';
//         this.colorBlack = '#000';
//     }

//     /**
//      * @param {PongGameTypes.GameSettingsRemote} gameSettings
//      */
//     initGameObjects(gameSettings) {
//         this.settings = gameSettings;

//         // console.log("init game objects: ", gameSettings)
//         this.gamePlane = new GameCourtRemote(
//             gameSettings.border_width,
//             gameSettings.border_height,
//         );
//         this.gamePlane.setScale(this.width, this.height);
//         /** @type {DrawObjRemote} */
//         this.paddleL = new DrawObjRemote(
//             gameSettings.paddle_width,
//             gameSettings.paddle_height,
//             gameSettings,
//         );
//         this.paddleL.setScale(this.width, this.height);
//         /** @type {DrawObjRemote} */
//         this.paddleR = new DrawObjRemote(
//             gameSettings.paddle_width,
//             gameSettings.paddle_height,
//             gameSettings,
//         );
//         this.paddleR.setScale(this.width, this.height);
//         /** @type {DrawObjRemote} */
//         this.ball = new DrawObjRemote(
//             gameSettings.ball_width,
//             gameSettings.ball_height,
//             gameSettings,
//         );
//         this.ball.setScale(this.width, this.height);

//         // this.startGame()
//     }

//     /**
//      * @param {PongGameTypes.GameState} gamestate
//      */
//     updateGameObjects(gamestate) {
//         this.ball?.updatePos(gamestate.ball);
//         this.paddleL?.updatePos(gamestate.paddle_left);
//         this.paddleR?.updatePos(gamestate.paddle_right);

//         if (!this.currframe)
//             this.currframe = requestAnimationFrame((t) => {
//                 this.render(t);
//             });
//     }

//     startGame() {
//         this.runningGame = true;
//     }

//     /** @param {import('../../../../exchange/game_msg.js').WorkerDataChangeColors} d */
//     changeColor(d) {
//         if (
//             d.colorWhite &&
//             typeof d.colorWhite === 'string' &&
//             d.colorBlack &&
//             typeof d.colorBlack === 'string'
//         ) {
//             this.colorWhite = d.colorWhite;
//             this.colorBlack = d.colorBlack;
//         }
//     }

//     /** @param {import('../../../../exchange/game_msg.js').WorkerDataResize} d */
//     setCanvasSizes(d) {
//         if (!this.ctx) return;
//         this.width = d.width;
//         this.height = d.height;
//         this.ctx.canvas.width = Math.floor(this.width * d.dpr);
//         this.ctx.canvas.height = Math.floor(this.height * d.dpr);
//         this.ctx.scale(d.dpr, d.dpr);
//         this.gamePlane?.setScale(this.width, this.height);
//         this.ball?.setScale(this.width, this.height);
//         this.paddleL?.setScale(this.width, this.height);
//         this.paddleR?.setScale(this.width, this.height);
//     }

//     prevTimeStamp = 0;

//     currframe;

//     render(timeStamp) {
//         if (
//             !this.width ||
//             !this.height ||
//             !this.colorBlack ||
//             !this.colorWhite ||
//             !this.ctx ||
//             !this.gamePlane ||
//             !this.ball ||
//             !this.paddleL ||
//             !this.paddleR
//         ) {
//             return;
//         }
//         if (this.prevTimeStamp === undefined) this.prevTimeStamp = timeStamp;
//         const elapsed = Math.floor(timeStamp - this.prevTimeStamp) / 1000;
//         this.prevTimeStamp = timeStamp;

//         this.ctx.fillStyle = this.colorBlack;
//         this.ctx.fillRect(0, 0, this.width, this.height);
//         this.gamePlane?.draw(this.ctx, this.colorWhite, this.colorBlack);

//         this.paddleL.draw(this.ctx, this.colorBlack, elapsed, false);
//         this.paddleR.draw(this.ctx, this.colorBlack, elapsed, false);
//         this.ball.draw(this.ctx, this.colorBlack, elapsed, true);
//         if (this.runningGame) {
//             this.currframe = requestAnimationFrame((t) => {
//                 this.render(t);
//             });
//         } else {
//             this.currframe = undefined;
//         }
//     }
// }

// /**
//  * @param {(elapsedTimeMs: number) => boolean | undefined} callback
//  */
// const useFrame = (callback) => {
//     if (typeof callback !== 'function') throw new Error('invalid callback');
//     let prevTimeStamp;
//     let currFrame;
//     const renderFunc = (timeStamp) => {
//         // console.log("render! currFrame: ", currFrame);
//         if (prevTimeStamp === undefined) prevTimeStamp = timeStamp;
//         const elapsed = Math.floor(timeStamp - prevTimeStamp) / 1000;
//         prevTimeStamp = timeStamp;
//         if (callback(elapsed)) {
//             currFrame = requestAnimationFrame(renderFunc);
//         } else {
//             currFrame = undefined;
//             prevTimeStamp = undefined;
//         }
//     };
//     const startRender = () => {
//         if (currFrame) return;
//         console.log('request animation frame!');
//         currFrame = requestAnimationFrame(renderFunc);
//     };
//     const stopRender = () => {
//         if (!currFrame) return;
//         cancelAnimationFrame(currFrame);
//         currFrame = undefined;
//         prevTimeStamp = undefined;
//     };

//     const resetTime = () => {
//         prevTimeStamp = undefined;
//     };

//     return {
//         startRender,
//         stopRender,
//         resetTime,
//     };
// };
