declare namespace PongGameplayTypes {
    // Enums

    export type ServeMode = 'serve-winner' | 'serve-loser' | 'serve-random';
    export type InitialServe = 'initial-serve-left' | 'initial-serve-right';
    export type ServeSide = 'serve-left' | 'serve-right';

    // TypedDict equivalents
    export interface GameSettings {
        point_wait_time: number;
        serve_mode: ServeMode;
        initial_serve_to: InitialServe;
        max_score: number;
        tick_duration: number;
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
    export interface GameReady {
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

    export interface GameStart {
        tag: 'server-game-start';
        timestamp: number;
    }

    export interface GameUpdate {
        tag: 'server-game-update';
        timestamp: number;
        ball: PongGameplayTypes.GameObjPositionData;
        paddle_left: PongGameplayTypes.GameObjPositionData;
        paddle_right: PongGameplayTypes.GameObjPositionData;
    }

    export interface GameEnd {
        tag: 'server-game-end';
        timestamp: number;
        winner: string;
        looser: string;
    }

    export interface GamePaused {
        tag: 'server-game-paused';
        timestamp: number;
    }

    export interface GameResumed {
        tag: 'server-game-resumed';
        timestamp: number;
    }

    export interface UserConnected {
        tag: 'server-user-connected';
        timestamp: number;
    }

    export interface UserDisconnected {
        tag: 'server-user-disconnected';
        timestamp: number;
    }

    export interface UserSurrendered {
        tag: 'server-user-surrendered';
        timestamp: number;
    }

    export interface Error {
        tag: 'server-game-error';
        timestamp: number;
        error: string;
    }

    // Type alias for ServerMessage
    export type ServerMessage =
        | GameReady
        | GameStart
        | GameUpdate
        | GameEnd
        | GamePaused
        | GameResumed
        | UserConnected
        | UserDisconnected
        | UserSurrendered
        | Error;
}

declare namespace PongClientTypes {
    interface ClientBaseCommand {
        cmd: string;
        id?: number;
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
        action?: ClientMoveDirection;
        new_y?: number;
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

    interface ClientCommandResponse {
        success: boolean;
        cmd: string;
        id: number;
        message: string;
        status_code: number;
    }

    type ClientCommand =
        | ClientJoinCommand
        | ClientReadyCommand
        | ClientMoveCommand
        | ClientPauseCommand
        | ClientResumeCommand
        | ClientLeaveCommand;
}

// declare namespace WorkerGameMessageTypes {
//     export interface Create {
//         message: 'worker_game_create';
//         canvas: OffscreenCanvas;
//     }
//     export interface GameWorkerInit {
//         message: 'worker_game_init';
//         settings: PongServerTypes.GameStart;
//         state: PongServerTypes.GameUpdate;
//     }
//     export interface GameWorkerStart {
//         message: 'worker_game_start';
//     }
//     export interface GameWorkerQuit {
//         message: 'worker_game_quit';
//     }
//     export interface GameWorkerPause {
//         message: 'worker_game_pause';
//     }
//     export interface GameWorkerContinue {
//         message: 'worker_game_continue';
//     }
//     export interface GameWorkerTerminate {
//         message: 'worker_game_terminate';
//     }
//     export interface GameWorkerResize {
//         message: 'worker_game_resize';
//         width: number;
//         height: number;
//         dpr: number;
//     }
//     export interface GameWorkerKeyEvent {
//         message: 'worker_game_keyevent';
//         keyevent: string;
//         key: string;
//     }
//     export interface GameWorkerMouseEvent {
//         message: 'worker_game_mouseevent';
//         posX: number;
//         posY: number;
//     }
//     export interface GameWorkerChangeColor {
//         message: 'worker_game_change_color';
//         colorWhite: string;
//         colorBlack: string;
//     }
//     export interface GameWorkerUpdatePos {
//         message: 'worker_game_update_pos';
//         state: PongServerTypes.GameUpdate;
//     }
//     export interface GameWorkerHideBall {
//         message: 'worker_game_hide_ball';
//     }
//     export interface GameWorkerShowBall {
//         message: 'worker_game_show_ball';
//     }
//     export interface HereSocker {
//         message: 'worker_here_socket';
//         socket: WebSocket;
//     }

//     export type GameWorkerMessage =
//         | Create
//         | GameWorkerInit
//         | GameWorkerStart
//         | GameWorkerQuit
//         | GameWorkerPause
//         | GameWorkerContinue
//         | GameWorkerTerminate
//         | GameWorkerResize
//         | GameWorkerKeyEvent
//         | GameWorkerMouseEvent
//         | GameWorkerChangeColor
//         | GameWorkerUpdatePos
//         | GameWorkerHideBall
//         | GameWorkerShowBall
//         | HereSocker;
// }

declare namespace FromWorkerGameMessageTypes {
    export interface GamePaused {
        message: 'from-worker-game-paused';
    }
    export interface GameResumed {
        message: 'from-worker-game-resumed';
    }
    export interface ClientDisconnected {
        message: 'from-worker-client-disconnected';
    }
    export type FromWorkerMessage = GamePaused | GameResumed | ClientDisconnected;
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
        width: number;
        height: number;
        dpr: number;
    }
    export interface MoveEvent {
        message: 'worker_game_move';
        action?: PongClientTypes.ClientMoveDirection;
        new_y?: number;
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

    export type GameWorkerMessage =
        | Create
        | Init
        | Start
        | Quit
        | Pause
        | Resume
        | Terminate
        | Resize
        | MoveEvent
        | MouseEvent
        | ChangeColor;
}
