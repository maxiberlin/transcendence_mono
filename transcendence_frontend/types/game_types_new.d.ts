declare namespace PongGameplayTypes {
    // Enums

    export type ServeMode = 'serve-winner' | 'serve-loser' | 'serve-random';
    export type InitialServe = 'initial-serve-left' | 'initial-serve-right';
    export type ServeSide = 'serve-left' | 'serve-right';
    export type PongGameSides = 'left' | 'right';
    export type GameEndReason = 'reguar' | 'surrender' | 'timeout';

    // TypedDict equivalents
    export interface GameSettings {
        point_wait_time_ms: number;
        serve_mode: ServeMode;
        initial_serve_to: InitialServe;
        max_score: number;
        tick_rate: number;
    }

    export interface GameObjData {
        x: number;
        y: number;
        w: number;
        h: number;
        speed_x: number;
        speed_y: number;
        dx: number;
        dy: number;
        bound_top: number;
        bound_bottom: number;
        bound_left: number;
        bound_right: number;
    }

    // export interface GameObjDataInit {
    //     court: PongGameplayTypes.GameObjData;
    //     ball: PongGameplayTypes.GameObjData;
    //     paddle_left: PongGameplayTypes.GameObjData;
    //     paddle_right: PongGameplayTypes.GameObjData;
    //     settings: PongGameplayTypes.GameSettings;
    // }

    export interface GameObjPositionData {
        x: number;
        y: number;
        dx: number;
        dy: number;
    }

    // export interface GameUpdateData {
    //     ball: PongGameplayTypes.GameObjPositionData;
    //     paddle_left: PongGameplayTypes.GameObjPositionData;
    //     paddle_right: PongGameplayTypes.GameObjPositionData;
    // }
}

declare namespace PongServerTypes {
    export interface ServerBaseMessage {
        tag: string;
    }

    export interface Pong extends ServerBaseMessage {
        tag: 'pong';
        client_timestamp_ms: number;
        server_timestamp_ms: number;
    }

    export interface GameReady extends ServerBaseMessage {
        tag: 'server-game-ready';
        timestamp: number;
        court: PongGameplayTypes.GameObjData;
        ball: PongGameplayTypes.GameObjData;
        paddle_left: PongGameplayTypes.GameObjData;
        paddle_right: PongGameplayTypes.GameObjData;
        settings: PongGameplayTypes.GameSettings;
        timeout_time_sec: number;
        user_id_left: number;
        user_id_right: number;
    }

    export interface GameStart extends ServerBaseMessage {
        tag: 'server-game-start';
        timestamp: number;
    }

    export interface GameUpdate extends ServerBaseMessage {
        tag: 'server-game-update';
        timestamp: number;
        tickno: number;
        invalid_ticks: number;
        ball: PongGameplayTypes.GameObjPositionData;
        paddle_left: PongGameplayTypes.GameObjPositionData;
        paddle_right: PongGameplayTypes.GameObjPositionData;
    }

    export interface GameEnd extends ServerBaseMessage {
        tag: 'server-game-end';
        winner_side: PongGameplayTypes.PongGameSides;
        loser_side: string;
        winner_id: number;
        loser_id: number;
        player_one_id: number;
        player_two_id: number;
        player_one_score: number;
        player_two_score: number;
        reason: PongGameplayTypes.GameEndReason;
    }
    export interface PlayerScored extends ServerBaseMessage {
        tag: 'server-game-player-scored';
        side: PongGameplayTypes.PongGameSides;
        who_scored_id: number;
        player_one_id: number;
        player_two_id: number;
        player_one_score: number;
        player_two_score: number;
    }

    export interface GamePaused extends ServerBaseMessage {
        tag: 'server-game-paused';
        timestamp: number;
    }

    export interface GameResumed extends ServerBaseMessage {
        tag: 'server-game-resumed';
        timestamp: number;
    }

    export interface UserConnected extends ServerBaseMessage {
        tag: 'server-user-connected';
        timestamp: number;
        user_id: number;
    }

    export interface UserDisconnected extends ServerBaseMessage {
        tag: 'server-user-disconnected';
        timestamp: number;
        user_id: number;
    }

    export interface UserSurrendered extends ServerBaseMessage {
        tag: 'server-user-surrendered';
        timestamp: number;
        user_id: number;
    }

    export interface ServerInternalErr extends ServerBaseMessage {
        tag: 'server-game-error';
        timestamp: number;
        error: string;
        name: string;
        message: string;
    }

    // Type alias for ServerMessage
    export type ServerMessage =
        | Pong
        | GameReady
        | GameStart
        | GameUpdate
        | PlayerScored
        | GameEnd
        | GamePaused
        | GameResumed
        | UserConnected
        | UserDisconnected
        | UserSurrendered
        | ServerInternalErr;

    export type ServerMessageTags = ServerMessage['tag'];

    export type BroadcastCallback<T> = (br: Extract<PongServerTypes.ServerMessage, { tag: T; }>) => void;
}

declare namespace PongClientTypes {
    interface ClientBaseCommand {
        cmd: string;
        id?: number;
    }

    export interface Ping extends ClientBaseCommand {
        cmd: 'ping';
        client_timestamp_ms: number;
    }

    type ClientMoveDirection = 'up' | 'down' | 'release_up' | 'release_down';

    interface ClientUserPayload {
        user_id: number;
    }

    interface ClientReadyCommand extends ClientBaseCommand {
        cmd: 'client-ready';
    }

    interface ClientMoveCommand extends ClientBaseCommand {
        cmd: 'client-move';
        timestamp_sec: number;
        timestamp_ms?: number;
        action?: ClientMoveDirection;
        new_y?: number;
        tickno?: number;
        tick_diff?: number;
    }

    interface ClientPauseCommand extends ClientBaseCommand {
        cmd: 'client-pause';
    }

    interface ClientResumeCommand extends ClientBaseCommand {
        cmd: 'client-resume';
    }

    interface ClientJoinCommand extends ClientBaseCommand {
        cmd: 'client-join-game';
        schedule_id: number;
    }

    interface ClientLeaveCommand extends ClientBaseCommand {
        cmd: 'client-leave-game';
    }

    type ClientCommand =
        | Ping
        | ClientJoinCommand
        | ClientReadyCommand
        | ClientMoveCommand
        | ClientPauseCommand
        | ClientResumeCommand
        | ClientLeaveCommand;

    type ClientCommandTags = ClientCommand['cmd'];

    export interface ClientCommandResponse {
        success: boolean;
        cmd: ClientCommand['cmd'];
        id: number;
        message: string;
        status_code: number;
    }
    export type CommandResponseCallback<T> = (res: ClientCommandResponse & { cmd: T; }) => void;
}

declare namespace PongTypes {
    export type GeneralServerMessage = PongServerTypes.ServerMessage | PongClientTypes.ClientCommandResponse;
    export type GeneralServerTags = PongServerTypes.ServerMessageTags | PongClientTypes.ClientCommandTags;
    export type ServerMessageCallback<T> =
        T extends PongServerTypes.ServerMessageTags ? PongServerTypes.BroadcastCallback<T>
        : T extends PongClientTypes.ClientCommandTags ? PongClientTypes.CommandResponseCallback<T>
        : never;
}

declare namespace FromWorkerGameMessageTypes {
    export interface GameTouchValid {
        message: 'from-worker-game-touch-valid';
        valid: boolean;
        ident: number;
    }
    export interface GamePaused {
        message: 'from-worker-game-paused';
    }
    export interface GameResumed {
        message: 'from-worker-game-resumed';
    }
    export interface ClientConnected {
        message: 'from-worker-client-connected';
        user_id: number;
    }
    export interface ClientDisconnected {
        message: 'from-worker-client-disconnected';
        user_id: number;
    }
    export interface GameReady {
        message: 'from-worker-game-ready';
        startTime: number;
    }
    export interface GameError {
        message: 'from-worker-error';
        error: string;
        errorCode: number;
    }

    export interface PlayerScored {
        message: 'from-worker-player-scored';
        side: PongGameplayTypes.PongGameSides;
        who_scored_id: number;
        player_one_id: number;
        player_two_id: number;
        player_one_score: number;
        player_two_score: number;
    }

    export interface GameEnd {
        message: 'from-worker-game-done';
        winner_side: PongGameplayTypes.PongGameSides;
        loser_side: string;
        winner_id: number;
        loser_id: number;
        player_one_id: number;
        player_two_id: number;
        player_one_score: number;
        player_two_score: number;
        reason: PongGameplayTypes.GameEndReason;
    }
    export type FromWorkerMessage =
        | GameTouchValid
        | GameReady
        | GamePaused
        | GameResumed
        | ClientConnected
        | ClientDisconnected
        | GameError
        | PlayerScored
        | GameEnd;

    export type FromWorkerMessageTags = FromWorkerMessage['message'];
}

declare namespace ToWorkerGameMessageTypes {
    export interface Create {
        message: 'game_worker_create_remote' | 'game_worker_create_local';
        offscreencanvas: OffscreenCanvas;
        socketUrl?: string;
        data: APITypes.GameScheduleItem;
        userId: number;
    }
    export interface Init {
        message: 'worker_game_init';
    }
    export interface Start {
        message: 'worker_game_start';
    }
    export interface Quit {
        message: 'worker_game_quit';
    }
    export interface Pause {
        message: 'worker_game_pause';
    }
    export interface Resume {
        message: 'worker_game_resume';
    }
    export interface Terminate {
        message: 'worker_game_terminate';
    }
    export interface Resize {
        message: 'worker_game_resize';
        canvasX: number;
        canvasY: number;
        width: number;
        height: number;
        dpr: number;
    }
    export interface KeyEvent {
        message: 'worker_game_key';
        type: string;
        key: string;
    }
    export interface GameTouchRect {
        ident: number;
        left: number;
        right: number;
        top: number;
        bottom: number;
        y: number;
    }
    export interface GameTouchEvent {
        message: 'worker_game_touch';
        type: 'start' | 'move' | 'end';
        touchRect?: GameTouchRect;
        ident?: number;
    }
    export interface MouseEvent {
        message: 'worker_game_mouseevent';
        posX: number;
        posY: number;
    }
    export interface ChangeColor {
        message: 'worker_game_change_color';
        colorWhite: string;
        colorBlack: string;
    }

    export type ToWorkerMessage =
        | Create
        | Init
        | Start
        | Quit
        | Pause
        | Resume
        | Terminate
        | Resize
        | KeyEvent
        | MouseEvent
        | ChangeColor
        | GameTouchEvent;

    export type ToWorkerMessageTags = ToWorkerMessage['message'];
}

// declare namespace WorkerGameTypes {
//     export type GeneralWorkerMessage = FromWorkerGameMessageTypes.FromWorkerMessage | ToWorkerGameMessageTypes.ToWorkerMessage;
//     export type GeneralServerTags = PongServerTypes.ServerMessageTags | PongClientTypes.ClientCommandTags;
//     export type ServerMessageCallback<T> =
//         T extends PongServerTypes.ServerMessageTags ? PongServerTypes.BroadcastCallback<T>
//         : T extends PongClientTypes.ClientCommandTags ? PongClientTypes.CommandResponseCallback<T>
//         : never;
// }