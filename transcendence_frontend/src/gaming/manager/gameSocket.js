import * as m from '../../modules.js'

export class GameManager {

    #gameSocket;

    /** @param {number} schedule_id */
    constructor(schedule_id) {
        this.#gameSocket = new WebSocket(`ws://127.0.0.1/ws/game/${schedule_id}/`);

        this.#gameSocket.onmessage = this.onWsMessage.bind(this);
    }
    

    /** @param {MessageEvent} e */
    onWsMessage(e) {
        /** @type {PongGameTypes2.PongMessage} */
        const msg = JSON.parse(e.data);
        switch (msg.msg) {
            case "init_game":
                this.initGame(msg.data);
                break;
            case "start_game":
                
                this.startGame();
                break;
            case "end_game":
                this.endGame();
                break;
            case "update_score"
                this.hideBall();
                break;
            case "new_round":
                this.showBall();
                break;
            case "update_game":
                
                this.updateGame(msg.data);
                break;
        }
    }

}

export class GameHubManager {

    static games = {
        pong: "pong",
        other: "other"
    }
    static gamesWorker = {
        pong: "/src/games/pong/worker_remote.js",
        other: "/src/games/pong/worker_remote.js"
    }
    
    
    static currentUser = m.sessionService.subscribe(null);



    /**
     * @param {HTMLCanvasElement} canvas
     * @param {string} game 
     * @param {APITypes.GameScheduleItem} gameData
     * @param {PongGameTypes.GameSettingsRemote} gameSettings
     */
    static async startGame(game, canvas, gameData, gameSettings) {
        if (!GameSocketManager.currentUser.value) return ;
        return new GameSocketManager(game, canvas, gameData, gameSettings);
    }

    #gamesocket;
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {string} game 
     * @param {APITypes.GameScheduleItem} gameData
     * @param {PongGameTypes.GameSettingsRemote} gameSettings
     */
    constructor(game, canvas, gameData, gameSettings) {
        if (!GameSocketManager.gamesWorker[game] || !(canvas instanceof HTMLCanvasElement))
            throw new Error("No Canvas Element or no Worker Files");

        // console.log("gamehub constructor");
        this.gameData = gameData;
        this.gameSettings = gameSettings;

        this.worker = new Worker(GameSocketManager.gamesWorker[game], {
            type: "module"
        });

        this.worker.onerror = (ev) => {
            // console.log(ev)
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
        const offscreen = this.canvas.transferControlToOffscreen();
        this.worker.postMessage({ message: msg_to_worker_remote.create, data: {canvas: offscreen} }, [offscreen]);
        // this.worker.postMessage({ type: "canvas", canvas: offscreen }, [offscreen]);
        this.#gameCreated = true;
    }

    /** @param {} startData */
    initGame(startData) {
        // this.worker.postMessage({ message: msg_to_worker_remote.init, data: {gameSettings: startData.settings} });
        // // this.worker.postMessage({ type: "canvas", canvas: offscreen }, [offscreen]);
        // this.#gameInited = true;
    }

    startGame() {
        // this.worker.postMessage({ message: msg_to_worker_remote.start, data: {} });
        // this.#gameStarted = true;
    }

    terminateGame() {
        // if (!this.#gameInited ) return ;
        // this.#gameInited = false;
        // this.worker?.terminate();
        // this.#gamesocket?.close();
    }

    quitGame() {
        // if (!this.#gameInited || !this.#gameStarted) return ;
        // this.worker.postMessage({ message: msg_to_worker_remote.quit });
        // this.#gameStarted = false;
    }

    pauseGame() {
        // this.worker.postMessage({ message: msg_to_worker_remote.pause });
    }

    continueGame() {
        // this.worker.postMessage({ message: msg_to_worker_remote.continue });
    }

    resizeCanvas(newCanvasWidth, newCanvasHeight, dpr) {
        // this.worker.postMessage({
        //     message: msg_to_worker_remote.resize,
        //     data: {
        //         width: newCanvasWidth,
        //         height: newCanvasHeight,
        //         dpr: dpr
        //     }
        // });
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




