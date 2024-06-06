// class PongRemote {
//     static GAME_UPDATE = 'GAME_UPDATE';

//     static GAME_START = 'GAME_START';

//     static GAME_END = 'GAME_END';

//     static HIDE_BALL = 'HIDE_BALL';

//     static SHOW_BALL = 'SHOW_BALL';

//     static GAME_ERROR = 'GAME_ERROR';

//     static GAME_PAUSE = 'GAME_PAUSE';

//     static GAME_RESUME = 'GAME_RESUME';

//     static PLAYER_CONNECTED = 'PLAYER_CONNECTED';

//     static PLAYER_DISCONNECTED = 'PLAYER_DISCONNECTED';

//     static PLAYER_MOVE = 'PLAYER_MOVE';

//     static START_GAME_REQUEST = 'START_GAME_REQUEST';

//     static PAUSE_GAME_REQUEST = 'PAUSE_GAME_REQUEST';

//     static RESUME_GAME_REQUEST = 'RESUME_GAME_REQUEST';

//     static LEAVE_GAME = 'LEAVE_GAME';

//     static RESET_SCORES_REQUEST = 'RESET_SCORES_REQUEST';

//     constructor() {}
// }

// class GameUpdate {
//     /**
//      * @param {ArrayBuffer} buffer
//      */
//     constructor(buffer) {
//         const view = new DataView(buffer);

//         this.ball_x = view.getInt16(0) / 1000; // x (fixed-point, scaled by 1000)
//         this.ball_y = view.getInt16(2) / 1000; // y (fixed-point, scaled by 1000)
//         this.ball_dx = view.getInt16(4); // dx
//         this.ball_dy = view.getInt16(6); // dy

//         this.paddle_left_x = view.getInt16(8) / 1000; // x (fixed-point, scaled by 1000)
//         this.paddle_left_y = view.getInt16(10) / 1000; // y (fixed-point, scaled by 1000)
//         this.paddle_left_dx = view.getInt16(12); // dx
//         this.paddle_left_dy = view.getInt16(14); // dy
//         this.paddle_left_direction = view.getInt8(16); // direction

//         this.paddle_right_x = view.getInt16(17) / 1000; // x (fixed-point, scaled by 1000)
//         this.paddle_right_y = view.getInt16(19) / 1000; // y (fixed-point, scaled by 1000)
//         this.paddle_right_dx = view.getInt16(21); // dx
//         this.paddle_right_dy = view.getInt16(23); // dy
//         this.paddle_right_direction = view.getInt8(25); // direction

//         this.score_left = view.getInt8(26); // left score
//         this.score_right = view.getInt8(27); // right score
//     }
// }

// class PongGame {
//     /**
//      * @param {HTMLCanvasElement} canvas
//      * @param {object} settings
//      */
//     constructor(canvas, settings) {
//         this.canvas = canvas;
//         this.ctx = this.canvas.getContext('2d');
//         this.settings = settings;
//         this.ball = new GameObject(settings.ball_width, settings.ball_height);
//         this.paddleL = new GameObject(
//             settings.paddle_width,
//             settings.paddle_height,
//         );
//         this.paddleR = new GameObject(
//             settings.paddle_width,
//             settings.paddle_height,
//         );
//         this.scoreL = 0;
//         this.scoreR = 0;
//         this.running = false;
//         this.prevTimestamp = 0;
//         this.renderer = new GameRenderer(
//             this.ctx,
//             this.canvas.width,
//             this.canvas.height,
//             settings,
//         );
//         this.updateInterval = 0.05; // 50 ms as default server update interval
//         this.timeSinceLastUpdate = 0;
//         this.updateObjectScales();
//     }

//     /**
//      * @returns {void}
//      */
//     start() {
//         this.running = true;
//         this.prevTimestamp = 0;
//         requestAnimationFrame(this.render.bind(this));
//     }

//     /**
//      * @returns {void}
//      */
//     stop() {
//         this.running = false;
//     }

//     /**
//      * @param {ArrayBuffer} buffer
//      * @returns {void}
//      */
//     updateGameState(buffer) {
//         const gameUpdate = new GameUpdate(buffer);
//         this.ball.setPosition(gameUpdate.ball_x, gameUpdate.ball_y);
//         this.ball.setVelocity(gameUpdate.ball_dx, gameUpdate.ball_dy);
//         this.paddleL.setPosition(
//             gameUpdate.paddle_left_x,
//             gameUpdate.paddle_left_y,
//         );
//         this.paddleL.setVelocity(
//             gameUpdate.paddle_left_dx,
//             gameUpdate.paddle_left_dy,
//         );
//         this.paddleL.setDirection(gameUpdate.paddle_left_direction);
//         this.paddleR.setPosition(
//             gameUpdate.paddle_right_x,
//             gameUpdate.paddle_right_y,
//         );
//         this.paddleR.setVelocity(
//             gameUpdate.paddle_right_dx,
//             gameUpdate.paddle_right_dy,
//         );
//         this.paddleR.setDirection(gameUpdate.paddle_right_direction);
//         this.scoreL = gameUpdate.score_left;
//         this.scoreR = gameUpdate.score_right;
//         this.updateObjectScales();
//         this.timeSinceLastUpdate = 0;
//     }

//     /**
//      * @param {number} newWidth
//      * @param {number} newHeight
//      * @returns {void}
//      */
//     resizeCanvas(newWidth, newHeight) {
//         this.canvas.width = newWidth;
//         this.canvas.height = newHeight;
//         this.renderer.updateSize(newWidth, newHeight);
//         this.updateObjectScales();
//     }

//     /**
//      * @returns {void}
//      */
//     updateObjectScales() {
//         this.ball.updateScale(this.canvas.width, this.canvas.height);
//         this.paddleL.updateScale(this.canvas.width, this.canvas.height);
//         this.paddleR.updateScale(this.canvas.width, this.canvas.height);
//     }

//     /**
//      * @param {number} timestamp
//      * @returns {void}
//      */
//     render(timestamp) {
//         if (!this.running) return;
//         const elapsed =
//             (this.prevTimestamp ? timestamp - this.prevTimestamp : 0) / 1000;
//         this.prevTimestamp = timestamp;
//         this.timeSinceLastUpdate += elapsed;

//         this.renderer.clear();
//         this.renderer.drawCourt(this.scoreL, this.scoreR);
//         this.renderer.drawObject(
//             this.ball,
//             this.timeSinceLastUpdate,
//             this.updateInterval,
//             true,
//         );
//         this.renderer.drawObject(
//             this.paddleL,
//             this.timeSinceLastUpdate,
//             this.updateInterval,
//             false,
//         );
//         this.renderer.drawObject(
//             this.paddleR,
//             this.timeSinceLastUpdate,
//             this.updateInterval,
//             false,
//         );

//         requestAnimationFrame(this.render.bind(this));
//     }
// }

// class GameObject {
//     /**
//      * @param {number} width
//      * @param {number} height
//      */
//     constructor(width, height) {
//         this.width = width;
//         this.height = height;
//         this.x = 0;
//         this.y = 0;
//         this.dx = 0;
//         this.dy = 0;
//         this.direction = 0;
//         this.trueX = 0;
//         this.trueY = 0;
//     }

//     /**
//      * @param {number} x
//      * @param {number} y
//      * @returns {void}
//      */
//     setPosition(x, y) {
//         this.x = x;
//         this.y = y;
//     }

//     /**
//      * @param {number} dx
//      * @param {number} dy
//      * @returns {void}
//      */
//     setVelocity(dx, dy) {
//         this.dx = dx;
//         this.dy = dy;
//     }

//     /**
//      * @param {number} direction
//      * @returns {void}
//      */
//     setDirection(direction) {
//         this.direction = direction;
//     }

//     /**
//      * @param {number} canvasWidth
//      * @param {number} canvasHeight
//      * @returns {void}
//      */
//     updateScale(canvasWidth, canvasHeight) {
//         this.trueX = this.x * canvasWidth;
//         this.trueY = this.y * canvasHeight;
//         this.trueWidth = this.width * canvasWidth;
//         this.trueHeight = this.height * canvasHeight;
//     }

//     /**
//      * @param {number} elapsed
//      * @param {number} updateInterval
//      * @param {boolean} isBall
//      * @param {object} settings
//      * @returns {void}
//      */
//     interpolate(elapsed, updateInterval, isBall, settings) {
//         const speed =
//             isBall ?
//                 settings.ball_speed
//             :   settings.paddle_speed * this.direction;
//         const timeFactor = Math.min(elapsed / updateInterval, 1);
//         this.trueX += this.dx * speed * timeFactor * settings.width;
//         this.trueY += this.dy * speed * timeFactor * settings.height;
//     }
// }

// class GameRenderer {
//     /**
//      * @param {CanvasRenderingContext2D} ctx
//      * @param {number} width
//      * @param {number} height
//      * @param {object} settings
//      */
//     constructor(ctx, width, height, settings) {
//         this.ctx = ctx;
//         this.width = width;
//         this.height = height;
//         this.settings = settings;
//         this.borderWidth = 10;
//         this.borderHeight = 10;
//         this.textHeight = 70;
//     }

//     /**
//      * @param {number} newWidth
//      * @param {number} newHeight
//      */
//     updateSize(newWidth, newHeight) {
//         this.width = newWidth;
//         this.height = newHeight;
//     }

//     clear() {
//         this.ctx.fillStyle = '#000';
//         this.ctx.fillRect(0, 0, this.width, this.height);
//     }

//     /**
//      * @param {number} scoreL
//      * @param {number} scoreR
//      * @returns {void}
//      */
//     drawCourt(scoreL, scoreR) {
//         this.ctx.fillStyle = '#FFF';
//         this.ctx.fillRect(
//             this.borderWidth,
//             this.borderHeight,
//             this.width - 2 * this.borderWidth,
//             this.height - 2 * this.borderHeight,
//         );

//         this.ctx.strokeStyle = '#000';
//         this.ctx.lineWidth = this.borderWidth;
//         this.ctx.beginPath();
//         this.ctx.setLineDash([this.borderHeight, this.borderHeight]);
//         this.ctx.moveTo(this.width / 2, this.borderHeight);
//         this.ctx.lineTo(this.width / 2, this.height - this.borderHeight);
//         this.ctx.stroke();

//         this.ctx.fillStyle = '#000';
//         this.ctx.font = `${this.textHeight}px sans-serif`;
//         this.ctx.textAlign = 'right';
//         this.ctx.fillText(
//             scoreL.toString(),
//             this.width / 2 - this.borderWidth,
//             this.borderHeight + this.textHeight,
//         );
//         this.ctx.textAlign = 'left';
//         this.ctx.fillText(
//             scoreR.toString(),
//             this.width / 2 + this.borderWidth,
//             this.borderHeight + this.textHeight,
//         );
//     }

//     /**
//      * @param {GameObject} obj
//      * @param {number} elapsed
//      * @param {number} updateInterval
//      * @param {boolean} isBall
//      * @returns {void}
//      */
//     drawObject(obj, elapsed, updateInterval, isBall) {
//         obj.interpolate(elapsed, updateInterval, isBall, this.settings);
//         this.ctx.fillStyle = '#000';
//         this.ctx.fillRect(obj.trueX, obj.trueY, obj.trueWidth, obj.trueHeight);
//     }
// }
