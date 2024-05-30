
declare namespace PongGameTypes {
    export interface GameSettingsRemote {
        width: number;
        height: number;
        border_width: number;
        border_height: number;
        paddle_width: number;
        paddle_height: number;
        paddle_speed: number;
        wall_dist: number;
        ball_width: number;
        ball_height: number;
        ball_speed: number;
        point_wait_time: number;
        serve_mode: string;
        initial_serve_to: string;
        max_score: number;
        tick_duration: number;
    }

    export interface GameObj {
        x: number;
        y: number;
        dx: number;
        dy: number;
        direction?: number;
    }

    export interface GameState {
        ball: GameObj;
        paddle_left: GameObj;
        paddle_right: GameObj;
        score: {
            left: number;
            right: number;
        };
    }

    export interface UpdateGameData {
        state: GameState;
    }

    type GameUpdateMsgType = "game_update";
    type InitGameMsgType = "init_game";
    type StartGameMsgType = "start_game";
    type HideBallMsgType = "hide_ball";
    type ShowBallMsgType = "show_ball";
    type GameEndMsgType = "game_end";

    export interface GameUpdateMessage {
        msg: GameUpdateMsgType;
        data: UpdateGameData;
    }

    export interface StartGameData {
        settings: GameSettingsRemote;
    }

    export interface InitGameMessage {
        msg: InitGameMsgType;
        data: StartGameData;
    }

    export interface StartGameMessage {
        msg: StartGameMsgType;
        data: StartGameData;
    }

    export interface HideBallMessage {
        msg: HideBallMsgType;
        data: null;
    }

    export interface ShowBallMessage {
        msg: ShowBallMsgType;
        data: {
            state: GameState;
        };
    }

    export interface GameEndMessage {
        msg: GameEndMsgType;
        data: {
            winner: string;
        };
    }

    export type PongMessage =
        | GameUpdateMessage
        | InitGameMessage
        | StartGameMessage
        | HideBallMessage
        | ShowBallMessage
        | GameEndMessage;
}


declare namespace PongGameTypes2 {
    export interface GameSettingsRemote {
        width: number;
        height: number;
        border_width: number;
        border_height: number;
        paddle_width: number;
        paddle_height: number;
        paddle_speed: number;
        paddle_wall_dist_x: number;
        ball_width: number;
        ball_height: number;
        ball_speed: number;
        point_wait_time: number;
        serve_mode: string;
        initial_serve_to: string;
        max_score: number;
        tick_duration: number;
    }

    export interface GameObj {
        x: number;
        y: number;
        dx: number;
        dy: number;
        direction?: number;
    }

    export interface GameState {
        ball: GameObj;
        paddle_left: GameObj;
        paddle_right: GameObj;
        score: {
            left: number;
            right: number;
        };
    }

    type InitGameMsgType = "init_game";
    type StartGameMsgType = "start_game";
    type UpdateGameMsgType = "update_game";
    type EndGameMsgType = "end_game";

    type PauseGameMsgType = "pause_game";
    type ContinueGameMsgType = "continue_game";

    type HideBallMsgType = "update_score";
    type ShowBallMsgType = "new_round";

    type PlayerJoinedMsgType = "player_joined";

    export interface GameUpdateMessage {
        msg: UpdateGameMsgType;
        data: {
            state: GameState;
        }
    }

    export interface StartGameData {
        settings: GameSettingsRemote;
    }

    export interface InitGameMessage {
        msg: InitGameMsgType;
        data: StartGameData;
    }

    export interface StartGameMessage {
        msg: StartGameMsgType;
        data: StartGameData;
    }

    export interface HideBallMessage {
        msg: HideBallMsgType;
        data: null;
    }

    export interface ShowBallMessage {
        msg: ShowBallMsgType;
        data: {
            state: GameState;
        };
    }

    export interface GameEndMessage {
        msg: EndGameMsgType;
        data: {
            winner: string;
        };
    }

    export type PongMessage =
        | GameUpdateMessage
        | InitGameMessage
        | StartGameMessage
        | HideBallMessage
        | ShowBallMessage
        | GameEndMessage;

}

declare namespace PongRemoteServerMsgTypes {

    export interface GameSettings {
        border_width: number;
        border_height: number;
        paddle_width: number;
        paddle_height: number;
        paddle_speed_x: number;
        paddle_speed_y: number;
        paddle_wall_dist_x: number;
        ball_width: number;
        ball_height: number;
        ball_speed_x: number;
        ball_speed_y: number;
        point_wait_time: number;
        serve_mode: string;
        initial_serve_to: string;
        max_score: number;
        tick_duration: number;
    }

    export interface InitGameMessage {
        msg: "init_game";
        data: {
            settings: GameSettings;
            state: GameState
        }
    }

    export interface StartGameMessage {
        msg: "start_game";
        data: {
            settings: GameSettings;
        }
    }


    export interface GameObject {
        x: number;
        y: number;
        dx: number;
        dy: number;
    }

    export interface GameState {
        timestamp: number;
        debug: null | Object;
        ball: GameObject;
        paddle_left: GameObject;
        paddle_right: GameObject;
    }
    export interface GameUpdateMessage {
        msg: "update_game";
        data: {
            state: GameState;
        }
    }
    export interface GameEndMessage {
        msg: "end_game";
        data: {
            winner: string;
        };
    }

    export interface HideBallMessage {
        msg: "hide_ball";
        data: null;
    }

    export interface ShowBallMessage {
        msg: "show_ball";
        data: {
            state: GameState;
        };
    }
        
    export interface PlayerJoined {
        msg: "player_joined";
        data: null;
    }

    export type PongMessage =
        | InitGameMessage
        | StartGameMessage
        | GameUpdateMessage
        | GameEndMessage
        | HideBallMessage
        | ShowBallMessage
        | PlayerJoined;
   
}



declare namespace PongRemoteClientMsgTypes {
    export interface PauseGame {
        msg: "pause_game";
    }
    export interface ContinueGame {
        msg: "continue_game";
    }
    export interface UpdatePlayerMove {
        msg: "update_player_move";
        player_id: "player_one" | "player_two";
        action: "up" | "down" | "release_up" | "release_down" | "none";
    }
    export type ClientMessageTypes =
        | UpdatePlayerMove
        | PauseGame
        | ContinueGame;
}






declare namespace GameWorkerTypes {
   
    
    export interface Create {
        message: "worker_game_create";
        canvas: OffscreenCanvas;
    }
    export interface GameWorkerInit {
        message: "worker_game_init";
        settings: PongRemoteServerMsgTypes.GameSettings;
        state: PongRemoteServerMsgTypes.GameState;
    }
    export interface GameWorkerStart {
        message: "worker_game_start";
    }
    export interface GameWorkerQuit {
        message: "worker_game_quit";
    }
    export interface GameWorkerPause {
        message: "worker_game_pause";
    }
    export interface GameWorkerContinue {
        message: "worker_game_continue";
    }
    export interface GameWorkerTerminate {
        message: "worker_game_terminate";
    }
    export interface GameWorkerResize {
        message: "worker_game_resize";
        width: number;
        height: number;
        dpr: number;
    }
    export interface GameWorkerKeyEvent {
        message: "worker_game_keyevent";
        keyevent: string;
        key: string;
    }
    export interface GameWorkerMouseEvent {
        message: "worker_game_mouseevent";
        posX: number;
        posY: number;
    }
    export interface GameWorkerChangeColor {
        message: "worker_game_change_color";
        colorWhite: string;
        colorBlack: string;
    }
    export interface GameWorkerUpdatePos {
        message: "worker_game_update_pos";
        state: PongRemoteServerMsgTypes.GameState;
    }
    export interface GameWorkerHideBall {
        message: "worker_game_hide_ball";
    }
    export interface GameWorkerShowBall {
        message: "worker_game_show_ball";
    }

    
    export type GameWorkerMessage = 
        | Create
        | GameWorkerInit
        | GameWorkerStart
        | GameWorkerQuit
        | GameWorkerPause
        | GameWorkerContinue
        | GameWorkerTerminate
        | GameWorkerResize
        | GameWorkerKeyEvent
        | GameWorkerMouseEvent
        | GameWorkerChangeColor
        | GameWorkerUpdatePos
        | GameWorkerHideBall
        | GameWorkerShowBall;

}


declare namespace GameWorkerTypesOld {
    export interface WorkerDataInit {
        canvas: HTMLCanvasElement;
    }
    
    export interface WorkerDataResize {
        width: number;
        height: number;
        dpr: number;
    }
    
    export interface WorkerDataChangeColors {
        colorWhite: string;
        colorBlack: number;
    }
    
    export interface WorkerDataKeyEvent {
        keyevent: string;
        key: string;
    }
    
    export interface WorkerDataMouseEvent {
        posX: number;
        posY: number;
    }
    
    export type WorkerData =
        | WorkerDataInit
        | WorkerDataResize
        | WorkerDataChangeColors
        | WorkerDataKeyEvent
        | WorkerDataMouseEvent
        | { [key: string]: any };


    type GameWorkerMsgCreate = "worker_game_create";
    type GameWorkerMsgInit = "worker_game_init";
    type GameWorkerMsgStart = "worker_game_start";
    type GameWorkerMsgQuit = "worker_game_quit";

    type GameWorkerMsgPause = "worker_game_pause";
    type GameWorkerMsgContinue = "worker_game_continue";

    type GameWorkerMsgTerminate = "worker_game_terminate";
    type GameWorkerMsgResize = "worker_game_resize";
    type GameWorkerMsgKeyEvent = "worker_game_keyevent";
    type GameWorkerMsgMouseEvent = "worker_game_mouseevent";
    type GameWorkerMsgChangeColor = "worker_game_change_color";
    type GameWorkerMsgUpdatePos = "worker_game_update_pos";
    type GameWorkerMsgHideBall = "worker_game_hide_ball";
    type GameWorkerMsgShowBall = "worker_game_show_ball";


    export interface WorkerMessage {
        message: number;
        data: WorkerData;
    }
}
