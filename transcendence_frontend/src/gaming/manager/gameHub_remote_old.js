

import * as m from '../../modules.js'
import { pongMessageTypes, msg_to_worker_remote } from '../../modules.js';


export class GameHubRemote {

    static games = {
        pong: "pong",
        other: "other"
    }
    static gamesWorker = {
        pong: "/src/gaming/games/pong/remote/v1/worker_remote.js",
        other: "/src/gaming/games/pong/remote/v1/worker_remote.js"
    }
    
    
    static currentUser = m.sessionService.subscribe(null);



    /**
     * @param {HTMLCanvasElement} canvas
     * @param {string} game 
     * @param {APITypes.GameScheduleItem} gameData
     * @param {PongGameTypes.GameSettingsRemote} gameSettings
     */
    static async startGame(game, canvas, gameData, gameSettings) {
        // console.log("start game, user: ", GameHubRemote.currentUser);
        if (!GameHubRemote.currentUser.value) return ;

        // console.log("gameData: ", gameData);
        // const data = await fetcher.$post(`/game/play/${gameData.schedule_id}`, {});
        // // console.log("start game, data: ", data);
        return new GameHubRemote(game, canvas, gameData, gameSettings);
    }

    #gamesocket;
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {string} game 
     * @param {APITypes.GameScheduleItem} gameData
     * @param {PongGameTypes.GameSettingsRemote} gameSettings
     */
    constructor(game, canvas, gameData, gameSettings) {
        if (!GameHubRemote.gamesWorker[game] || !(canvas instanceof HTMLCanvasElement))
            throw new Error("No Canvas Element or no Worker Files");

        // console.log("gamehub constructor");
        this.gameData = gameData;
        this.gameSettings = gameSettings;

        this.worker = new Worker(GameHubRemote.gamesWorker[game], {
            type: "module"
        });
        console.log("worker: ", this.worker)

        this.worker.onerror = (ev) => {
            console.log(ev)
            this.terminateGame();
            throw new Error("WORKER ERROR");
        };
        this.worker.onmessageerror = (ev) => {
            this.terminateGame();
            throw new Error("WORKER MESSAGE ERROR");
        };
    

       

        try {
            this.#gamesocket = new WebSocket(`ws://127.0.0.1/ws/game/${this.gameData.schedule_id}/`);
            
        } catch (error) {
            // console.log("unable to connect to game websocket: ", error);
        }
        this.gameData.player_one.score = 0;
        this.gameData.player_two.score = 0;
        this.gameData.player_one.won = false;
        this.gameData.player_two.won = false;

        if (this.#gamesocket) {
            /** @param {MessageEvent} e */
            this.#gamesocket.onmessage = (e) => {
                // // console.log("game socket msg: ", e.data)
                /** @type {PongGameTypes.PongMessage} */
                const data = JSON.parse(e.data);
                // console.log("parsed ws data: ", data)
                if (data.msg === pongMessageTypes.INIT_GAME) {
                    // console.log("start game!");
                    this.initGame(data.data)
                } else if (data.msg === pongMessageTypes.START_GAME) {
                    // console.log("start game!");
                    this.startGame()
                } else if (data.msg === pongMessageTypes.GAME_END) {
                    // console.log("end game!");
                } else if (data.msg === pongMessageTypes.HIDE_BALL) {
                    // console.log("hide ball!");
                    this.worker.postMessage({message: msg_to_worker_remote.hide_ball, data: {} });
                } else if (data.msg === pongMessageTypes.SHOW_BALL) {
                    // console.log("show ball!");
                    this.worker.postMessage({message: msg_to_worker_remote.show_ball, data: {} });
                } else if (data.msg === pongMessageTypes.GAME_UPDATE) {
                    // console.log("update game!");
                    this.worker.postMessage({message: msg_to_worker_remote.update_pos, data: data.data})
                }
            }
        }

        const sendWsMsg = (data) => {
            try {
                this.#gamesocket?.send(JSON.stringify(data))
            } catch (error) {
                // console.log("unable to send data to game websocket: ", error);
            }
        }
        

        /** @param {KeyboardEvent} e */
        const handleKeyDown = (e) => {
            switch (e.key) {
                case "ArrowUp": sendWsMsg({ player_id: "player_two", action: "up"})
                    break;
                case "ArrowDown": sendWsMsg({ player_id: "player_two", action: "down"})
                    break;
                case "a": sendWsMsg({ player_id: "player_one", action: "up"})
                    break;
                case "y": sendWsMsg({ player_id: "player_one", action: "down"})
                    break;
            }
        }

        /** @param {KeyboardEvent} e */
        const handleKeyUp = (e) => {
            switch (e.key) {
                case "ArrowUp": sendWsMsg({ player_id: "player_two", action: "release_up"})
                    break;
                case "ArrowDown": sendWsMsg({ player_id: "player_two", action: "release_down"})
                    break;
                case "a": sendWsMsg({ player_id: "player_one", action: "release_up"})
                    break;
                case "y": sendWsMsg({ player_id: "player_one", action: "release_down"})
                    break;
            }
        }

        
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        
        this.canvas = canvas;

        this.createGame()
        
    }

    #quitGameAndPushResult() {

    }
   

    #gameTerminated = false;
    #gameCreated = false;
    #gameInited = false;
    #gameStarted = false;
    #gameQuited = false;
    createGame() {
        console.log("createGame")
        console.log("canvas: ", this.canvas);
        const offscreen = this.canvas.transferControlToOffscreen();
        this.worker.postMessage({ message: msg_to_worker_remote.create, data: {canvas: offscreen} }, [offscreen]);
        // this.worker.postMessage({ type: "canvas", canvas: offscreen }, [offscreen]);
        this.#gameCreated = true;
    }

    /** @param {PongGameTypes.StartGameData} startData */
    initGame(startData) {
        this.worker.postMessage({ message: msg_to_worker_remote.init, data: {gameSettings: startData.settings} });
        // this.worker.postMessage({ type: "canvas", canvas: offscreen }, [offscreen]);
        this.#gameInited = true;
    }

    startGame() {
        this.worker.postMessage({ message: msg_to_worker_remote.start, data: {} });
        this.#gameStarted = true;
    }

    terminateGame() {
        if (!this.#gameInited ) return ;
        this.#gameInited = false;
        this.worker?.terminate();
        this.#gamesocket?.close();
    }

    quitGame() {
        if (!this.#gameInited || !this.#gameStarted) return ;
        this.worker.postMessage({ message: msg_to_worker_remote.quit });
        this.#gameStarted = false;
    }

    pauseGame() {
        this.worker.postMessage({ message: msg_to_worker_remote.pause });
    }

    continueGame() {
        this.worker.postMessage({ message: msg_to_worker_remote.continue });
    }

    resizeCanvas(newCanvasWidth, newCanvasHeight, dpr) {
        this.worker.postMessage({
            message: msg_to_worker_remote.resize,
            data: {
                width: newCanvasWidth,
                height: newCanvasHeight,
                dpr: dpr
            }
        });
    }

    get scorePlayerOne() {
        return (this.gameData.player_one.score);
    }
    get scorePlayerTwo() {
        return (this.gameData.player_two.score);
    }

    get playerOneWon() {
        return (this.gameData.player_one.won)
    }

    get playerTwoWon() {
        return (this.gameData.player_two.won)
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
