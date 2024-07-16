
const WebsocketErrorCode = {
    OK: 4000,
    NON_CLOSING_ERROR: 4100,
    GAME_ALREADY_CREATED: 4101,
    USER_ALREADY_JOINED_GAME: 4102,
    INVALID_COMMAND: 4103,
    DEFAULT_ERROR: 4199,
    CLOSING_ERROR: 4200,
    NOT_AUTHENTICATED: 4201,
    ALREADY_RUNNING_GAME_SESSION: 4202,
    INVALID_SCHEDULE_ID: 4203,
    INVALID_USER_ID: 4204,
    USER_NO_PARTICIPANT: 4205,
    JOIN_TIMEOUT: 4206,
    RECONNECT_TIMEOUT: 4207,
    IDLE_TIMEOUT: 4208,
    INTERNAL_ERROR: 4209,
};

function getErrorMessage(code) {
    switch (code) {
        case WebsocketErrorCode.OK:
            return 'OK';
        case WebsocketErrorCode.NON_CLOSING_ERROR:
            return 'Non-closing error';
        case WebsocketErrorCode.GAME_ALREADY_CREATED:
            return 'Game already created';
        case WebsocketErrorCode.USER_ALREADY_JOINED_GAME:
            return 'User already joined game';
        case WebsocketErrorCode.INVALID_COMMAND:
            return 'Invalid command';
        case WebsocketErrorCode.DEFAULT_ERROR:
            return 'Default error';
        case WebsocketErrorCode.CLOSING_ERROR:
            return 'Closing error';
        case WebsocketErrorCode.NOT_AUTHENTICATED:
            return 'Not authenticated';
        case WebsocketErrorCode.ALREADY_RUNNING_GAME_SESSION:
            return 'Already running game session';
        case WebsocketErrorCode.INVALID_SCHEDULE_ID:
            return 'Invalid schedule ID';
        case WebsocketErrorCode.INVALID_USER_ID:
            return 'Invalid user ID';
        case WebsocketErrorCode.USER_NO_PARTICIPANT:
            return 'User no participant';
        case WebsocketErrorCode.JOIN_TIMEOUT:
            return 'Join timeout';
        case WebsocketErrorCode.RECONNECT_TIMEOUT:
            return 'Reconnect timeout';
        case WebsocketErrorCode.IDLE_TIMEOUT:
            return 'Idle timeout';
        case WebsocketErrorCode.INTERNAL_ERROR:
            return 'Internal error';
        default:
            return 'Unknown error code';
    }
}

/** @type {WebSocket | undefined} */
let socket;

/**
 * @param {PongClientTypes.ClientCommandResponse} msg
 */
function printCommandResponse(msg) {
    console.log('----- COMMAND RESPONSE ----');
    console.log(`cmd ${msg.cmd}`);
    console.log(`id ${msg.id}`);
    console.log(`success ${msg.success}`);
    console.log(`message ${msg.message}`);
    console.log(`status_code ${msg.status_code}`);
}

/**
 * @param {PongServerTypes.ServerMessage} broadcast
 */
function handleServerBroadCast(broadcast) {
    // console.log('----- SERVER BROADCAST ----');
    // console.log(broadcast);
    if (!game)
        throw new Error(`server message before game initialized???: ${broadcast}`);
    switch (broadcast.tag) {
        case 'pong':
            // game.handeTimeSync(broadcast);
            break;
        case 'server-game-ready':
            console.log('JOOO INITIALISIERE DATEN vom Server');
            game.initGameObjects(broadcast);
            break;
        case 'server-game-start':
            game.startGame(broadcast.timestamp);
            break;
        case 'server-game-update':
            if (socket) pushCommandToSocket({cmd: "ping", client_timestamp_ms: performance.timeOrigin + performance.now()})
            game.updateGameObjects(broadcast);
            break;
        case 'server-game-end':
            console.log(`game has ended`);
            game.quitGame();
            break;
        case 'server-game-paused':
            game.pauseGame();
            break;
        case 'server-game-resumed':
            game.resumeGame();
            break;
        case 'server-user-connected':
            console.log(`user connected to the game`);
            break;
            case 'server-user-disconnected':
            console.log(`user disconnected from the game`);
            break;
            case 'server-user-surrendered':
            break;
        case 'server-game-error':
            throw new Error(broadcast.error);
        default:
            throw new Error(`unknown server broadcast: ${broadcast}`);
    }
}

/** @type {Map<string, PongClientTypes.ClientCommand>} */
const commandStack = new Map();
let commandNbr = 1;
/** @type {PongClientTypes.ClientCommand} */
let lastCommand;
/** @type {PongClientTypes.ClientMoveDirection | undefined} */
let lastMove;
/**
 *
 * @param {PongClientTypes.ClientCommand} command
 */
function pushCommandToSocket(command) {
    try {
        command.id = commandNbr;
        // commandStack.set(commandNbr.toString(), command);
        commandNbr += 1;
        lastCommand = command
        socket?.send(JSON.stringify(command));
    } catch (error) {
        console.log('error sent to socket: ', error);
    }
}


/**
 * @param {PongClientTypes.ClientCommandResponse} response
 */
function handleCommandResponse(response) {
    // printCommandResponse(response);
}


/**
 * @param {string} socketUrl
 */
function initSocket(socketUrl) {
    try {
        socket = new WebSocket(socketUrl);
        console.log('socket CREATET!!: ', socket);
        // setTimeout(() => {
        //     if (socket) {
        //         console.log('socket close!!');
        //         socket.close();
        //     }
        // }, 20000);

        /** @param {MessageEvent} e */
        socket.onmessage = (e) => {


            /** @type {PongClientTypes.ClientCommandResponse | PongServerTypes.ServerMessage} */
            const message = JSON.parse(e.data);
            // console.log('server message: ', message);
            if ('tag' in message) {
                handleServerBroadCast(message);
            } else {
                handleCommandResponse(message);
            }
        };

        /** @param {Event} e */
        socket.onerror = (e) => {
            console.log('---- WebSocket error: ', e, '----');
        };

        /** @param {CloseEvent} e */
        socket.onclose = (e) => {
            console.log('---- WebSocket closed ----');
            console.log(`code: ${e.code}`);
            console.log(`code string: ${getErrorMessage(e.code)}`);
            console.log(`reason: ${e.reason}`);
            console.log(`was clean?: ${e.wasClean}`);
            if (game) {
                game.quitGame();
            }
            if (e.code !== 1000) {
                pushMessageToMainThread({message: "from-worker-error", error: "Server closed the connection", errorCode: e.code});
            } else {
                pushMessageToMainThread({message: "from-worker-game-done", gameResults});
            }
            self.close();
        };
    } catch (error) {
        console.log('error: ', error);
    }
}
