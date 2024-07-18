

const useScale = (scaleX, scaleY) => {
    const scY = 1 / scaleY;
    const scX = 1 / scaleX;
    // const ratio = scaleX / scaleY;
    return {
        downscaleX: (x) => x * scX,
        downscaleY: (y) => y * scY,
    };
};

/** @type {PongGameplayTypes.GameSettings} */
export const defaultSettings = {
    initial_serve_to: 'initial-serve-left',
    max_score: 10,
    point_wait_time_ms: 1000,
    serve_mode: 'serve-winner',
    tick_rate: 66,
};

const { downscaleX, downscaleY } = useScale(20000, 20000);
const sizesDefault = {
    width: downscaleX(20000),
    height: downscaleY(20000),
    paddle_width: downscaleX(300),
    paddle_height: downscaleY(2600),
    paddle_speed_x: downscaleX(0),
    paddle_speed_y: downscaleY(15000),
    wall_dist: downscaleX(300),
    ball_width: downscaleX(300),
    ball_height: downscaleY(600),
    ball_speed_x: downscaleX(10000),
    ball_speed_y: downscaleY(10000),
    border_width: downscaleX(600),
    border_height: downscaleY(600),
};

/** @type {PongGameplayTypes.GameObjData} */
export const courtDefault = {
    x: 0.0,
    y: sizesDefault.border_height,
    w: sizesDefault.width,
    h: sizesDefault.height - 2 * sizesDefault.border_height,
    speed_x: 0.0,
    speed_y: 0.0,
    dx: 0.0,
    dy: 0.0,
    bound_left: 0.0,
    bound_right: 1.0,
    bound_top: 0.0,
    bound_bottom: 0.0,
};

/** @type {PongGameplayTypes.GameObjData} */
export const paddleLeftDefault = {
    x: sizesDefault.wall_dist,
    y: sizesDefault.height / 2.0 - sizesDefault.paddle_height / 2.0,
    w: sizesDefault.paddle_width,
    h: sizesDefault.paddle_height,
    speed_x: sizesDefault.paddle_speed_x,
    speed_y: sizesDefault.paddle_speed_y,
    dx: 0.0,
    dy: 0.0,
    bound_left: courtDefault.x,
    bound_right: courtDefault.w,
    bound_top: courtDefault.y,
    bound_bottom: courtDefault.y + courtDefault.h,
};

/**  @type {PongGameplayTypes.GameObjData} */
export const paddleRightDefault = {
    x:
        sizesDefault.width -
        (sizesDefault.wall_dist + sizesDefault.paddle_width),
    y: sizesDefault.height / 2.0 - sizesDefault.paddle_height / 2.0,
    w: sizesDefault.paddle_width,
    h: sizesDefault.paddle_height,
    speed_x: sizesDefault.paddle_speed_x,
    speed_y: sizesDefault.paddle_speed_y,
    dx: 0.0,
    dy: 0.0,
    bound_left: courtDefault.x,
    bound_right: courtDefault.w,
    bound_top: courtDefault.y,
    bound_bottom: courtDefault.y + courtDefault.h,
};

/** @type {PongGameplayTypes.GameObjData} */
export const ballDefault = {
    x: sizesDefault.width / 2.0 - sizesDefault.ball_width / 2.0,
    y: sizesDefault.height / 2.0 - sizesDefault.ball_height / 2.0,
    w: sizesDefault.ball_width,
    h: sizesDefault.ball_height,
    speed_x: sizesDefault.ball_speed_x,
    speed_y: sizesDefault.ball_speed_y,
    dx: 0.0,
    dy: 0.0,
    bound_left: courtDefault.x,
    bound_right: courtDefault.w,
    bound_top: courtDefault.y,
    bound_bottom: courtDefault.y + courtDefault.h,
};

// /**
//  * @param {APITypes.GameScheduleItem} data
//  * @returns {PongServerTypes.GameReady}
//  */
// const initialDataDefault = {
//     tag: 'server-game-ready',
//     timestamp: Date.now(),
//     court: courtDefault,
//     ball: ballDefault,
//     paddle_left: paddleLeftDefault,
//     paddle_right: paddleRightDefault,
//     settings: defaultSettings,
//     timeout_time_sec: 10,
//     user_id_left: -1,
//     user_id_right: -1,
// };
