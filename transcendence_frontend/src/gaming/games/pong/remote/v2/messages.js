// /**
//  * @enum {number}
//  */
// const pongServerMessages = {
//     GAME_INIT: 1,
//     GAME_START: 2,
//     GAME_UPDATE: 3,
//     GAME_END: 4,
//     HIDE_BALL: 5,
//     SHOW_BALL: 6,
//     GAME_ERROR: 7,
//     GAME_PAUSED: 8,
//     GAME_RESUMED: 9,
//     OPPONENT_CONNECTED: 10,
//     OPPONENT_READY: 11,
//     OPPONENT_DISCONNECTED: 12,
// };

// /**
//  * @enum {number}
//  */
// const pongClientMessages = {
//     PLAYER_MOVE: 30,
//     START_GAME_REQUEST: 31,
//     PAUSE_GAME_REQUEST: 32,
//     RESUME_GAME_REQUEST: 33,
//     LEAVE_GAME: 34,
// };

// /**
//  * @type {"GAME_UPDATE"}
//  * @typedef {object} GameUpdateMessage
//  * @property {("GAME_UPDATE")extends string} type
//  * @property {ArrayBuffer} buffer
//  */

// /** @type {GameUpdateMessage} */
// const jo = {
//     type: pongServerMessages.GAME_UPDATE,
//     buffer: new ArrayBuffer(28),
// };

// export { pongServerMessages };
