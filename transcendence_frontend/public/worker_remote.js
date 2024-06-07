// worker_remote.js


export class DrawObjRemote {
    /**
     * 
     * @param {number} w
     * @param {number} h
     */
    constructor(x, y, dx, dy, w, h) {
        this.x_start = x;
        this.y_start = y;
        this.w = w;
        this.w_half = w / 2;
        this.h = h;
        this.h_half = h / 2;
        this.dx = dx;
        this.dy = dy;
    }

    get x_center()     { return this.x_start + this.w_half }
    get y_center()     { return this.y_start + this.h_half }
    get x_end()        { return this.x_start + this.w }
    get y_end()        { return this.y_start + this.h }
    printt() {
        console.log("x_start: ", this.x_start);
        console.log("y_start: ", this.y_start);
        console.log("dx: ", this.dx);
        console.log("dy: ", this.dy);
        console.log("w: ", this.w);
        console.log("h: ", this.h);
        console.log("w_half: ", this.w_half);
        console.log("h_half: ", this.h_half);
    }

    newUpdateTime = 0;

    /**
     * @param {PongGameTypes.GameObj} gameObj
     */
    updatePos(gameObj) {
        this.x_start = gameObj.x;
        this.y_start = gameObj.y;
        this.dx = gameObj.dx;
        this.dy = gameObj.dy;
    }

    
    /**
     * 
     * @param {number} elapsed 
     */
    update(elapsed, ball) {

        // if (this.newUpdateTime > 0) { // use linear interpolation
        //     this.x_start = this.lerp(this.x_start, this.serverPos.x, elapsed / this.settings.tick_duration);
        //     this.y_start = this.lerp(this.y_start, this.serverPos.y, elapsed / this.settings.tick_duration);
        //     this.newUpdateTime -= elapsed;
        //     console.log("new update time: ", this.newUpdateTime);
        // } else { // do not use linear interpolation
        //     this.x_start = this.serverPos.x;
        //     this.y_start = this.serverPos.y;
        // }

        // const sp = ball ? this.settings.ball_speed : this.settings.paddle_speed * this.dir;
        // const xx = Math.trunc(((this.dx * (elapsed) * sp) / this.settings.width) * this.scale.scale_x);
        // const yy = Math.trunc(((this.dy * (elapsed) * sp) / this.settings.height) * this.scale.scale_y);
        // this.x_start = this.x_start + xx;
        // this.y_start = this.y_start + yy;

        // if (this.newUpdate) {
        //     if (this.newUpdateFrames === 0) {
        //         this.newUpdate = false;
        //     } else {
        //         this.x_start = 
        //     }

        // } else {

        // }

        // // console.log("elapsed: ", elapsed)

        // const sp = ball ? this.settings.ball_speed : this.settings.paddle_speed * this.dir;
        // // console.log("ball?: ", ball, " | speed: ", sp);
        // // const xx = Math.floor(((this.dx * (elapsed) * sp) / this.settings.width) * this.scale.scale_x);
        // // const yy = Math.floor(((this.dy * (elapsed) * sp) / this.settings.height) * this.scale.scale_y);
        // // const xx = Math.trunc((((this.scale.x * this.settings.width) + this.dx * (elapsed) * sp) / this.settings.width) * this.scale.scale_x);
        // // const yy = Math.trunc((((this.scale.y * this.settings.height) + this.dy * (elapsed) * sp) / this.settings.height) * this.scale.scale_y);
        // // // console.log("xx: ", xx);
        // // // console.log("yy: ", yy);

        // // this.x_start = xx;
        // // this.y_start = yy;

        // const xx = Math.trunc(((this.dx * (elapsed) * sp) / this.settings.width) * this.scale.scale_x);
        // const yy = Math.trunc(((this.dy * (elapsed) * sp) / this.settings.height) * this.scale.scale_y);
        // this.x_start = this.x_start + xx;
        // // // // console.log("updated x: ", this.x_start)
        // this.y_start = this.y_start + yy;
        // // // console.log("updated y: ", this.y_start)
    }

    /**
     * @param {OffscreenCanvasRenderingContext2D} ctx
     * @param {string} color
     * @param {number} scale_x
     * @param {number} scale_y
     * @returns {{x: number, y: number, w: number, h: number}}
     * */
    draw(ctx, color, elapsed, ball, scale_x, scale_y) {
        // console.log("draw");
        // console.log("scales: x: ", scale_x, "y: ", scale_y);
        // this.printt();
        const data = {
            x: this.x_start * scale_x,
            y: this.y_start * scale_y,
            w: this.w * scale_x,
            h: this.h * scale_y
        }
        if (ctx) {
            // this.update(elapsed, ball);
            ctx.fillStyle = color;
            // console.log("draw rect: ", "x: ", this.x_start * scale_x, "y: ", this.y_start * scale_y, "w: ", this.w * scale_x, "h: ", this.h * scale_y);
            
            ctx.fillRect(data.x, data.y, data.w, data.h );
        }
        return data;
    }
}


class GameCourtRemote extends DrawObjRemote {
    /** @param {PongRemoteServerMsgTypes.GameSettings} settings */
    constructor(settings) {
        super(0, settings.border_height, 0, 0, 1.0, 1.0 - settings.border_height * 2.0);
        this.scoreL = 0;
        this.scoreR = 0;
        this.border_width = settings.border_width;
        this.border_height = settings.border_height;
    }
    #textHeight = 70;

    /**
     * @param {OffscreenCanvasRenderingContext2D} ctx
     * @param {string} colorWhite
     * @param {string} colorBlack
     * @param {number} scale_x
     * @param {number} scale_y
     * @returns {{x: number, y: number, w: number, h: number}}
     * @override
     * */
    draw(ctx, colorWhite, colorBlack, scale_x, scale_y) {

        const data = super.draw(ctx, colorWhite, 0, false, scale_x, scale_y);

        const border_width_x_start = this.border_width * scale_x;
        const border_height_y_start = this.border_height * scale_y;
        const x_center = data.w / 2.0;
        const text_size = this.#textHeight * scale_y;

        // console.log("border data: ", {border_width_x_start, border_height_y_start, x_center, text_size});
        ctx.strokeStyle = colorBlack;
        ctx.lineWidth = border_width_x_start;
        ctx.beginPath();
        ctx.setLineDash([border_height_y_start, border_height_y_start]);
        ctx.moveTo(x_center, border_height_y_start * 1.5);
        ctx.lineTo(x_center, border_height_y_start + this.h * scale_y);
        ctx.stroke();
        ctx.fillStyle = colorBlack;
        ctx.font = this.#textHeight + "px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(this.scoreL.toString(), x_center - border_width_x_start, border_height_y_start + text_size);
        ctx.textAlign = "left";
        ctx.fillText(this.scoreR.toString(), x_center + border_width_x_start, border_height_y_start + text_size);
        return data;
    }
};



export class PongRemote {
    /** @param {GameWorkerTypes.Create} d */
    constructor(d) {
        console.log("PongRemote constructor: ", d);
        this.canvas = d.canvas;
        this.ctx = this.canvas.getContext("2d");
        if (!this.ctx) return ;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.colorWhite = "#FFF";
        this.colorBlack = "#000";

        
    }
    serverStamps = {
        last: 0,
        curr: 0,
        currDelta: 0,
        lastDelta: 0,
        deltaDiff: 0
    }

    /** @param {GameWorkerTypes.GameWorkerInit} initMsg */
    initGameObjects(initMsg) {
        console.log("init game objects: ", initMsg);
        this.settings = initMsg.settings;
        this.gamePlane = new GameCourtRemote(this.settings);
        this.paddleL = new DrawObjRemote(
            initMsg.state.paddle_left.x, initMsg.state.paddle_left.y,
            initMsg.state.paddle_left.dx, initMsg.state.paddle_left.dy,
            this.settings.paddle_width, this.settings.paddle_height
        );
        this.paddleR = new DrawObjRemote(
            initMsg.state.paddle_right.x, initMsg.state.paddle_right.y,
            initMsg.state.paddle_right.dx, initMsg.state.paddle_right.dy,
            this.settings.paddle_width, this.settings.paddle_height
        );
        this.ball = new DrawObjRemote(
            initMsg.state.ball.x, initMsg.state.ball.y,
            initMsg.state.ball.dx, initMsg.state.ball.dy,
            this.settings.ball_width, this.settings.ball_height
        );

        if (!this.currframe)
            this.currframe = requestAnimationFrame((t)=>{this.render(t)});
    }

    prevArrived = 0;
    /** @param {GameWorkerTypes.GameWorkerUpdatePos} gamestate */
     updateGameObjects(gamestate) {
        // console.log("update game objects: ", gamestate)
        // console.log("performance.timeOrigin: ", performance.timeOrigin);
        // console.log("server timestamp: ", gamestate.state.timestamp - performance.timeOrigin);
        // console.log("client timestamp: ", performance.now());
        // console.log("time diff in ms: ", performance.now() - (gamestate.state.timestamp - performance.timeOrigin));

        this.serverStamps.curr = gamestate.state.timestamp - performance.timeOrigin;
        
        this.serverStamps.currDelta = this.serverStamps.curr - this.serverStamps.last;
        this.serverStamps.deltaDiff = this.serverStamps.currDelta - this.serverStamps.lastDelta;
        
        if (this.settings?.tick_duration && this.serverStamps.deltaDiff > 0.1 * this.settings.tick_duration) {
            console.log("serverStamps delta diff: ", this.serverStamps.deltaDiff);
            console.log("server debug: ", gamestate.state.debug);
        }


        this.serverStamps.lastDelta = this.serverStamps.currDelta;
        this.serverStamps.last = this.serverStamps.curr;



        this.ball?.updatePos(gamestate.state.ball)
        this.paddleL?.updatePos(gamestate.state.paddle_left)
        this.paddleR?.updatePos(gamestate.state.paddle_right)


        // if (!this.currframe)
        //     this.currframe = requestAnimationFrame((t)=>{this.render(t)});
    }

    startGame() {
        console.log("start game!");
        this.runningGame = true;
    }

    /** @param {GameWorkerTypes.GameWorkerChangeColor} d */
    changeColor(d) {
        console.log("changeColor: ", d);
        if (d.colorWhite && typeof d.colorWhite === "string" && d.colorBlack && typeof d.colorBlack === "string") {
            this.colorWhite = d.colorWhite;
            this.colorBlack = d.colorBlack;
        }
    }

    /** @param {GameWorkerTypes.GameWorkerResize} d */
    setCanvasSize(d) {
        console.log("setCanvasSize: ", d);
        if (!this.ctx) return ;
        this.width = d.width;
        this.height = d.height
        this.ctx.canvas.width = Math.floor(this.width * d.dpr);
        this.ctx.canvas.height = Math.floor(this.height * d.dpr);
        this.ctx.scale(d.dpr, d.dpr);
    }

    prevTimeStamp = 0;
    currframe;
    render(timeStamp) {
        // console.log("rendering!")
        if (!this.width|| !this.height || !this.colorBlack || !this.colorWhite || !this.ctx || !this.gamePlane || !this.ball || !this.paddleL || !this.paddleR) {
            return ;
        }
        // console.log("rendering! real")
        if (this.prevTimeStamp === undefined) this.prevTimeStamp = timeStamp;
        const elapsed = Math.floor(timeStamp - this.prevTimeStamp) / 1000;
        this.prevTimeStamp = timeStamp;

        this.ctx.fillStyle = this.colorBlack;
        this.ctx.fillRect(0,0,this.width, this.height);
        // console.log("draw game plane!");
        this.gamePlane?.draw(this.ctx, this.colorWhite, this.colorBlack, this.width, this.height);
        
        this.paddleL.draw(this.ctx, this.colorBlack, elapsed, false, this.width, this.height)
        // console.log("draw paddleL!");
        this.paddleR.draw(this.ctx, this.colorBlack, elapsed, false, this.width, this.height)
        // console.log("draw paddleR!");
        this.ball.draw(this.ctx, this.colorBlack, elapsed, true, this.width, this.height)
        // console.log("draw ball!");
        this.currframe = requestAnimationFrame((t)=>{this.render(t)});
        // if (this.runningGame) {
        //     this.currframe = requestAnimationFrame((t)=>{this.render(t)});
        // } else {
        //     this.currframe = undefined;
        // }
    }

}


/** @type {PongRemote | undefined} */
let game;

/** @param {MessageEvent} ev */
onmessage = (ev) => {
    /** @type {GameWorkerTypes.GameWorkerMessage} */
    const msg = ev.data;
    // console.log("onmessage: ");
    // console.dir( ev.data)
    switch (msg.message) {
        case "worker_game_create":
            game = new PongRemote(msg);
            break;
        case "worker_game_init":
            game?.initGameObjects(msg);
            break;
        case "worker_game_start":
            game?.startGame()
            break;
        case "worker_game_quit":
            game = undefined;
            break;
        case "worker_game_terminate":
            break;
        case "worker_game_pause":
            break;
        case "worker_game_continue":
            break;
        case "worker_game_resize":
            game?.setCanvasSize(msg);
            break;
        case "worker_game_change_color":
            game?.changeColor(msg);
            break;
        case "worker_game_update_pos":
            game?.updateGameObjects(msg);
            break;
        
    }
};

