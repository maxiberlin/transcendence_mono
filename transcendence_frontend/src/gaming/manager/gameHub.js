
import { sessionService, msg_to_main, msg_to_worker} from '../../modules.js'

/**
 * @typedef {Object} GameTwoCreateInfo
 * @property {number} initiator
 * @property {number} participant
 * @property {import('../exchange/game_msg.js').GameSettings} [settings]
 */

/**
 * @typedef {Object} GameTournamentCreateInfo
 * @property {number} initiator
 * @property {number[]} participants
 * @property {import('./game_worker_messages.js').GameSettings} [settings]
 */


export class GameHub {

    static games = {
        pong: "pong",
        other: "other"
    }
    static gamesWorker = {
        pong: "/src/games/pong/worker_new.js",
        other: "/src/games/pong/worker_new.js"
    }
    
    
    static currentUser = sessionService.subscribe(null);



   

    /** @param {GameTournamentCreateInfo} conf  */
    static createTournament(conf) {

    }

    /** @param {GameTwoCreateInfo} conf  */
    static createTwoPlayerGame(conf) {
        
    }

    /**
     * @param {HTMLCanvasElement} canvas
     * @param {string} game 
     * @param {import('../../../types/api_data.js').GameScheduleItem} gameData
     * @param {import('./game_worker_messages.js').GameSettings} gameSettings
     */
    static async startGame(game, canvas, gameData, gameSettings) {
        console.log("start game, user: ", GameHub.currentUser);
        if (!GameHub.currentUser.value) return ;

        console.log("gameData: ", gameData);
        // const data = await fetcher.$post(`/game/play/${gameData.schedule_id}`, {});
        // console.log("start game, data: ", data);
        return new GameHub(game, canvas, gameData, gameSettings);
    }

    /**
     * @param {HTMLCanvasElement} canvas
     * @param {string} game 
     * @param {import('../../../types/api_data.js').GameScheduleItem} gameData
     * @param {import('./game_worker_messages.js').GameSettings} gameSettings
     */
    constructor(game, canvas, gameData, gameSettings) {
        if (!GameHub.gamesWorker[game] || !(canvas instanceof HTMLCanvasElement))
            throw new Error("No Canvas Element or no Worker Files");

        console.log("gamehub constructor");
        this.gameData = gameData;
        this.gameSettings = gameSettings;

        this.worker = new Worker(GameHub.gamesWorker[game], {
            type: "module"
        });

        this.gameData.player_one.score = 0;
        this.gameData.player_two.score = 0;
        this.gameData.player_one.won = false;
        this.gameData.player_two.won = false;

        this.worker.onmessage = (ev) => {
            if (ev.data === msg_to_main.player_1_score && this.gameData.player_one.score) {
                this.gameData.player_one.score++;
            } else if (ev.data === msg_to_main.player_2_score && this.gameData.player_two.score) {
                this.gameData.player_two.score++;
            } else if (ev.data === msg_to_main.player_1_win) {
                this.gameData.player_one.won = true;
                this.pauseGame();
            } else if (ev.data === msg_to_main.player_2_win) {
                this.gameData.player_two.won = true;
                this.pauseGame();
            }
        };
        this.worker.onerror = (ev) => {
            console.log(ev)
            this.terminateGame();
            throw new Error("WORKER ERROR");
        };
        this.worker.onmessageerror = (ev) => {
            this.terminateGame();
            throw new Error("WORKER MESSAGE ERROR");
        };
    

        window.addEventListener("keydown", (e) => {
            this.worker.postMessage({ message: msg_to_worker.keyEvent, data: {keyevent: e.type, key: e.key} });
        });
        window.addEventListener("keyup", (e) => {
            this.worker.postMessage({ message: msg_to_worker.keyEvent, data: {keyevent: e.type, key: e.key} });
        });
        // window.addEventListener("mousemove", (e) => {

        // })
        
        this.canvas = canvas;
        
    }

    #quitGameAndPushResult() {

    }
   

    #gameTerminated = false;
    #gameInited = false;
    #gameStarted = false;
    #gameQuited = false;
    initGame() {
        if (this.#gameInited || this.#gameTerminated) return ;
        const offscreen = this.canvas.transferControlToOffscreen();
        this.worker.postMessage({ message: msg_to_worker.init, data: {canvas: offscreen} }, [offscreen]);
        // this.worker.postMessage({ type: "canvas", canvas: offscreen }, [offscreen]);
        this.#gameInited = true;
    }

    terminateGame() {
        if (!this.#gameInited ) return ;
        this.worker.postMessage({ message: msg_to_worker.terminate });
        this.#gameInited = false;
        this.worker.terminate();
    }

    startGame() {
        if (!this.#gameInited || this.#gameStarted) return ;
        this.worker.postMessage({ message: msg_to_worker.start });
        this.#gameStarted = true;
    }
    quitGame() {
        if (!this.#gameInited || !this.#gameStarted) return ;
        this.worker.postMessage({ message: msg_to_worker.quit });
        this.#gameStarted = false;
    }

    pauseGame() {
        this.worker.postMessage({ message: msg_to_worker.pause });
    }

    continueGame() {
        this.worker.postMessage({ message: msg_to_worker.continue });
    }

    resizeCanvas(newCanvasWidth, newCanvasHeight, dpr) {
        this.worker.postMessage({
            message: msg_to_worker.resize,
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
//      console.log("dpr: ", dpr)
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
// console.log("dpr: ", dpr)
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
