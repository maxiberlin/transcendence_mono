// // worker_remote.js

// import {
//     pongMessageTypes,
//     msg_to_worker_remote,
// } from '../../../../exchange/game_msg_remote.js';
// import { PongRemote } from './main.js';

// const states = {
//     initialized: 0,
//     started: 1,
//     paused: 2,
//     scored: 3,
//     done: 4,
// };

// const baseSettings = {
//     width: 3000,
//     height: 2000,
//     borderSize: 100,
//     paddleWidth: 50,
//     paddleHeight: 250,
//     paddleSpeed: 200,
//     paddlesPos: [
//         { paddleCenterX: 1, paddleCenterY: 1 },
//         { paddleCenterX: 1, paddleCenterY: 1 },
//     ],
//     ballSize: 50,
//     ballSpeed: 200,
//     ballPos: {
//         ballCenterX: 1,
//         ballCenterY: 1,
//     },
// };

// const updates = {
//     players: [
//         { paddleCenterX: 1, paddleCenterY: 1, score: 1 },
//         { paddleCenterX: 1, paddleCenterY: 1, score: 1 },
//     ],
//     ball: {
//         ballCenterX: 1,
//         ballCenterY: 1,
//     },
// };

// export const s = {};
// s.colorWhite = '#ced4da';
// s.colorBlack = '#1a1d20';
// ('#ced4da'); // dark-subtle - light
// ('#1a1d20'); // dark-subtle - dark

// s.width = 300;
// s.height = 200;

// s.border_width = 5;
// s.border_height = 5;

// s.paddle_height = 25;
// s.paddle_width = 5;
// s.paddle_dist = 5;
// s.paddle_l_x = s.paddle_dist;
// s.paddle_l_y = s.height / 2.0 - s.paddle_height / 2.0;
// s.paddle_r_x = s.width - (s.paddle_dist + s.paddle_width);
// s.paddle_r_y = s.height / 2.0 - s.paddle_height / 2.0;
// s.paddle_speed = 250; // in pixel per seconds

// s.ball_height = 5;
// s.ball_width = 5;
// s.ball_x = s.width / 2.0 - s.ball_width / 2.0;
// s.ball_y = s.height / 2.0 - s.ball_height / 2.0;
// s.ball_speed = 150; // in pixel per seconds

// s.resetTime = 1000;

// /** @type {PongRemote | undefined} */
// let game;

// /** @param {MessageEvent} ev */
// onmessage = (ev) => {
//     /** @type {import('../../../../exchange/game_msg.js').WorkerData} */
//     const msg = ev.data;
//     console.log('onmessage: ');
//     console.dir(ev.data);
//     switch (msg.message) {
//         case msg_to_worker_remote.create_game:
//             game = new PongRemote(msg.data);
//             // console.log("create new Pong instance");
//             break;
//         case msg_to_worker_remote.init:
//             game?.initGameObjects(msg.data.gameSettings);
//             // console.log("create new Pong instance");
//             break;
//         case msg_to_worker_remote.start:
//             game?.startGame();
//             // console.log("msg start game");
//             break;
//         case msg_to_worker_remote.quit:
//             // console.log("msg quit game");
//             break;
//         case msg_to_worker_remote.terminate:
//             // console.log("msg terminate game");
//             break;
//         case msg_to_worker_remote.pause:
//             // console.log("msg pause game");
//             break;
//         case msg_to_worker_remote.continue:
//             // console.log("msg continue game");
//             break;
//         case msg_to_worker_remote.resize:
//             game?.setCanvasSizes(msg.data);
//             // console.log("msg set canvas sizes");
//             break;
//         case msg_to_worker_remote.changeColor:
//             game?.changeColor(msg.data);
//             // console.log("msg change color");
//             break;
//         case msg_to_worker_remote.update_pos:
//             game?.updateGameObjects(msg.data.state);
//             // console.log("msg change color");
//             break;
//     }
// };
