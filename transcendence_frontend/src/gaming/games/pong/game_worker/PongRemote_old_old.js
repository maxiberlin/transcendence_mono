import { PongObjManager } from './PongObjManager';
import { getSocketErrorMessage, printCommandResponse, pushMessageToMainThread, ServerMessageMap, useMedian, WebsocketErrorCode } from './utils';
import { Pong } from './Pong';


export class PongRemote extends Pong {

    cleanUpCloseSocket() {
        clearInterval(this.reconnectInterval);
        clearTimeout(this.reconnectTimeout);
        clearInterval(this.heartBeatInterval);
        clearTimeout(this.heartBeatTimeout);
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.close();
            this.socket = undefined;
        }
        self.close();
    }

    onSocketMessage = (e) => {
        try {
            // // console.log("msg socket: ", e.data);
            /** @type {PongTypes.GeneralServerMessage} */
            const message = JSON.parse(e.data);
             /** @type {PongTypes.ServerMessageCallback<any> | undefined} */
            let func;
            if ('tag' in message) {
                func = this.#messageHandlerMap.getHandler(message.tag);
                // if (message.tag !== "server-game-update" && message.tag !== "pong")
                    // // console.log('NEW SERVER BROASCAST: ', message);
                // // console.log('handlerfunc?', func);
                if (func) func(message);
            } else if ('cmd' in message) {
                func = this.#messageHandlerMap.getHandler(message.cmd);
                if (func) func(message);
            }
        } catch (error) {
            // // console.log('error parsing or handling message: ', error);
            this.cleanUpCloseSocket();
            
        }
    }


    onSocketOpen = (e) => {
        // // console.log('ON SOCKET OPEN');
        this.socketOn = true;
        // console.log('socket connection successfull?');
        clearInterval(this.reconnectInterval);
        // console.log('reconnectInterval cleared');
        this.reconnectInterval = undefined;
        clearTimeout(this.reconnectTimeout);
        // console.log('reconnectTimeout cleared');
        this.reconnectTimeout = undefined;
        this.socketReconnectAttempt = false;
        if (this.heartbeat_ms != undefined)
            this.startHeartBeat();
    }

    /**
     * @param {Event} e 
     */
    onSocketError = (e) => {
        // console.log('ON SOCKET ERROR');
        this.socketOn = false;
        if (this.socketReconnectAttempt === true) {
            // console.log('onClose! but dont handle, attempt reconnect');
        } else {
            // console.log('---- WebSocket error: ', e, '----');
            // console.log('', e.type);
            // console.log('', e.eventPhase);
            this.cleanUpCloseSocket();
        }
    }

    onSocketClose = (e) => {
        // console.log('ON SOCKET CLOSE');
        this.socketOn = false;
        // console.log('---- WebSocket closed ----');
        // console.log(`code: ${e.code}`);
        // console.log(`code string: ${getSocketErrorMessage(e.code)}`);
        // console.log(`reason: ${e.reason}`);
        // console.log(`was clean?: ${e.wasClean}`);
        if (this.socketReconnectAttempt === true) {
            // console.log('onClose! but dont handle, attempt reconnect');
        } else {
            this.socket = undefined;
            if (e.code !== WebsocketErrorCode.OK) {
                pushMessageToMainThread({message: "from-worker-error", error: "Server closed the connection", errorCode: e.code});
            }
            this.quitGame();
            this.cleanUpCloseSocket();
        }
    }

    _socketConnectInterval = () => {
        // console.log('run _socketConnectInterval');
        try {
            // console.log('try to connect to: ', this.socketUrl);
            const socket = new WebSocket(this.socketUrl);
            // console.log('socket connecting. state: ', socket.readyState);
            socket.onopen = this.onSocketOpen;
            socket.onerror = this.onSocketError;
            socket.onclose = this.onSocketClose;
            socket.onmessage = this.onSocketMessage;
            this.socket = socket;
            // console.log('eeend of function');
        } catch (error) {
            // console.log('connect failed, try reconnect again');
        }
    }

    _socketConnectTimeout = () => {
        this.socketReconnectAttempt = false;
        // console.log('reconnecting not successfull -> ceanup and close worker');
        this.cleanUpCloseSocket();
    }

    connectSocket() {
        // console.log('connectSocket: init interval for _socketConnectInterval: duration: ', this.reconnectIntervalMs);
        this.socketReconnectAttempt = true;
        this.reconnectInterval = setInterval(this._socketConnectInterval, this.reconnectIntervalMs);
        this.reconnectTimeout = setTimeout(this._socketConnectTimeout, this.reconnectTimeoutMs);
    }
    socketReconnectAttempt = false;
    /**@type {WebSocket | undefined} */
    socket = undefined;
    socketOn = false;
    heartBeatInterval;
    heartBeatTimeout;
    reconnectInterval;
    reconnectTimeout;
    reconnectTimeoutMs = 5000;
    reconnectIntervalMs = 1000;
    socketUrl;
    heartbeat_ms;

    heartBeatTimeoutHandler = () => {
        // console.log('CHECK TIMEOUT, reconnect timeout: ', this.reconnectTimeoutMs);
        // console.log('socket state: ', this.socket?.readyState);
        this.socketOn = false;
        delete this.socket;
        this.socket = undefined;
        this.socketReconnectAttempt = true;
        clearInterval(this.heartBeatInterval);
        this.connectSocket();
    }

    pingInterval = () => {
        if (!this.socketOn || this.heartBeatTimeout != undefined) return;
        this.#pushCommandToSocket({cmd: "ping", client_timestamp_ms: this.getGameTimeMs()});
        this.heartBeatTimeout = setTimeout(this.heartBeatTimeoutHandler, this.heartbeat_ms + 200);
        // console.log('new timeout in interval: ', this.heartBeatTimeout);
    }

    startHeartBeat = () => {
        clearInterval(this.heartBeatInterval);
        this.heartBeatInterval = setInterval(this.pingInterval, this.heartbeat_ms);
    }


    /** @param {ToWorkerGameMessageTypes.Create} d  */
    constructor(d) {
        if (!d.socketUrl) throw new Error('no socket url provided');
        super(d.offscreencanvas, true, d.userId);
        this.socketUrl = d.socketUrl;
        this.#messageHandlerMap.setHandler("hello", (b) => {
            
            // // console.log('SET NEW INTERVAL: hello');
            this.heartbeat_ms = b.heartbeat_ms;
            this.startHeartBeat();
        });

        this.#messageHandlerMap.setHandler("pong", (b) => {
            const t1 = b.client_timestamp_ms, t2 = b.server_timestamp_ms, t3 = this.getGameTimeMs()
            this.#serverRTT.addValue((t3 - t1) / 2)

            this.#interpolationTimeMs = Math.max(60, Math.min(this.#serverRTT.getMedian() * 4, 150));
            // // console.log('clear timeout!: ', this.heartBeatTimeout);

            clearTimeout(this.heartBeatTimeout);
            this.heartBeatTimeout = undefined;
        })

        this.#messageHandlerMap.setHandler("server-game-ready", (b) => {
            const interpolationRatio = 3;
            // this.#interpolationTimeMs =  (interpolationRatio / b.settings.tick_rate) * 1000;
            // // console.log('ready msg, data: ', b);
            // // console.log('myuserid: ', this.manager.userId);
            this.manager.setSettings(b.settings.max_score, b.settings.point_wait_time_ms, true, b.user_id_left, b.user_id_right);
            this.manager.recreateGameObjects(b.court, b.ball, b.paddle_left, b.paddle_right);
            this.reconnectTimeoutMs = b.reconnect_timeout_sec * 1000;
            // console.log('start_timeout_sec: ', b.start_timeout_sec);
            // console.log('reconnectTimeoutMs: ', this.reconnectTimeoutMs);
            pushMessageToMainThread({message: "from-worker-game-ready", startTimeoutSec: b.start_timeout_sec});
            this.frame.renderAtMostOnce();
        });
        this.#messageHandlerMap.setHandler("server-game-start", (b) => {
            this.#serverGameTime = b.timestamp;
            pushMessageToMainThread({message: "from-worker-game-started", ballTimeoutSec: this.manager.ballTimeout/1000});
            super.startGame();
            // this.#pushCommandToSocket({cmd: "ping", client_timestamp_ms: this.getGameTimeMs()})
        })
        this.#messageHandlerMap.setHandler("server-game-update", (b) => {
            // // console.log('ON SERVER UPDATE');
            for (let i = 0; i < b.invalid_ticks; i++) {
            //     console.log('REMOVE');
                this.#updateQueue.pop()
            }
            this.#updateQueue.push(b);
            this.#updateQueue.sort((upd1, upd2)=>upd1.timestamp - upd2.timestamp)
            this.#recentFrame += 1;
        });
        this.#messageHandlerMap.setHandler("server-user-disconnected", (b) => {
            pushMessageToMainThread({message: "from-worker-client-disconnected", user_id: b.user_id})
        });
        this.#messageHandlerMap.setHandler("client-move", (r) => {
            // console.log('command-response: ', r);
            const prev = this.#commandStack.get(r.id.toString());
            // console.log('command was: ', prev);
        })
        this.#messageHandlerMap.setHandler("server-game-player-scored", (b) => {
            this.manager.makeAction(b.side, "remote-set-score-message-main")
        })
        this.#messageHandlerMap.setHandler("server-game-end", (b) => {
            this.manager.makeAction(b.winner_side, "remote-game-end-message-main-winner-side", b.reason)
            super.quitGame();
        });

        this.connectSocket();
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

    
    
 

    /**
     * @param {number} workerCurrentTimeMs 
     * @param {number} workerLastTimeMs 
     * @param {number} elapsedMs 
     * @param {number} serverCurrentTimeMs 
     */
    render = (workerCurrentTimeMs, workerLastTimeMs, elapsedMs, serverCurrentTimeMs) => {
        this.#serverGameTime += elapsedMs;
        this.#lastWorkerTimeOnRender = workerCurrentTimeMs;
        // // console.log('elapsed ms: ', elapsedMs);
        const renderTime = this.#serverGameTime - this.#interpolationTimeMs;
        // // console.log('render remote');
        // const renderTime = currUnixTimeStampMs - this.interpMs;
        while (this.#updateQueue.length >= 2 && this.#updateQueue[1].timestamp < renderTime) {
            this.#updateQueue.shift();
            // // console.log('shift queue');
        }
        if (this.#updateQueue.length >= 2) {
            // // console.log('queuelen: ', this.#updateQueue.length);
            const cU = this.#updateQueue[0];
            const nU = this.#updateQueue[1];
            // // console.log('interpolate remote');
            const elapsed = (renderTime - cU.timestamp) / (nU.timestamp - cU.timestamp);
            this.manager.ball.interpolate(cU.ball, nU.ball, elapsed);
            this.manager.paddleRight.interpolate(cU.paddle_right, nU.paddle_right, elapsed);
            this.manager.paddleLeft.interpolate(cU.paddle_left, nU.paddle_left, elapsed)
        } else {
            // console.log('extrapolate remote');
            const elapsedSec = elapsedMs / 1000;
            this.manager.paddleRight.update(elapsedSec);
            this.manager.paddleLeft.update(elapsedSec);
            this.manager.ball.updateBall(elapsedSec);
        }
        this.manager.draw();
    }

    // getGameTimeMs = () => this.#serverGameTime + (performance.now() - this.#lastWorkerTimeOnRender);
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
        super.quitGame();
        this.#messageHandlerMap.setHandler("server-user-surrendered", (b) => {
        })
        this.#messageHandlerMap.setHandler("client-leave-game", (r) => {
            printCommandResponse(r);
        })
    }

   
    /** @param {PongClientTypes.ClientCommand} command */
    #pushCommandToSocket = (command) => {
        try {
            command.id = this.#commandNbr;
            // this.#commandStack.set(this.#commandNbr.toString(), command);
            this.#commandNbr += 1;
            this.lastCommand = command
            this.socket?.send(JSON.stringify(command));
        } catch (error) {
            // console.log('error sent to socket: ', error);
            this.cleanUpCloseSocket();
        }
    }
}

