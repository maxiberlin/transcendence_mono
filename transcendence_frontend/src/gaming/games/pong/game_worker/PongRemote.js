import { PongObjManager } from './PongObjManager';
import { getSocketErrorMessage, printCommandResponse, pushMessageToMainThread, ServerMessageMap, useMedian, WebsocketErrorCode } from './utils';
import { Pong } from './Pong';


export class PongRemote extends Pong {
    /** @param {ToWorkerGameMessageTypes.Create} d  */
    constructor(d) {
        if (!d.socketUrl) throw new Error('no socket url provided');
        super(d.offscreencanvas, true, d.userId);
        
        try {
            this.#socket = new WebSocket(d.socketUrl);
            this.#socket.onmessage = e => {
                try {
                    // console.log("msg socket: ", e.data);
                    /** @type {PongTypes.GeneralServerMessage} */
                    const message = JSON.parse(e.data);
                     /** @type {PongTypes.ServerMessageCallback<any> | undefined} */
                    let func;
                    if ('tag' in message) {
                        func = this.#messageHandlerMap.getHandler(message.tag);
                        if (message.tag !== "server-game-update" && message.tag !== "pong")
                            console.log('NEW SERVER BROASCAST: ', message);
                        // console.log('handlerfunc?', func);
                        if (func) func(message);
                    } else if ('cmd' in message) {
                        func = this.#messageHandlerMap.getHandler(message.cmd);
                        if (func) func(message);
                    }
                } catch (error) {
                    console.log('error parsing or handling message: ', error);
                    self.close();
                }

            };
            this.#socket.onerror = e => {this.#onSocketError(e)};
            this.#socket.onclose = e => {this.#onSocketClose(e)};
        } catch (error) {
            console.log('unable to create socket: error: ', error);
            self.close();
        }


        this.#messageHandlerMap.setHandler("server-game-ready", (b) => {
            const interpolationRatio = 4;
            this.#interpolationTimeMs =  (interpolationRatio / b.settings.tick_rate) * 1000;
            // console.log('ready msg, data: ', b);
            // console.log('myuserid: ', this.manager.userId);
            this.manager.setSettings(b.settings.max_score, b.settings.point_wait_time_ms, true, b.user_id_left, b.user_id_right);
            this.manager.recreateGameObjects(b.court, b.ball, b.paddle_left, b.paddle_right);
            this.frame.renderAtMostOnce();
        });
        this.#messageHandlerMap.setHandler("server-game-start", (b) => {
            this.#serverGameTime = b.timestamp;
            super.startGame();
            this.#pushCommandToSocket({cmd: "ping", client_timestamp_ms: this.getGameTimeMs()})
        })
        this.#messageHandlerMap.setHandler("server-game-update", (b) => {
            // console.log('ON SERVER UPDATE');
            for (let i = 0; i < b.invalid_ticks; i++) {
                console.log('REMOVE');
                this.#updateQueue.pop()
            }
            this.#updateQueue.push(b);
            this.#updateQueue.sort((upd1, upd2)=>upd1.timestamp - upd2.timestamp)
            this.#recentFrame += 1;
            if (this.#commandNbr % 5 === 0)
                this.#pushCommandToSocket({cmd: "ping", client_timestamp_ms: this.getGameTimeMs()})
        });
        this.#messageHandlerMap.setHandler("pong", (b) => {
            const t1 = b.client_timestamp_ms, t2 = b.server_timestamp_ms, t3 = this.getGameTimeMs()
            this.#serverRTT.addValue((t3 - t1) / 2)
            // this.#interpolationTimeMs = Math.max(60, Math.min(this.#serverRTT.getMedian() * 4, 150));
            this.#interpolationTimeMs = Math.max(60, Math.min(this.#serverRTT.getMedian() * 4, 150));
            console.log('new interp time: ', this.#interpolationTimeMs);
            // console.log('rtt median: ', this.#serverRTT.getMedian());
        })
        this.#messageHandlerMap.setHandler("client-move", (r) => {
            console.log('command-response: ', r);
            const prev = this.#commandStack.get(r.id.toString());
            console.log('command was: ', prev);
        })
        this.#messageHandlerMap.setHandler("server-game-player-scored", (b) => {
            this.manager.makeAction(b.side, "remote-set-score-message-main")
        })
        this.#messageHandlerMap.setHandler("server-game-end", (b) => {
            this.manager.makeAction(b.winner_side, "remote-game-end-message-main-winner-side", b.reason)
            super.quitGame();
        });
    }
    /** @type {Map<string, PongClientTypes.ClientCommand>} */
    #commandStack = new Map();
    #commandNbr = 1;
    /** @type {PongClientTypes.ClientCommand | null} */
    #lastCommand = null;
    /** @type {PongClientTypes.ClientMoveDirection | undefined} */
    #lastMove;
    #serverOffset = useMedian();
    #serverRTT = useMedian();
    #recentFrame = 0;
    #interpolationTimeMs = 100;
    #lastWorkerTimeOnRender = performance.now();

    #serverGameTime = performance.now();
    #messageHandlerMap = new ServerMessageMap();
    /** @type {PongServerTypes.GameUpdate[]} */
    #updateQueue = [];
    /** @type {WebSocket | null} */
    #socket = null;

    
    
 

    /**
     * @param {number} workerCurrentTimeMs 
     * @param {number} workerLastTimeMs 
     * @param {number} elapsedMs 
     * @param {number} serverCurrentTimeMs 
     */
    render = (workerCurrentTimeMs, workerLastTimeMs, elapsedMs, serverCurrentTimeMs) => {
        this.#serverGameTime += elapsedMs;
        this.#lastWorkerTimeOnRender = workerCurrentTimeMs;
        // console.log('elapsed ms: ', elapsedMs);
        const renderTime = this.#serverGameTime - this.#interpolationTimeMs;
        // console.log('render remote');
        // const renderTime = currUnixTimeStampMs - this.interpMs;
        while (this.#updateQueue.length >= 2 && this.#updateQueue[1].timestamp < renderTime) {
            this.#updateQueue.shift();
            // console.log('shift queue');
        }
        if (this.#updateQueue.length >= 2) {
            // console.log('queuelen: ', this.#updateQueue.length);
            const cU = this.#updateQueue[0];
            const nU = this.#updateQueue[1];
            // console.log('interpolate remote');
            const elapsed = (renderTime - cU.timestamp) / (nU.timestamp - cU.timestamp);
            this.manager.ball.interpolate(cU.ball, nU.ball, elapsed);
            this.manager.paddleRight.interpolate(cU.paddle_right, nU.paddle_right, elapsed);
            this.manager.paddleLeft.interpolate(cU.paddle_left, nU.paddle_left, elapsed)
        } else {
            console.log('extrapolate remote');
            // const elapsedSec = elapsedMs / 1000;
            // this.manager.paddleRight.update(elapsedSec);
            // this.manager.paddleLeft.update(elapsedSec);
            // this.manager.ball.updateBall(elapsedSec);
        }
        this.manager.draw();
    }

    getGameTimeMs = () => this.#serverGameTime + (performance.now() - this.#lastWorkerTimeOnRender);
    getGameTimeSec = () => this.getGameTimeMs()/1000;

    /** @param {ToWorkerGameMessageTypes.KeyEvent} d  */
    handleKey (d) {
        let action;
        if (this.manager.side === "left") {
            action = this.manager.paddleLeft.handleKey(true, d, "ArrowUp", "ArrowDown");
        } else {
            action = this.manager.paddleRight.handleKey(true, d, "ArrowUp", "ArrowDown");
        }
        if (typeof action === "string")
            this.#pushCommandToSocket({cmd: "client-move", action, timestamp_sec: this.getGameTimeSec()});
    }
    /** @param {ToWorkerGameMessageTypes.GameTouchEvent} d  */
    handleMouseTouch(d) {
        let new_y;
        const paddle = this.manager.side === "left" ? this.manager.paddleLeft : this.manager.paddleRight;
        new_y = paddle.handleMouseTouch(true, d);
        if (d.touchRect && typeof new_y === "boolean")
            pushMessageToMainThread({message: "from-worker-game-touch-valid", ident: d.touchRect.ident, valid: new_y})
        else if (typeof new_y === "number")
            this.#pushCommandToSocket({cmd: "client-move", new_y, timestamp_sec: this.getGameTimeSec()})
    }

    pauseGame() {
        this.#pushCommandToSocket({ cmd: 'client-pause' });
        this.#messageHandlerMap.setHandler("server-game-paused", (b) => {
            super.pauseGame();
        });
        this.#messageHandlerMap.setHandler("client-pause", (r) => {
            printCommandResponse(r);
        })
    }
    resumeGame() {
        this.#pushCommandToSocket({ cmd: 'client-resume' });
        this.#messageHandlerMap.setHandler("server-game-resumed", (b) => {
            super.resumeGame();
        });
        this.#messageHandlerMap.setHandler("client-resume", (r) => {
            printCommandResponse(r);
        })
    }
    startGame() {
        this.#pushCommandToSocket({ cmd: 'client-ready' });
        this.#messageHandlerMap.setHandler("client-ready", (r) => {
            printCommandResponse(r);
        })
    }
    quitGame() {
        this.#pushCommandToSocket({ cmd: 'client-leave-game' });
        this.#messageHandlerMap.setHandler("server-user-surrendered", (b) => {
            super.quitGame();
        })
        this.#messageHandlerMap.setHandler("client-leave-game", (r) => {
            printCommandResponse(r);
        })
    }

    #onSocketError = (e) => {
        console.log('---- WebSocket error: ', e, '----');
        self.close();
    };
    /** @param {CloseEvent} e */
    #onSocketClose = (e) => {
        console.log('---- WebSocket closed ----');
        console.log(`code: ${e.code}`);
        console.log(`code string: ${getSocketErrorMessage(e.code)}`);
        console.log(`reason: ${e.reason}`);
        console.log(`was clean?: ${e.wasClean}`);
        this.#socket = null;
        if (e.code !== WebsocketErrorCode.OK) {
            pushMessageToMainThread({message: "from-worker-error", error: "Server closed the connection", errorCode: e.code});
        }
        this.quitGame();
    }
    /** @param {PongClientTypes.ClientCommand} command */
    #pushCommandToSocket = (command) => {
        try {
            command.id = this.#commandNbr;
            this.#commandStack.set(this.#commandNbr.toString(), command);
            this.#commandNbr += 1;
            this.lastCommand = command
            this.#socket?.send(JSON.stringify(command));
        } catch (error) {
            console.log('error sent to socket: ', error);
            self.close();
        }
    }
}

