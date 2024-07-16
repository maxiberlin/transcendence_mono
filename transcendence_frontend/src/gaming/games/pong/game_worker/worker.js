/* eslint-disable prettier/prettier */
/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable no-unused-vars */
/* eslint-disable jsdoc/no-undefined-types */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
/* eslint-disable no-bitwise */
/* eslint-disable max-classes-per-file */

import Pong from './main.js';
// import { msg_to_worker } from '../../src/gaming/exchange/game_msg.js';

/** @type {Pong | undefined} */
let game;
let gameResults;


let userId;

/**
 * @param {FromWorkerGameMessageTypes.FromWorkerMessage} message 
 */
function pushMessageToMainThread(message) {
    self.postMessage(message);
}

/** @param {MessageEvent} ev */
onmessage = (ev) => {
    /** @type {ToWorkerGameMessageTypes.GameWorkerMessage} */
    const msg = ev.data;
    // console.log('onmessage: ', msg.message);
    // console.dir(ev.data);
    switch (msg.message) {
        case 'worker_game_touch':
            // console.log('new touch msg');
            const d = game?.handeTouch(msg);
            console.log('touch! new Y: ', d);
            if (socket && d) pushCommandToSocket({ cmd: 'client-move', new_y: d[1], timestamp_ms: d[0], timestamp_sec: d[0]/1000 });
            break;
        case 'game_worker_create_local':
            game = new Pong(msg);
            userId = msg.userId;
            break;
        case 'game_worker_create_remote':
            game = new Pong(msg);
            if (msg.socketUrl) initSocket(msg.socketUrl);
            userId = msg.userId;
            break;
        case 'worker_game_move':
            try {
                if (!game || (lastMove && lastMove == msg.action)) return;
                const timestamp_ms = game.movePaddle(msg.action, msg.new_y);
                if (!socket) return;
                if (lastCommand && lastCommand.cmd == "client-move" && lastCommand.action == msg.action) return;
                pushCommandToSocket({ cmd: 'client-move', new_y: msg.new_y, action: msg.action, timestamp_sec: timestamp_ms/1000});
                lastMove = msg.action
            } catch (error) {
                console.log(`error move paddle: ${error}`);
            }
            break;
        case 'worker_game_pause':
            if (socket) pushCommandToSocket({ cmd: 'client-pause' });
            else game?.pauseGame();
            break;
        case 'worker_game_resume':
            if (socket) pushCommandToSocket({ cmd: 'client-resume' });
            else game?.resumeGame();
            break;
        case 'worker_game_start':
            console.log('worker_game_start! socket?: ', socket);
            if (socket) {
                console.log('push to socket: client ready');
                pushCommandToSocket({ cmd: 'client-ready' });
            }else {
                game?.startGame();
            }
            break;
        case 'worker_game_quit':
            if (socket) pushCommandToSocket({ cmd: 'client-leave-game' });
            else game?.quitGame();
            self.close()
            console.log('CLOSE WORKER');
            break;
      
        case 'worker_game_resize':
            game?.setCanvasSizes(msg);
            break;
        case 'worker_game_change_color':
            game?.changeColor(msg);
            break;
        default:
            break;
    }
};

// /** @param {MessageEvent} ev */
// onmessage = (ev) => {
//     /** @type {ToWorkerGameMessageTypes.GameWorkerMessage} */
//     const msg = ev.data;
//     // console.log('onmessage: ', msg.message);
//     // console.dir(ev.data);
//     switch (msg.message) {
//         case 'game_worker_create_local':
//             game = new Pong(msg);
//             userId = msg.userId;
//             break;
//         case 'game_worker_create_remote':
//             game = new Pong(msg);
//             if (msg.socketUrl) initSocket(msg.socketUrl);
//             userId = msg.userId;
//             break;
//         case 'worker_game_move':
//             try {
//                 if (!game) return;
//                 const timestamp_ms = game.movePaddle(msg.action, msg.new_y);
//                 if (!socket) return;
//                 if (lastCommand.cmd == "client-move" && lastCommand.action == msg.action) return;
//                 pushCommandToSocket({ cmd: 'client-move', new_y: msg.new_y, action: msg.action, timestamp_sec: timestamp_ms/1000 });
                
//             } catch (error) {
//                 console.log(`error move paddle: ${error}`);
//             }
//             break;
//         case 'worker_game_pause':
//             if (socket) pushCommandToSocket({ cmd: 'client-pause' });
//             else game?.pauseGame();
//             break;
//         case 'worker_game_resume':
//             if (socket) pushCommandToSocket({ cmd: 'client-resume' });
//             else game?.resumeGame();
//             break;
//         case 'worker_game_start':
//             console.log('worker_game_start! socket?: ', socket);
//             if (socket) {
//                 console.log('push to socket: client ready');
//                 pushCommandToSocket({ cmd: 'client-ready' });
//             }else {
//                 game?.startGame();
//             }
//             break;
//         case 'worker_game_quit':
//             if (socket) pushCommandToSocket({ cmd: 'client-leave-game' });
//             else game?.quitGame();
//             self.close()
//             break;
      
//         case 'worker_game_resize':
//             game?.setCanvasSizes(msg);
//             break;
//         case 'worker_game_change_color':
//             game?.changeColor(msg);
//             break;
//         default:
//             break;
//     }
// };
