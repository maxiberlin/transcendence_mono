export const pongMessageTypes = {
    GAME_UPDATE: 'game_update',
    INIT_GAME: 'init_game',
    START_GAME: 'start_game',
    HIDE_BALL: 'hide_ball',
    SHOW_BALL: 'show_ball',
    GAME_END: 'game_end',
};

export const msg_to_worker_remote = {
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
    update_pos: 10,
    create: 11,
    hide_ball: 12,
    show_ball: 13,
};
