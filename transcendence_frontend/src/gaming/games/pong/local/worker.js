// worker.js

import { msg_to_main, msg_to_worker } from './game_worker_messages.js';
import { Pong } from './worker_modules/main.js';



const states = {
    initialized: 0,
    started: 1,
    paused: 2,
    scored: 3,
    done: 4,
};

const baseSettings = {
    width: 3000,
    height: 2000,
    borderSize: 100,
    paddleWidth: 50,
    paddleHeight: 250,
    paddleSpeed: 200,
    paddlesPos: [
        { paddleCenterX: 1, paddleCenterY: 1, },
        { paddleCenterX: 1, paddleCenterY: 1, },
    ],
    ballSize: 50,
    ballSpeed: 200,
    ballPos: {
        ballCenterX: 1,
        ballCenterY: 1
    }
}

const updates = {
    players: [
        { paddleCenterX: 1, paddleCenterY: 1, score: 1 },
        { paddleCenterX: 1, paddleCenterY: 1, score: 1 },
    ],
    ball: {
        ballCenterX: 1,
        ballCenterY: 1
    }
}

export const s = {};
s.colorWhite    = "#ced4da";
s.colorBlack    = "#1a1d20";
"#ced4da" // dark-subtle - light
"#1a1d20" // dark-subtle - dark

s.width         = 300;
s.height        = 200;

s.border_width  = 5;
s.border_height = 5;

s.paddle_height = 25;
s.paddle_width  = 5;
s.paddle_dist   = 5;
s.paddle_l_x    = s.paddle_dist;
s.paddle_l_y    = (s.height / 2.0)  - (s.paddle_height / 2.0);
s.paddle_r_x    = s.width   - (s.paddle_dist + s.paddle_width);
s.paddle_r_y    = (s.height / 2.0)  - (s.paddle_height / 2.0);
s.paddle_speed  = 250; // in pixel per seconds

s.ball_height   = 5;
s.ball_width    = 5;
s.ball_x        = (s.width / 2.0)   - (s.ball_width / 2.0);
s.ball_y        = (s.height / 2.0)  - (s.ball_height / 2.0);
s.ball_speed    = 150; // in pixel per seconds

s.resetTime     = 1000;




/** @type {Pong | undefined} */
let game;

/** @param {MessageEvent} ev */
onmessage = (ev) => {
    /** @type {import('./game_worker_messages.js').WorkerData} */
    const msg = ev.data;
    console.log("onmessage: ");
    console.dir( ev.data)
    switch (msg.message) {
        case msg_to_worker.init: game = new Pong(msg.data);
            console.log("create new Pong instance");
            break;
        case msg_to_worker.start: game?.startGame();
            console.log("msg start game");
            break;
        case msg_to_worker.quit: game?.quitGame();
            console.log("msg quit game");
            break;
        case msg_to_worker.terminate:
            console.log("msg terminate game");
            break;
        case msg_to_worker.pause: game?.pauseGame();
            console.log("msg pause game");
            break;
        case msg_to_worker.continue: game?.continueGame();
            console.log("msg continue game");
            break;
        case msg_to_worker.resize: game?.setCanvasSizes(msg.data);
            console.log("msg set canvas sizes");
            break;
        case msg_to_worker.changeColor: game?.changeColor(msg.data);
            console.log("msg change color");
            break;
        case msg_to_worker.keyEvent: game?.handleKey(msg.data);
            console.log("msg handle key");
            break;
        case msg_to_worker.mouseEvent: game?.handleMouse(msg.data);
            console.log("msg handle mouse");
            break;
    }
};

