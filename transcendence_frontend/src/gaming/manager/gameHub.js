/* eslint-disable prettier/prettier */
/* eslint-disable no-nested-ternary */
/* eslint-disable class-methods-use-this */
/* eslint-disable jsdoc/no-undefined-types */
/* eslint-disable no-unused-vars */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-console */
import { sessionService } from '../../services/api/API_new.js';
import { msg_to_main, msg_to_worker } from '../exchange/game_msg.js';

// class WorkerEventTarget extends EventTarget {
//     constructor(scriptURL, useModule) {
//         super();
//         this.worker = new Worker(
//             scriptURL,
//             useModule ? { type: 'module' } : undefined,
//         );
//         this.worker.onmessage = (ev) => {
//             this.dispatchEvent( new CustomEvent("") )
//         };
//         // this.worker.onerror = (ev) => {
//         // }
//         // this.worker.onmessageerror = (ev) => {
//         // }
//     }
// }

class GameWorkerManager {
    /**
     * @param {string} scriptURL
     * @param {boolean} useModule
     * @param {(msg: FromWorkerGameMessageTypes.FromWorkerMessage) => void} onMessageCb
     * @param {(ev: Event) => void} onErrorCb
     * @param {(ev: MessageEvent) => void} onMessageErrorCb
     */
    constructor(
        scriptURL,
        useModule,
        onMessageCb,
        onMessageErrorCb,
        onErrorCb,
    ) {
        this.worker = new Worker(
            scriptURL,
            useModule ? { type: 'module' } : undefined,
        );
        this.worker.onmessage = (ev) => {
            if (typeof onMessageCb === 'function') onMessageCb(ev.data);
        };
        this.worker.onerror = (ev) => {
            if (typeof onErrorCb === 'function') onErrorCb(ev);
        };
        this.worker.onmessageerror = (ev) => {
            if (typeof onMessageErrorCb === 'function') onMessageErrorCb(ev);
        };
    }

    terminate() {
        this.worker.terminate();
    }

    /**
     * @param {ToWorkerGameMessageTypes.GameWorkerMessage} message
     * @param {Transferable[]} [transfer]
     */
    postMessage(message, transfer = []) {
        this.worker.postMessage(message, transfer);
    }
}

/** @type {WorkerOptions} */

export default class GameHub {
    static games = {
        pong: 'pong',
    };

    static gamesWorker = {
        pong: '/public/game_worker/worker.js',
    };

    static currentUser = sessionService.subscribe(null);

    /**
     * @param {string} game
     * @param {HTMLCanvasElement} canvas
     * @param {APITypes.GameScheduleItem} gameData
     * @param {boolean} isRemote
     * @param {import('./../exchange/game_msg.js').GameSettings} [gameSettings]
     * @returns {Promise<GameHub | undefined>}
     */
    static async startGame(game, canvas, gameData, isRemote, gameSettings) {
        if (GameHub.currentUser.value)
            return new GameHub(game, canvas, gameData, isRemote, gameSettings);
        return undefined;
    }

    /**
     * @param {string} game
     * @param {HTMLCanvasElement} canvas
     * @param {APITypes.GameScheduleItem} gameData
     * @param {boolean} isRemote
     * @param {import('./../exchange/game_msg.js').GameSettings} [gameSettings]
     */
    constructor(game, canvas, gameData, isRemote, gameSettings) {
        if (!GameHub.gamesWorker[game] || !(canvas instanceof HTMLCanvasElement))
            throw new Error('No Canvas Element or no Worker Files');

        this.gameData = gameData;
        this.gameSettings = gameSettings;

        this.worker = new GameWorkerManager(
            GameHub.gamesWorker[game],
            true,
            (msg) => {
                this.onWorkerMessage(msg);
            },
            (ev) => {
                this.onWorkerMessageError(ev);
            },
            (ev) => {
                this.onWorkerError(ev);
            },
        );

        this.gameData.player_one.score = 0;
        this.gameData.player_two.score = 0;
        this.gameData.player_one.won = false;
        this.gameData.player_two.won = false;

        window.addEventListener('keydown', (e) => { this.handleKey(e); });
        window.addEventListener('keyup', (e) => { this.handleKey(e); });

        try {
            const url = new URL(window.location.origin);
            const socketUrl = `wss://api.${url.host}/ws/game/${this.gameData.schedule_id}/`;
            const offscreencanvas = canvas.transferControlToOffscreen();
            this.worker.postMessage(
                {
                    message: isRemote ? 'game_worker_create_remote' : 'game_worker_create_local',
                    offscreencanvas,
                    socketUrl,
                    data: this.gameData,
                    userId: GameHub.currentUser.value.id,
                },
                [offscreencanvas],
            );
        } catch (error) {
            console.log('unable to connect to game websocket: ', error);
        }
    }

    onWorkerError(ev) {
        console.log(ev);
        this.terminateGame();
        throw new Error('WORKER ERROR');
    }

    onWorkerMessageError(ev) {
        this.terminateGame();
        throw new Error('WORKER MESSAGE ERROR');
    }

    onWorkerMessage(msg) {
        console.log('worker message:');
        console.dir(msg);
    }

    /**
     * @param {KeyboardEvent} e
     */
    handleKey(e) {
        /** @type {PongClientTypes.ClientMoveDirection | undefined} */
        let dir;
        switch (e.key) {
            case 'ArrowUp':
                if (e.type === 'keydown') dir = 'up';
                else if (e.type === 'keyup') dir = 'release_up';
                break;
            case 'ArrowDown':
                if (e.type === 'keydown') dir = 'down';
                else if (e.type === 'keyup') dir = 'release_down';
                break;
            case 'Escape':
                break;
            default:
                break;
        }
        if (dir) {
            this.worker.postMessage({
                message: 'worker_game_move',
                action: dir
            });
        }
    }

    terminateGame() {
        this.worker.postMessage({ message: 'worker_game_terminate' });
        this.worker.terminate();
    }

    startGame() {
        this.worker.postMessage({ message: 'worker_game_start' });
    }

    quitGame() {
        this.worker.postMessage({ message: 'worker_game_quit' });
    }

    pauseGame() {
        this.worker.postMessage({ message: 'worker_game_pause' });
    }

    continueGame() {
        this.worker.postMessage({ message: 'worker_game_resume' });
    }

    resizeCanvas(newCanvasWidth, newCanvasHeight, dpr) {
        this.worker.postMessage({
            message: 'worker_game_resize',
            width: newCanvasWidth,
            height: newCanvasHeight,
            dpr,
        });
    }

    get scorePlayerOne() {
        return this.gameData.player_one.score;
    }

    get scorePlayerTwo() {
        return this.gameData.player_two.score;
    }

    get playerOneWon() {
        return this.gameData.player_one.won;
    }

    get playerTwoWon() {
        return this.gameData.player_two.won;
    }
}

// import { sessionService } from '../../services/api/API.js';
// import { msg_to_main, msg_to_worker } from '../exchange/game_msg.js';

// class GameWorkerManager {
//     /**
//      * @param {string} scriptURL
//      * @param {boolean} useModule
//      */
//     constructor(scriptURL, useModule) {
//         this.worker = new Worker(
//             scriptURL,
//             useModule ? { type: 'module' } : undefined,
//         );
//         this.worker.onmessage = this.onmessage;
//         this.worker.onerror = this.onerror;
//         this.worker.onmessageerror = this.onmessageerror;
//     }

//     terminate() {
//         this.worker.terminate();
//     }

//     /**
//      * @param {ToWorkerGameMessageTypes.GameWorkerMessage} message
//      * @param {Transferable[]} [transfer]
//      */
//     postMessage(message, transfer = []) {
//         this.worker.postMessage(message, transfer);
//     }

//     /**
//      * @param {MessageEvent} ev
//      */
//     onmessage(ev) {}

//     /**
//      * @param {ErrorEvent} ev
//      */
//     onerror(ev) {}

//     /**
//      * @param {MessageEvent} ev
//      */
//     onmessageerror(ev) {}
// }

// /** @type {WorkerOptions} */

// export default class GameHub {
//     static games = {
//         pong: 'pong',
//     };

//     static gamesWorker = {
//         pong: '/public/game_worker/worker.js',
//     };

//     static currentUser = sessionService.subscribe(null);

//     /**
//      * @param {string} game
//      * @param {HTMLCanvasElement} canvas
//      * @param {APITypes.GameScheduleItem} gameData
//      * @param {import('./../exchange/game_msg.js').GameSettings} [gameSettings]
//      * @returns {Promise<GameHub | undefined>}
//      */
//     static async startGame(game, canvas, gameData, gameSettings) {
//         if (GameHub.currentUser.value)
//             return new GameHub(game, canvas, gameData, gameSettings);
//         return undefined;
//     }

//     /**
//      * @param {string} game
//      * @param {HTMLCanvasElement} canvas
//      * @param {APITypes.GameScheduleItem} gameData
//      * @param {import('./../exchange/game_msg.js').GameSettings} [gameSettings]
//      */
//     constructor(game, canvas, gameData, gameSettings) {
//         if (
//             !GameHub.gamesWorker[game] ||
//             !(canvas instanceof HTMLCanvasElement)
//         )
//             throw new Error('No Canvas Element or no Worker Files');

//         this.gameData = gameData;
//         this.gameSettings = gameSettings;

//         this.worker = new GameWorkerManager(GameHub.gamesWorker[game], true);

//         this.gameData.player_one.score = 0;
//         this.gameData.player_two.score = 0;
//         this.gameData.player_one.won = false;
//         this.gameData.player_two.won = false;

//         this.worker.onmessage = (ev) => {
//             if (
//                 ev.data === msg_to_main.player_1_score &&
//                 this.gameData.player_one.score
//             ) {
//                 this.gameData.player_one.score++;
//             } else if (
//                 ev.data === msg_to_main.player_2_score &&
//                 this.gameData.player_two.score
//             ) {
//                 this.gameData.player_two.score++;
//             } else if (ev.data === msg_to_main.player_1_win) {
//                 this.gameData.player_one.won = true;
//                 this.pauseGame();
//             } else if (ev.data === msg_to_main.player_2_win) {
//                 this.gameData.player_two.won = true;
//                 this.pauseGame();
//             }
//         };
//         this.worker.onerror = (ev) => {
//             console.log(ev);
//             this.terminateGame();
//             throw new Error('WORKER ERROR');
//         };
//         this.worker.onmessageerror = () => {
//             this.terminateGame();
//             throw new Error('WORKER MESSAGE ERROR');
//         };

//         const pushKey = (e) => {
//             this.worker.postMessage({
//                 message: 'worker_game_keyevent',
//                 keyevent: e.type,
//                 key: e.key,
//             });
//         };

//         window.addEventListener('keydown', pushKey);
//         window.addEventListener('keyup', pushKey);
//         // window.addEventListener("mousemove", (e) => {

//         // })

//         this.canvas = canvas;
//     }

//     //   #quitGameAndPushResult() {}

//     #gameTerminated = false;

//     //   #gameInited = false;

//     #gameStarted = false;

//     #gameQuited = false;

//     initGame() {
//         console.log('init game hub');
//         // console.log('game inited: ', this.#gameInited);
//         console.log('game started: ', this.#gameStarted);
//         // if (this.#gameInited || this.#gameTerminated) return;
//         console.log('init game hub yoo');
//         // this.#gameInited = true;

//         try {
//             const url = new URL(window.location.origin);
//             const socketUrl = `wss://api.${url.host}/ws/game/${this.gameData.schedule_id}/`;
//             console.log('socket url: ', socketUrl);
//             const offscreencanvas = this.canvas.transferControlToOffscreen();
//             this.worker.postMessage(
//                 {
//                     message: 'game_worker_create_remote',
//                     // message: 'game_worker_create_local',
//                     offscreencanvas,
//                     socketUrl,
//                 },
//                 [offscreencanvas],
//             );
//         } catch (error) {
//             console.log('unable to connect to game websocket: ', error);
//         }
//     }

//     terminateGame() {
//         console.log('terminate game');
//         // console.log('game inited: ', this.#gameInited);
//         console.log('game started: ', this.#gameStarted);
//         // if (!this.#gameInited) return;
//         console.log('terminate game yoo');
//         this.worker.postMessage({ message: 'worker_game_terminate' });
//         // this.#gameInited = false;
//         this.worker.terminate();
//     }

//     startGame() {
//         console.log('start game');
//         // console.log('game inited: ', this.#gameInited);
//         console.log('game started: ', this.#gameStarted);
//         // if (!this.#gameInited || this.#gameStarted) return;
//         console.log('start game yoo');
//         this.worker.postMessage({ message: 'worker_game_start' });
//         this.#gameStarted = true;
//     }

//     quitGame() {
//         console.log('quit game');
//         // if (!this.#gameInited || !this.#gameStarted) return;
//         console.log('start game yoo');
//         this.worker.postMessage({ message: 'worker_game_quit' });
//         this.#gameStarted = false;
//     }

//     pauseGame() {
//         this.worker.postMessage({ message: 'worker_game_pause' });
//     }

//     continueGame() {
//         this.worker.postMessage({ message: 'worker_game_resume' });
//     }

//     resizeCanvas(newCanvasWidth, newCanvasHeight, dpr) {
//         console.log('resize canvas');
//         this.worker.postMessage({
//             message: 'worker_game_resize',
//             width: newCanvasWidth,
//             height: newCanvasHeight,
//             dpr,
//         });
//     }

//     get scorePlayerOne() {
//         return this.gameData.player_one.score;
//     }

//     get scorePlayerTwo() {
//         return this.gameData.player_two.score;
//     }

//     get playerOneWon() {
//         return this.gameData.player_one.won;
//     }

//     get playerTwoWon() {
//         return this.gameData.player_two.won;
//     }
// }
