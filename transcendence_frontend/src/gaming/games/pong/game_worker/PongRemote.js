import { PongObjManager } from './PongObjManager';
import { getSocketErrorMessage, printCommandResponse, pushMessageToMainThread, ServerMessageMap, useMedian, WebsocketErrorCode } from './utils';
import { Pong } from './Pong';
import { GameSocket } from './Socket';

// const useInterval = (intervalHandler) => {
//     let intervalId;
//     const onInterval = () => {
//         intervalHandler();
//     };
//     const destroyInterval = () => {
//         clearInterval(intervalId);
//     }
//     const startInterval = (intervalDelay) => {
//         clearInterval(intervalId);
//         intervalId = setInterval(onInterval, intervalDelay);
//     }
//     return {  startInterval, destroyInterval };
// }
// const useTimeout = (timeoutHandler) => {
//     let timeoutId;
//     const onTimeout = () => {
//         timeoutHandler();
//     };
//     const destroyTimeout = () => {
//         clearInterval(timeoutId);
//     }
//     const startTimeout = (timeoutDelay) => {
//         clearTimeout(timeoutId);
//         timeoutId = setInterval(onTimeout, timeoutDelay);
//     }
//     return { startTimeout, destroyTimeout };
// }

// /**
//  * 
//  * 1. packet, get heartbeat interval.
//  * 2. start ping ->
//  * 3. get 1. pong ->
//  * 
//  * ping
//  * 500ms
//  * pong
//  * 
//  */

// const useIntervalTimeout = (onInterval, onTimeout) => {
//     let intervalId;
//     let timeoutId;

//     const handleTimeout = () => {
//         onTimeout();
//     }

//     const startTimeout = (timeoutDelay) => {
//         clearTimeout(timeoutId);
//         timeoutId = setTimeout(handleTimeout, timeoutDelay);   
//     }

//     const handleInterval = (timeoutDelay) => {
//         onInterval();
//         startTimeout(timeoutDelay);
//     }

//     const startInterval = (intervalDelay, timeoutDelay) => {
//         clearInterval(intervalId);
//         intervalId = setInterval(handleInterval, intervalDelay, timeoutDelay);
//     }

    

    
    

//     const start = (intervalDelay, timeoutDelay) => {
//         startInterval(intervalDelay)
//     }
// }

// class ReconnectFailedError extends Error {}
// class NetworkError extends Error {}

// const useGameSocket = () => {
//     let socket;

//     const messageHandlerMap = new ServerMessageMap();

//     let reconnectInterval;
//     let reconnectTimeout;
//     let heartBeatInterval;
//     let heartBeatTimeout;
//     let heartbeat_ms;

//     let socketReconnectAttempt = false;

//     const cleanUpCloseSocket = () => {
//         clearInterval(reconnectInterval);
//         clearTimeout(reconnectTimeout);
//         clearInterval(heartBeatInterval);
//         clearTimeout(heartBeatTimeout);
//         if (socket && socket.readyState === WebSocket.OPEN) {
//             socket.close();
//             socket = undefined;
//         }
//         // self.close();
//     }

//     const onSocketMessage = (e) => {
//         try {
//             /** @type {PongTypes.GeneralServerMessage} */
//             const message = JSON.parse(e.data);
//              /** @type {PongTypes.ServerMessageCallback<any> | undefined} */
//             let func;
//             if ('tag' in message) {
//                 func = messageHandlerMap.getHandler(message.tag);
//                 if (func) func(message);
//             } else if ('cmd' in message) {
//                 func = messageHandlerMap.getHandler(message.cmd);
//                 if (func) func(message);
//             }
//         } catch (error) {
//             cleanUpCloseSocket();
//         }
//     }


//     const onSocketOpen = (e) => {
//         clearInterval(reconnectInterval);
//         reconnectInterval = undefined;
//         clearTimeout(reconnectTimeout);
//         reconnectTimeout = undefined;
//         socketReconnectAttempt = false;
//         if (heartbeat_ms != undefined)
//             startHeartBeat();
//     }

//     /** @param {Event} e */
//     const onSocketError = (e) => {
//         if (socketReconnectAttempt === true) {
//         } else {
//             cleanUpCloseSocket();
//         }
//     }

//     const onSocketClose = (e) => {
//         if (socketReconnectAttempt === false) {
//             socket = undefined;
//             if (e.code !== WebsocketErrorCode.OK) {
//                 pushMessageToMainThread({message: "from-worker-error", error: "Server closed the connection", errorCode: e.code});
//             }
//             cleanUpCloseSocket();
//         }
//     }


//     const heartBeatTimeoutHandler = () => {
//         socket = undefined;
//         socketReconnectAttempt = true;
//         clearInterval(heartBeatInterval);
//         connectSocket();
//     }

//     const pingInterval = () => {
//         this.#pushCommandToSocket({cmd: "ping", client_timestamp_ms: this.getGameTimeMs()});
//         this.heartBeatTimeout = setTimeout(this.heartBeatTimeoutHandler, this.heartbeat_ms + 200);
//         // console.log('new timeout in interval: ', this.heartBeatTimeout);
//     }

//     const startHeartBeat = () => {
//         clearInterval(this.heartBeatInterval);
//         this.heartBeatInterval = setInterval(this.pingInterval, this.heartbeat_ms);
//     }



//     const _socketConnectInterval = () => {
//         try {
//             const s = new WebSocket(socketUrl);
//             s.onopen = onSocketOpen;
//             s.onerror = onSocketError;
//             s.onclose = onSocketClose;
//             s.onmessage = onSocketMessage;
//             socket = s;
//         } catch (error) {
//             console.log('connect failed, try reconnect again: ', error);
//         }
//     }

//     const _socketConnectTimeout = () => {
//         socketReconnectAttempt = false;
//         cleanUpCloseSocket();
//     }

//     const connectSocket = () => {
//         // console.log('connectSocket: init interval for _socketConnectInterval: duration: ', this.reconnectIntervalMs);
//         socketReconnectAttempt = true;
//         reconnectInterval = setInterval(this._socketConnectInterval, this.reconnectIntervalMs);
//         reconnectTimeout = setTimeout(this._socketConnectTimeout, this.reconnectTimeoutMs);
//     } 
// }

/**
 * @param {ArrayBuffer} data
 * @returns {PongServerTypes.GameUpdateBinaryItem[]}
 */
function parseUpdateData(data) {
    const dataview = new DataView(data);
    /** @type {PongServerTypes.GameUpdateBinaryItem[]} */
    const da = [];
    const size = dataview.getUint32(0, true);

    let i = 0, k = 0;
    let offs = 4;
    while (i < size && k < 2) {
        da.push({
            tickno: dataview.getUint32(offs, true),
            timestamp_ms: dataview.getFloat32(offs + 4, true),
            ball: {
                x: dataview.getFloat32(offs + 8, true),
                y: dataview.getFloat32(offs + 12, true),
            },
            paddle_left: {
                x: dataview.getFloat32(offs + 16, true),
                y: dataview.getFloat32(offs + 20, true),
            },
            paddle_right: {
                x: dataview.getFloat32(offs + 24, true),
                y: dataview.getFloat32(offs + 28, true),
            }
        })
        offs += 32;
        ++i;
        ++k;
    }
    // console.log('ARRAY DECODED:');
    // da.forEach((i) => {
    //     console.log('tickno: ', i.tickno);
    //     console.log('ball x: ', i.ball.x);
    //     console.log('ball y: ', i.ball.y);
    //     console.log('paddle_left x: ', i.paddle_left.x);
    //     console.log('paddle_left y: ', i.paddle_left.y);
    //     console.log('paddle_right x: ', i.paddle_right.x);
    //     console.log('paddle_right y: ', i.paddle_right.y);
    // })

    return (da);
}

export class PongRemote extends Pong {
    /**@type {GameSocket | undefined} */
    #socket = undefined;



    /** @param {ToWorkerGameMessageTypes.Create} d  */
    constructor(d) {
        if (!d.socketUrl) throw new Error('no socket url provided');
        super(d.offscreencanvas, true, d.userId);
        this.socketUrl = d.socketUrl;
        
        this.#socket = new GameSocket(d.socketUrl)
        this.#socket.addHandler("message", (data) => {
            try {
                if (data instanceof ArrayBuffer) {
                    const list = parseUpdateData(data);
                    let i = 0, size_new = list.length, size_old = this.#updateQueueNew.length;
                    while (size_new > 0 && size_old > 0 && list[i].tickno < this.#updateQueueNew[0].tickno) {
                        ++i;
                    }
                    while (i < size_new && i < size_old && this.#updateQueueNew[i].tickno === list[i].tickno) {
                        this.#updateQueueNew[i] = list[i];
                        ++i;
                    }
                    while (i < size_new) {
                        this.#updateQueueNew.push(list[i]);
                        ++i;
                    }
                    // this.#updateQueueNew.push(list[0]);
                    return;
                }
                /** @type {PongTypes.GeneralServerMessage} */
                const message = data;
                /** @type {PongTypes.ServerMessageCallback<any> | undefined} */
                let func;
                if ('tag' in message) {
                    if (message.tag !== "server-game-update")
                        console.log('server message: ', message.tag);
                    func = this.#messageHandlerMap.getHandler(message.tag);
                    if (func) func(message);
                } else if ('cmd' in message) {
                    if (message.status_code !== WebsocketErrorCode.OK)
                        pushMessageToMainThread({message: "from-worker-error", error: message.message, errorCode: message.status_code})
                    func = this.#messageHandlerMap.getHandler(message.cmd);
                    if (func) func(message);
                }
            } catch (error) {
                this.#socket?.close();
                super.quitGame();
            }
        });
        this.#socket.addHandler("disconnected", () => {
            pushMessageToMainThread({message: "from-worker-client-disconnected", user_id: this.manager.userId ?? -1})
            super.pauseGame();
        });
        this.#socket.addHandler("reconnected", () => {
            pushMessageToMainThread({message: "from-worker-client-reconnected", user_id: this.manager.userId ?? -1})
            super.resumeGame();
        });
        this.#socket.addHandler("reconnected_failure", () => {
            super.quitGame();
            self.close();
        });
        
        this.#socket.addHandler("closed",/** @param {CloseEvent} e */ (e) => {
            console.log('closed: ', e);
            if (e.code >= 4000 && e.code !== WebsocketErrorCode.OK)
                pushMessageToMainThread({message: "from-worker-error", error: e.reason, errorCode: e.code})
        });

        this.#messageHandlerMap.setHandler("server-game-ready", (b) => {
            const interpolationRatio = 4;
            this.#interpolationTimeMs =  (interpolationRatio / b.settings.tick_rate) * 1000;
            this.#tickDuration = 1000/b.settings.tick_rate
            this.manager.setSettings(b.settings.max_score, b.settings.point_wait_time_ms, true, b.user_id_left, b.user_id_right);
            this.manager.recreateGameObjects(b.court, b.ball, b.paddle_left, b.paddle_right);
            this.reconnectTimeoutMs = b.reconnect_timeout_sec * 1000;
            // console.log('start_timeout_sec: ', b.start_timeout_sec);
            // console.log('reconnectTimeoutMs: ', this.reconnectTimeoutMs);
            pushMessageToMainThread({message: "from-worker-game-ready", startTimeoutSec: b.start_timeout_sec});
            this.frame.renderAtMostOnce();
        });
        this.#messageHandlerMap.setHandler("server-game-start", (b) => {
            // this.#serverGameTime = b.timestamp_ms;
            this.#serverGameTime = 0;
            console.log('start game: ', b.timestamp_ms);
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
            // Error handling message: You cannot call this from an async context - use a thread or sync_to_async.

            // console.log('predicted time to real time diff: ', this.getGameTimeMs() - b.timestamp_ms);
            // this.#serverGameTime = b.timestamp_ms
            this.#updateQueue.push(b);
            this.#updateQueue.sort((upd1, upd2)=>upd1.timestamp_ms - upd2.timestamp_ms)
            this.#recentFrame += 1;
        });
        this.#messageHandlerMap.setHandler("server-user-connected", (b) => {
            pushMessageToMainThread({message: "from-worker-client-connected", user_id: b.user_id})
        });
        this.#messageHandlerMap.setHandler("server-user-disconnected", (b) => {
            pushMessageToMainThread({message: "from-worker-client-disconnected", user_id: b.user_id})
            super.pauseGame();
        });
        this.#messageHandlerMap.setHandler("server-user-reconnected", (b) => {
            pushMessageToMainThread({message: "from-worker-client-reconnected", user_id: b.user_id})
            super.resumeGame();
        });
        this.#messageHandlerMap.setHandler("server-game-paused", (b) => {
            super.pauseGame();
            pushMessageToMainThread({message: "from-worker-game-paused"});
        });
        this.#messageHandlerMap.setHandler("server-game-resumed", (b) => {
            super.resumeGame();
            pushMessageToMainThread({message: "from-worker-game-resumed"});
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
    
    #tickDuration = 0
    #predictedTick = 0
    #tickbuffer = 0

    #serverGameTime = performance.now();
    
    /** @type {PongServerTypes.GameUpdate[]} */
    #updateQueue = [];
    /** @type {PongServerTypes.GameUpdateBinaryItem[]} */
    #updateQueueNew = [];

    #messageHandlerMap = new ServerMessageMap();
    
 
    calcTick(elapsedMs) {
        this.#tickbuffer += elapsedMs;
        while (this.#tickbuffer > this.#tickDuration) {
            this.#predictedTick += 1;
            this.#tickbuffer = this.#tickbuffer - this.#tickDuration
        }
    }


    /**
     * @param {number} workerCurrentTimeMs 
     * @param {number} workerLastTimeMs 
     * @param {number} elapsedMs 
     * @param {number} serverCurrentTimeMs 
     */
    render = (workerCurrentTimeMs, workerLastTimeMs, elapsedMs, serverCurrentTimeMs) => {
        this.#serverGameTime += elapsedMs;
        this.calcTick(elapsedMs);

        this.#lastWorkerTimeOnRender = workerCurrentTimeMs;
        const renderTime = this.#serverGameTime - this.#interpolationTimeMs;
        const q = this.#updateQueueNew;
        while (q.length >= 2 && q[1].timestamp_ms < renderTime) {
            q.shift();
            console.log('SHIFT QUEUE: ');
        }
        const elapsedSec = elapsedMs / 1000;
        if (q.length >= 2) {
            console.log('queuelen: ', q.length);
            const cU = q[0];
            const nU = q[1];
            const elapsed = (renderTime - cU.timestamp_ms) / (nU.timestamp_ms - cU.timestamp_ms);
            this.manager.ball.interpolate(cU.ball, nU.ball, elapsed);
            if (this.manager.side === "left") {
                this.manager.paddleLeft.update(elapsedSec);
                // this.manager.paddleLeft.interpolate(cU.paddle_left, nU.paddle_left, elapsed)
                this.manager.paddleRight.interpolate(cU.paddle_right, nU.paddle_right, elapsed);
            } else {
                this.manager.paddleRight.update(elapsedSec);
                // this.manager.paddleRight.interpolate(cU.paddle_right, nU.paddle_right, elapsed);
                this.manager.paddleLeft.interpolate(cU.paddle_left, nU.paddle_left, elapsed)
            }
        } else {
            // console.log('extrapolate remote');
            
            // this.manager.paddleRight.update(elapsedSec);
            // this.manager.paddleLeft.update(elapsedSec);
            // this.manager.ball.updateBall(elapsedSec);
        }
        this.manager.draw();
    }
    // /**
    //  * @param {number} workerCurrentTimeMs 
    //  * @param {number} workerLastTimeMs 
    //  * @param {number} elapsedMs 
    //  * @param {number} serverCurrentTimeMs 
    //  */
    // render = (workerCurrentTimeMs, workerLastTimeMs, elapsedMs, serverCurrentTimeMs) => {
    //     this.#serverGameTime += elapsedMs;
    //     this.calcTick(elapsedMs);
    //     this.#lastWorkerTimeOnRender = workerCurrentTimeMs;

    //     const ticksAhead = 3;
    //     while (this.#updateQueue.length >= 2 && this.#updateQueue[1].tickno < this.#predictedTick - ticksAhead) {
    //         this.#updateQueue.shift();
    //         console.log('SHIFT QUEUE: ');
    //     }
    //     const elapsedSec = elapsedMs / 1000;
    //     if (this.#updateQueue.length >= 2) {
    //         console.log('queuelen: ', this.#updateQueue.length);
    //         const cU = this.#updateQueue[0];
    //         const nU = this.#updateQueue[1];
    //         // const elapsed = (renderTime - cU.timestamp_ms) / (nU.timestamp_ms - cU.timestamp_ms);
    //         const elapsed = this.#tickbuffer;
    //         console.log('tickbuffer:', this.#tickbuffer, ', predicted tick: ', this.#predictedTick, ', stick: ', cU.tickno, ', ntick: ', nU.tickno);
    //         this.manager.ball.interpolate(cU.ball, nU.ball, elapsed);
    //         if (this.manager.side === "left") {
    //             // this.manager.paddleLeft.update(elapsedSec);
    //             this.manager.paddleRight.interpolate(cU.paddle_right, nU.paddle_right, elapsed);
    //             this.manager.paddleLeft.interpolate(cU.paddle_left, nU.paddle_left, elapsed)
    //         } else {
    //             // this.manager.paddleRight.update(elapsedSec);
    //             this.manager.paddleLeft.interpolate(cU.paddle_left, nU.paddle_left, elapsed)
    //             this.manager.paddleRight.interpolate(cU.paddle_right, nU.paddle_right, elapsed);
    //         }
    //     } else {
    //         // console.log('extrapolate remote');
            
    //         // this.manager.paddleRight.update(elapsedSec);
    //         // this.manager.paddleLeft.update(elapsedSec);
    //         // this.manager.ball.updateBall(elapsedSec);
    //     }
    //     this.manager.draw();
    // }

    // getGameTimeMs = () => this.#serverGameTime + (performance.now() - this.#lastWorkerTimeOnRender);
    getGameTimeMs = () => this.#serverGameTime + (performance.now() - this.#lastWorkerTimeOnRender);
    getGameTimeSec = () => this.getGameTimeMs()/1000;

    pushMove(action, new_y) {
        const elapsedMs = performance.now() - this.#lastWorkerTimeOnRender;
        let tickbuffer = this.#tickbuffer + elapsedMs;
        let predictedTick = this.#predictedTick;
        while (tickbuffer > this.#tickDuration) {
            predictedTick += 1;
            tickbuffer -= this.#tickDuration
        }
        
        this.#pushCommandToSocket({
            cmd: "client-move",
            action,
            new_y,
            timestamp_sec: this.getGameTimeSec(),
            tickno: predictedTick,
            tick_diff: tickbuffer
        })
    }

    /** @param {ToWorkerGameMessageTypes.KeyEvent} d  */
    handleKey (d) {
        let action;
        if (this.manager.side === "left") {
            action = this.manager.paddleLeft.handleKey(true, d, "ArrowUp", "ArrowDown");
        } else {
            action = this.manager.paddleRight.handleKey(true, d, "ArrowUp", "ArrowDown");
        }
        if (typeof action === "string") {
            this.pushMove(action, undefined);
        }
    }
    /** @param {ToWorkerGameMessageTypes.GameTouchEvent} d  */
    handleMouseTouch(d) {
        let new_y;
        const paddle = this.manager.side === "left" ? this.manager.paddleLeft : this.manager.paddleRight;
        new_y = paddle.handleMouseTouch(true, d);
        if (d.touchRect && typeof new_y === "boolean")
            pushMessageToMainThread({message: "from-worker-game-touch-valid", ident: d.touchRect.ident, valid: new_y})
        else if (typeof new_y === "number") {
            console.log('push new y to server: ', new_y);
            this.pushMove(undefined, new_y);
        }
    }

    pauseGame() {
        this.#pushCommandToSocket({ cmd: 'client-pause' });
        this.#messageHandlerMap.setHandler("client-pause", (r) => {
            printCommandResponse(r);
        })
    }
    resumeGame() {
        this.#pushCommandToSocket({ cmd: 'client-resume' });
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
        this.#socket?.close();
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
            this.#socket?.sendMessage(command);
        } catch (error) {
            // console.log('error sent to socket: ', error);
            this.#socket?.close();
            super.quitGame();
        }
    }
}

// export class PongRemote extends Pong {

    
//     socketReconnectAttempt = false;
//     /**@type {WebSocket | undefined} */
//     socket = undefined;
//     socketOn = false;
//     heartBeatInterval;
//     heartBeatTimeout;
//     reconnectInterval;
//     reconnectTimeout;
//     reconnectTimeoutMs = 5000;
//     reconnectIntervalMs = 1000;
//     socketUrl;
//     heartbeat_ms;

//     /** @param {ToWorkerGameMessageTypes.Create} d  */
//     constructor(d) {
//         if (!d.socketUrl) throw new Error('no socket url provided');
//         super(d.offscreencanvas, true, d.userId);
//         this.socketUrl = d.socketUrl;
//         this.#messageHandlerMap.setHandler("hello", (b) => {
            
//             // // console.log('SET NEW INTERVAL: hello');
//             this.heartbeat_ms = b.heartbeat_ms;
//             this.startHeartBeat();
//         });

//         this.#messageHandlerMap.setHandler("pong", (b) => {
//             const t1 = b.client_timestamp_ms, t2 = b.server_timestamp_ms, t3 = this.getGameTimeMs()
//             this.#serverRTT.addValue((t3 - t1) / 2)

//             this.#interpolationTimeMs = Math.max(60, Math.min(this.#serverRTT.getMedian() * 4, 150));
//             // // console.log('clear timeout!: ', this.heartBeatTimeout);

//             clearTimeout(this.heartBeatTimeout);
//             this.heartBeatTimeout = undefined;
//         })

//         this.#messageHandlerMap.setHandler("server-game-ready", (b) => {
//             const interpolationRatio = 3;
//             // this.#interpolationTimeMs =  (interpolationRatio / b.settings.tick_rate) * 1000;
//             // // console.log('ready msg, data: ', b);
//             // // console.log('myuserid: ', this.manager.userId);
//             this.manager.setSettings(b.settings.max_score, b.settings.point_wait_time_ms, true, b.user_id_left, b.user_id_right);
//             this.manager.recreateGameObjects(b.court, b.ball, b.paddle_left, b.paddle_right);
//             this.reconnectTimeoutMs = b.reconnect_timeout_sec * 1000;
//             // console.log('start_timeout_sec: ', b.start_timeout_sec);
//             // console.log('reconnectTimeoutMs: ', this.reconnectTimeoutMs);
//             pushMessageToMainThread({message: "from-worker-game-ready", startTimeoutSec: b.start_timeout_sec});
//             this.frame.renderAtMostOnce();
//         });
//         this.#messageHandlerMap.setHandler("server-game-start", (b) => {
//             this.#serverGameTime = b.timestamp;
//             pushMessageToMainThread({message: "from-worker-game-started", ballTimeoutSec: this.manager.ballTimeout/1000});
//             super.startGame();
//             // this.#pushCommandToSocket({cmd: "ping", client_timestamp_ms: this.getGameTimeMs()})
//         })
//         this.#messageHandlerMap.setHandler("server-game-update", (b) => {
//             // // console.log('ON SERVER UPDATE');
//             for (let i = 0; i < b.invalid_ticks; i++) {
//             //     console.log('REMOVE');
//                 this.#updateQueue.pop()
//             }
//             this.#updateQueue.push(b);
//             this.#updateQueue.sort((upd1, upd2)=>upd1.timestamp - upd2.timestamp)
//             this.#recentFrame += 1;
//         });
//         this.#messageHandlerMap.setHandler("server-user-disconnected", (b) => {
//             pushMessageToMainThread({message: "from-worker-client-disconnected", user_id: b.user_id})
//         });
//         this.#messageHandlerMap.setHandler("client-move", (r) => {
//             // console.log('command-response: ', r);
//             const prev = this.#commandStack.get(r.id.toString());
//             // console.log('command was: ', prev);
//         })
//         this.#messageHandlerMap.setHandler("server-game-player-scored", (b) => {
//             this.manager.makeAction(b.side, "remote-set-score-message-main")
//         })
//         this.#messageHandlerMap.setHandler("server-game-end", (b) => {
//             this.manager.makeAction(b.winner_side, "remote-game-end-message-main-winner-side", b.reason)
//             super.quitGame();
//         });

//         this.connectSocket();
//     }
//     /** @type {Map<string, PongClientTypes.ClientCommand>} */
//     #commandStack = new Map();
//     #commandNbr = 1;
//     /** @type {PongClientTypes.ClientCommand | null} */
//     #lastCommand = null;
//     /** @type {PongClientTypes.ClientMoveDirection | undefined} */
//     #lastMove;
//     #serverOffset = useMedian();
//     #serverRTT = useMedian();
//     #recentFrame = 0;
//     #interpolationTimeMs = 100;
//     #lastWorkerTimeOnRender = performance.now();

//     #serverGameTime = performance.now();
    
//     /** @type {PongServerTypes.GameUpdate[]} */
//     #updateQueue = [];

    
    
 

//     /**
//      * @param {number} workerCurrentTimeMs 
//      * @param {number} workerLastTimeMs 
//      * @param {number} elapsedMs 
//      * @param {number} serverCurrentTimeMs 
//      */
//     render = (workerCurrentTimeMs, workerLastTimeMs, elapsedMs, serverCurrentTimeMs) => {
//         this.#serverGameTime += elapsedMs;
//         this.#lastWorkerTimeOnRender = workerCurrentTimeMs;
//         // // console.log('elapsed ms: ', elapsedMs);
//         const renderTime = this.#serverGameTime - this.#interpolationTimeMs;
//         // // console.log('render remote');
//         // const renderTime = currUnixTimeStampMs - this.interpMs;
//         while (this.#updateQueue.length >= 2 && this.#updateQueue[1].timestamp < renderTime) {
//             this.#updateQueue.shift();
//             // // console.log('shift queue');
//         }
//         if (this.#updateQueue.length >= 2) {
//             // // console.log('queuelen: ', this.#updateQueue.length);
//             const cU = this.#updateQueue[0];
//             const nU = this.#updateQueue[1];
//             // // console.log('interpolate remote');
//             const elapsed = (renderTime - cU.timestamp) / (nU.timestamp - cU.timestamp);
//             this.manager.ball.interpolate(cU.ball, nU.ball, elapsed);
//             this.manager.paddleRight.interpolate(cU.paddle_right, nU.paddle_right, elapsed);
//             this.manager.paddleLeft.interpolate(cU.paddle_left, nU.paddle_left, elapsed)
//         } else {
//             // console.log('extrapolate remote');
//             const elapsedSec = elapsedMs / 1000;
//             this.manager.paddleRight.update(elapsedSec);
//             this.manager.paddleLeft.update(elapsedSec);
//             this.manager.ball.updateBall(elapsedSec);
//         }
//         this.manager.draw();
//     }

//     // getGameTimeMs = () => this.#serverGameTime + (performance.now() - this.#lastWorkerTimeOnRender);
//     getGameTimeMs = () => this.#serverGameTime + (performance.now() - this.#lastWorkerTimeOnRender);
//     getGameTimeSec = () => this.getGameTimeMs()/1000;

//     /** @param {ToWorkerGameMessageTypes.KeyEvent} d  */
//     handleKey (d) {
//         let action;
//         if (this.manager.side === "left") {
//             action = this.manager.paddleLeft.handleKey(true, d, "ArrowUp", "ArrowDown");
//         } else {
//             action = this.manager.paddleRight.handleKey(true, d, "ArrowUp", "ArrowDown");
//         }
//         if (typeof action === "string")
//             this.#pushCommandToSocket({cmd: "client-move", action, timestamp_sec: this.getGameTimeSec()});
//     }
//     /** @param {ToWorkerGameMessageTypes.GameTouchEvent} d  */
//     handleMouseTouch(d) {
//         let new_y;
//         const paddle = this.manager.side === "left" ? this.manager.paddleLeft : this.manager.paddleRight;
//         new_y = paddle.handleMouseTouch(true, d);
//         if (d.touchRect && typeof new_y === "boolean")
//             pushMessageToMainThread({message: "from-worker-game-touch-valid", ident: d.touchRect.ident, valid: new_y})
//         else if (typeof new_y === "number")
//             this.#pushCommandToSocket({cmd: "client-move", new_y, timestamp_sec: this.getGameTimeSec()})
//     }

//     pauseGame() {
//         this.#pushCommandToSocket({ cmd: 'client-pause' });
//         this.#messageHandlerMap.setHandler("server-game-paused", (b) => {
//             super.pauseGame();
//         });
//         this.#messageHandlerMap.setHandler("client-pause", (r) => {
//             printCommandResponse(r);
//         })
//     }
//     resumeGame() {
//         this.#pushCommandToSocket({ cmd: 'client-resume' });
//         this.#messageHandlerMap.setHandler("server-game-resumed", (b) => {
//             super.resumeGame();
//         });
//         this.#messageHandlerMap.setHandler("client-resume", (r) => {
//             printCommandResponse(r);
//         })
//     }
//     startGame() {
//         this.#pushCommandToSocket({ cmd: 'client-ready' });
//         this.#messageHandlerMap.setHandler("client-ready", (r) => {
//             printCommandResponse(r);
//         })
//     }
//     quitGame() {
//         this.#pushCommandToSocket({ cmd: 'client-leave-game' });
//         super.quitGame();
//         this.#messageHandlerMap.setHandler("server-user-surrendered", (b) => {
//         })
//         this.#messageHandlerMap.setHandler("client-leave-game", (r) => {
//             printCommandResponse(r);
//         })
//     }

   
//     /** @param {PongClientTypes.ClientCommand} command */
//     #pushCommandToSocket = (command) => {
//         try {
//             command.id = this.#commandNbr;
//             // this.#commandStack.set(this.#commandNbr.toString(), command);
//             this.#commandNbr += 1;
//             this.lastCommand = command
//             this.socket?.send(JSON.stringify(command));
//         } catch (error) {
//             // console.log('error sent to socket: ', error);
//             this.cleanUpCloseSocket();
//         }
//     }
// }

