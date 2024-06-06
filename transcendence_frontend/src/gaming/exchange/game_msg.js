/**
 * @typedef {object} GameSettings
 * @property {number} speed
 * @property {number} maxScore
 */

/**
 * @typedef {object} WorkerDataInit
 * @property {HTMLCanvasElement} canvas
 * @property {GameSettings} [gameSettings]
 */

/**
 * @typedef {object} WorkerDataResize
 * @property {number} width
 * @property {number} height
 * @property {number} dpr
 */

/**
 * @typedef {object} WorkerDataChangeColors
 * @property {string} colorWhite
 * @property {number} colorBlack
 */

/**
 * @typedef {object} WorkerDataKeyEvent
 * @property {string} keyevent
 * @property {string} key
 */

/**
 * @typedef {object} WorkerDataMouseEvent
 * @property {number} posX
 * @property {number} posY
 */

/**
 * @typedef {object} WorkerData
 * @property {number} message
 * @property {object | WorkerDataInit | WorkerDataResize | WorkerDataChangeColors | WorkerDataKeyEvent | WorkerDataMouseEvent} data
 */

export const msg_to_worker = {
    init: 0,
    start: 1,
    quit: 2,
    pause: 3,
    continue: 4,
    terminate: 5,
    resize: 6,
    keyEvent: 7,
    mouseEvent: 8,
    changeColor: 9,
};

export const msg_to_main = {
    player_1_score: 10,
    player_1_win: 20,
    player_2_score: 30,
    player_2_win: 40,
    draw_timeout: 50,
    error: 100,
};
