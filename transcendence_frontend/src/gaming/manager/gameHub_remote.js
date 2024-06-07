import { sessionService } from '../../services/api/API.js';

export default class GameHubRemote {
    static games = {
        pong: 'pong',
        other: 'other',
    };

    static gamesWorker = {
        pong: '/src/gaming/games/pong/remote/v1/worker_remote.js',
        other: '/src/gaming/games/pong/remote/v1/worker_remote.js',
    };

    static currentUser = sessionService.subscribe(null);

    /**
     * @param {string} game
     * @param {HTMLCanvasElement} canvas
     * @param {APITypes.GameScheduleItem} gameData
     * @param {PongGameTypes.GameSettingsRemote} [gameSettings]
     * @returns {Promise<GameHubRemote | undefined>}
     */
    static async startGame(game, canvas, gameData, gameSettings) {
        // console.log("start game, user: ", GameHubRemote.currentUser);
        if (!GameHubRemote.currentUser.value) return undefined;

        // console.log("gameData: ", gameData);
        // const data = await fetcher.$post(`/game/play/${gameData.schedule_id}`, {});
        // // console.log("start game, data: ", data);
        return new GameHubRemote(game, canvas, gameData, gameSettings);
    }

    #gamesocket;

    /**
     * @param {string} game
     * @param {HTMLCanvasElement} canvas
     * @param {APITypes.GameScheduleItem} gameData
     * @param {PongGameTypes.GameSettingsRemote} [gameSettings]
     */
    constructor(game, canvas, gameData, gameSettings) {
        if (
            !GameHubRemote.gamesWorker[game] ||
            !(canvas instanceof HTMLCanvasElement)
        )
            throw new Error('No Canvas Element or no Worker Files');
        if (
            !GameHubRemote.gamesWorker[game] ||
            !(canvas instanceof HTMLCanvasElement)
        )
            throw new Error('No Canvas Element or no Worker Files');

        // console.log("gamehub constructor");
        this.gameData = gameData;
        this.gameSettings = gameSettings;

        this.worker = new Worker(GameHubRemote.gamesWorker[game], {
            type: 'module',
            type: 'module',
        });
        // console.log('worker: ', this.worker);

        this.worker.onerror = () => {
            // console.log(ev);
            throw new Error('WORKER ERROR');
        };
        this.worker.onmessageerror = () => {
            // console.log(ev);
            throw new Error('WORKER MESSAGE ERROR');
        };

        try {
            // this.#gamesocket = new WebSocket(`ws://127.0.0.1/ws/game/${this.gameData.schedule_id}/`);
            const url = new URL(window.location.origin);
            this.#gamesocket = new WebSocket(
                `wss://api.${url.host}/ws/game/${this.gameData.schedule_id}/`,
            );
            this.#gamesocket = new WebSocket(
                `wss://api.${url.host}/ws/game/${this.gameData.schedule_id}/`,
            );
        } catch (error) {
            // console.log("unable to connect to game websocket: ", error);
        }
        this.gameData.player_one.score = 0;
        this.gameData.player_two.score = 0;
        this.gameData.player_one.won = false;
        this.gameData.player_two.won = false;

        if (this.#gamesocket) {
            this.#gamesocket.onmessage = (e) => {
                this.onSocketMessage(JSON.parse(e.data));
            };
            this.#gamesocket.onmessage = (e) => {
                this.onSocketMessage(JSON.parse(e.data));
            };
        }

        /**
         * @type {PongRemoteClientMsgTypes.UpdatePlayerMove}
         */
        const keyAction = {
            msg: 'update_player_move',
            player_id:
                (
                    this.gameData.player_one.id ===
                    GameHubRemote.currentUser.value.id
                ) ?
                    'player_one'
                :   'player_two',
            action: 'none',
        };
        const keyUp =
            this.gameData.player_one.id === GameHubRemote.currentUser.value.id ?
                'a'
            :   'ArrowUp';
        const keyDown =
            this.gameData.player_one.id === GameHubRemote.currentUser.value.id ?
                'y'
            :   'ArrowDown';
            msg: 'update_player_move',
            player_id:
                (
                    this.gameData.player_one.id ===
                    GameHubRemote.currentUser.value.id
                ) ?
                    'player_one'
                :   'player_two',
            action: 'none',
        };
        const keyUp =
            this.gameData.player_one.id === GameHubRemote.currentUser.value.id ?
                'a'
            :   'ArrowUp';
        const keyDown =
            this.gameData.player_one.id === GameHubRemote.currentUser.value.id ?
                'y'
            :   'ArrowDown';

        /** @param {KeyboardEvent} e */
        const handleKey = (e) => {
            /** @type {PongRemoteClientMsgTypes.UpdatePlayerMove} */

            if (e.type === 'keydown' && e.key === keyUp) {
                // console.log('keydown');
                keyAction.action = 'up';
            } else if (e.type === 'keydown' && e.key === keyDown) {
                // console.log('keydown');
                keyAction.action = 'down';
            } else if (e.type === 'keyup' && e.key === keyUp) {
                // console.log('keyup');
                keyAction.action = 'release_up';
            } else if (e.type === 'keyup' && e.key === keyDown) {
                // console.log('rkeyup');
                keyAction.action = 'release_down';
            } else return;
            this.sendWebSocketMessage(keyAction);
        };
        window.addEventListener('keydown', handleKey);
        window.addEventListener('keyup', handleKey);

        // console.log('createGame');
        // console.log('canvas: ', canvas);
        const offscreen = canvas.transferControlToOffscreen();
        this.sendWorkerMessage(
            { message: 'worker_game_create', canvas: offscreen },
            [offscreen],
        );
        this.sendWorkerMessage(
            { message: 'worker_game_create', canvas: offscreen },
            [offscreen],
        );
    }

    /**
     * @param {PongRemoteServerMsgTypes.PongMessage} msg
     */
    onSocketMessage(msg) {
        if (!msg.msg) return;
        if (!msg.msg) return;
        switch (msg.msg) {
            case 'init_game':
                this.sendWorkerMessage({
                    message: 'worker_game_init',
                    settings: msg.data.settings,
                    state: msg.data.state,
                });
                break;
            case 'start_game':
                this.sendWorkerMessage({ message: 'worker_game_start' });
                break;
            case 'end_game':
                break;
            case 'hide_ball':
                this.sendWorkerMessage({ message: 'worker_game_hide_ball' });
                break;
            case 'show_ball':
                this.sendWorkerMessage({ message: 'worker_game_show_ball' });
                break;
            case 'update_game':
                this.sendWorkerMessage({
                    message: 'worker_game_update_pos',
                    state: msg.data.state,
                });
                break;
            default:
                break;
        }
    }

    /**
     * @param {number} width
     * @param {number} height
     * @param {number} dpr
     * @param {number} dpr
     */
    resizeCanvas(width, height, dpr) {
        this.sendWorkerMessage({
            message: 'worker_game_resize',
            width,
            height,
            dpr,
        });
        this.sendWorkerMessage({
            message: 'worker_game_resize',
            width,
            height,
            dpr,
        });
    }

    get scorePlayerOne() {
        return this.gameData.player_one.score;
        return this.gameData.player_one.score;
    }

    get scorePlayerTwo() {
        return this.gameData.player_two.score;
        return this.gameData.player_two.score;
    }

    get playerOneWon() {
        return this.gameData.player_one.won;
        return this.gameData.player_one.won;
    }

    get playerTwoWon() {
        return this.gameData.player_two.won;
        return this.gameData.player_two.won;
    }

    /**
     * @param {GameWorkerTypes.GameWorkerMessage} data
     * @param {Transferable[]} [transferArr]
     */
    sendWorkerMessage(data, transferArr) {
        if (transferArr) this.worker.postMessage(data, transferArr);
        else this.worker.postMessage(data);
        if (transferArr) this.worker.postMessage(data, transferArr);
        else this.worker.postMessage(data);
    }

    /**
     * @param {PongRemoteClientMsgTypes.ClientMessageTypes} data
     */
    sendWebSocketMessage(data) {
        try {
            this.#gamesocket?.send(JSON.stringify(data));
            this.#gamesocket?.send(JSON.stringify(data));
        } catch (error) {
            // console.log('unable to send data to game websocket: ', error);
        }
    }
}

// /**
//  * @typedef {Object} GameTwoCreateInfo
//  * @property {number} initiator
//  * @property {number} participant
//  * @property {import('./game_worker_messages').GameSettings} [settings]
//  */

// /**
//  * @typedef {Object} GameTournamentCreateInfo
//  * @property {number} initiator
//  * @property {number[]} participants
//  * @property {import('./game_worker_messages').GameSettings} [settings]
//  */

// export class GameHub {

//     static games = {
//         pong: "pong",
//         other: "other"
//     }
//     static gamesWorker = {
//         pong: "/src/games/pong/worker.js",
//         other: "/src/games/pong/worker.js"
//     }


//     static currentUser = sessionService.subscribe(null);

//     /** @param {GameTournamentCreateInfo} conf  */
//     static createTournament(conf) {

//     }

//     /** @param {GameTwoCreateInfo} conf  */
//     static createTwoPlayerGame(conf) {


//     }

//     /**
//      * @param {HTMLCanvasElement} canvas
//      * @param {string} game
//      * @param {string} game
//      * @param {import('./types').GameScheduleItem} gameData
//      * @param {import('./game_worker_messages').GameSettings} gameSettings
//      */
//     static async startTwoPlayerGame(game, canvas, gameData, gameSettings) {
//         if (!GameHub.currentUser.value) return ;
//         await fetcher.$post(`/game/play/${gameData.schedule_id}`, {});

//         return new GameHub(game, canvas, gameData, gameSettings);
//     }

//     /**
//      * @param {HTMLCanvasElement} canvas
//      * @param {string} game
//      * @param {string} game
//      * @param {import('./types').GameScheduleItem} gameData
//      * @param {import('./game_worker_messages').GameSettings} gameSettings
//      */
//     constructor(game, canvas, gameData, gameSettings) {
//         if (!GameHub.gamesWorker[game] || !(canvas instanceof HTMLCanvasElement))
//             throw new Error("No Canvas Element or no Worker Files");

//         this.gameData = gameData;
//         this.gameSettings = gameSettings;

//         this.worker = new Worker(GameHub.gamesWorker[game], {
//             type: "module"
//         });

//         this.gameData.player_one.score = 0;
//         this.gameData.player_two.score = 0;
//         this.gameData.player_one.won = false;
//         this.gameData.player_two.won = false;

//         this.worker.onmessage = (ev) => {
//             if (ev.data === msg_to_main.player_1_score && this.gameData.player_one.score) {
//                 this.gameData.player_one.score++;
//             } else if (ev.data === msg_to_main.player_2_score && this.gameData.player_two.score) {
//                 this.gameData.player_two.score++;
//             } else if (ev.data === msg_to_main.player_1_win) {
//                 this.gameData.player_one.won = true;
//             } else if (ev.data === msg_to_main.player_2_win) {
//                 this.gameData.player_two.won = true;
//             }
//         };
//         this.worker.onerror = (ev) => {
//         this.worker.onerror = (ev) => {
//             this.terminateGame();
//             throw new Error("WORKER ERROR");
//         };
//         this.worker.onmessageerror = (ev) => {
//             this.terminateGame();
//             throw new Error("WORKER MESSAGE ERROR");
//         };

//         window.addEventListener("keydown", (e) => {
//             this.worker.postMessage({ type: "event", keyevent: e.type, key: e.key });
//         });
//         window.addEventListener("keyup", (e) => {
//             this.worker.postMessage({ type: "event", keyevent: e.type, key: e.key });
//         });
//         // window.addEventListener("mousemove", (e) => {

//         // })


//         this.canvas = canvas;


//     }

//     #quitGameAndPushResult() {

//     }

//     #gameTerminated = false;
//     #gameInited = false;
//     #gameStarted = false;
//     #gameQuited = false;
//     initGame() {
//         if (this.#gameInited || this.#gameTerminated) return ;
//         const offscreen = this.canvas.transferControlToOffscreen();
//         this.worker.postMessage({ type: "canvas", canvas: offscreen }, [offscreen]);
//         this.#gameInited = true;
//     }

//     terminateGame() {
//         if (!this.#gameInited ) return ;
//         this.worker.postMessage({
//             type: "message",
//             message: msg_to_worker.terminate
//         });
//         this.#gameInited = false;
//         this.worker.terminate();
//     }

//     startGame() {
//         if (!this.#gameInited || this.#gameStarted) return ;
//         this.worker.postMessage({
//             type: "message",
//             message: msg_to_worker.start
//         });
//         this.#gameStarted = true;
//     }

//     pauseGame() {
//         this.worker.postMessage({
//             type: "message",
//             message: msg_to_worker.pause
//         });
//     }

//     resizeCanvas(newCanvasWidth, newCanvasHeight, dpr) {
//         this.worker.postMessage({
//             type: "message",
//             message: msg_to_worker.resize,
//             data: {
//                 w: newCanvasWidth,
//                 h: newCanvasHeight,
//                 dpr: dpr
//             }
//         });
//     }

//     get scorePlayerOne() {
//         return (this.gameData.player_one.score);
//     }
//     get scorePlayerTwo() {
//         return (this.gameData.player_two.score);
//     }

//     get playerOneWon() {
//         return (this.gameData.player_one.won)
//     }

//     get playerTwoWon() {
//         return (this.gameData.player_two.won)
//     }

// }

//      // updateScales(event.data.data.w, event.data.data.h, event.data.data.dpr);
//      const newWidth = event.data.data.w, newHeight = event.data.data.h, dpr = event.data.data.dpr;


//      sizes.currW = newWidth;
//      sizes.currH = newHeight;
// //      console.log("dpr: ", dpr)
//      ctx.canvas.width = Math.floor(newWidth * dpr);
//      ctx.canvas.height = Math.floor(newHeight * dpr);
//      ctx.scale(dpr, dpr);
//      gamePlane.setScale(newWidth, newHeight);
//      ball.setScale(newWidth, newHeight);
//      paddleL.setScale(newWidth, newHeight);
//      paddleR.setScale(newWidth, newHeight);
//      if (!pause)
//          render(performance.now());

//  }
// }
// };

// function updateScales(newWidth, newHeight, dpr) {
// sizes.currW = newWidth;
// sizes.currH = newHeight;
// // console.log("dpr: ", dpr)
// ctx.canvas.width = Math.floor(newWidth * dpr);
// ctx.canvas.height = Math.floor(newHeight * dpr);
// ctx.scale(dpr, dpr);
// gamePlane.setScale(newWidth, newHeight);
// ball.setScale(newWidth, newHeight);
// paddleL.setScale(newWidth, newHeight);
// paddleR.setScale(newWidth, newHeight);
// if (!pause)
//  render(performance.now());
// }
