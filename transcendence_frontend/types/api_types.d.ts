/* eslint-disable prettier/prettier */
declare namespace APITypes {

    type JSONValue = string | number | boolean | null | undefined | { [x: string]: JSONValue; } | Array<JSONValue>;

    export interface ApiResponse<T extends JSONValue> {
        success: boolean;
        message: string;
        statuscode: number;
        data: T;
    }

    export interface LoginData {
        [key: string]: number;
        user_id: number;
    }

    // [key: string]: string | number | boolean | null;
    export interface BasicUserData {
        [key: string]: JSONValue;
        id: number;
        avatar: string;
        username: string;
        online: boolean | null;
    }

    // [key: string]: string | number | APITypes.BasicUserData[];
    export interface ChatRoomData {
        [key: string]: JSONValue;
        room_id: number;
        type: 'tournament' | 'private';
        users: APITypes.BasicUserData[];
    }

    export interface ChatMessageData {
        [key: string]: JSONValue;
        user_id: number;
        username: string;
        avatar: string;
        message: string;
        timestamp: string;
    }

    export interface ChatMessageList {
        [key: string]: JSONValue;
        room_id: number;
        ChatMessageData: ChatMessageData[];
        next_page: number;
    }


    export interface FriendUserData extends BasicUserData {
        [key: string]: JSONValue;
        email: string;
        first_name: string;
        last_name: string;
        last_login: string;
        is_mutual_friend: boolean;
    }
    export interface BlockedUserData extends BasicUserData {
        [key: string]: JSONValue;
        email: string;
        first_name: string;
        last_name: string;
        last_login: string;
    }

    export interface FriendRequestItem extends BasicUserData {
        [key: string]: JSONValue;
        request_id: number;
    }

    export type gameId = 0 | 1;
    export type GameIdString = "Pong" | "Other";
    export type GameMode = "1vs1" | "tournament";

    export interface GameInvitationItem extends BasicUserData {
        [key: string]: string | number | boolean | null | undefined;
        alias: string;
        invite_id: number;
        invitee?: number;
        inviter?: number;
        game_id: GameIdString;
        game_mode: GameMode;
        tournament: number;
    }

    export interface PlayerData extends BasicUserData {
        [key: string]: JSONValue;
        alias: string;
    }

    export interface GameScheduleItem {
        [key: string]: number | string | null | PlayerData | GameMode;
        schedule_id: number;
        game_id: GameIdString;
        game_mode: GameMode;
        tournament: number | null;
        duration: number;
        player_one: PlayerData;
        player_two: PlayerData;
    }

    export interface GameResultItem {
        [key: string]: number | string | PlayerData;
        match_id: number;
        game_id: GameIdString;
        game_mode: GameMode;
        tournament: number;
        player_one: PlayerData;
        player_two: PlayerData;
        player_one_score: number;
        player_two_score: number;
        date: string;
        winner: string;
    }

    export type TournamentStatus = "waiting" | "in progress" | "finished";
    export type TournamentMode = "single elimination" | "round robin";

    export interface TournamentItem {
        id: number,
        name: string,
        game_id: GameIdString,
        status: TournamentStatus;
    }

    export interface TournamentData {
        [key: string]: number | string | null | PlayerData | GameMode | PlayerData[] | GameScheduleItem[];
        id: number;
        name: string;
        game_id: GameIdString;
        mode: GameMode,
        creator: string,
        nb_player: number | null,
        rounds: number,
        status: TournamentStatus,
        stage: string,
        started: string | null,
        ended: string | null,
        winner: string | null,
        players: PlayerData[];
        schedules: GameScheduleItem[] | null;
        results: [] | null;
        leaderboard: [] | null;
    }

    export interface SearchResult extends BasicUserData {
        [key: string]: JSONValue;
        email: string;
        first_name: string;
        last_name: string;
    }

    export interface UserData extends BasicUserData {
        [key: string]: JSONValue;
        email: string;
        first_name: string;
        last_name: string;
        last_login: string;
        date_joined: string;
        alias: string;
        games_played: string;
        wins: string;
        losses: string;
        friends: FriendUserData[];
        blocked: BlockedUserData[];
        is_friend: boolean;
        is_self: boolean;
    }

    export interface UserSession {
        // [key: string]: UserData | GameInvitationData[] | GameScheduleItem[] | FriendRequestData[];
        user?: UserData;
        game_invitations_received?: GameInvitationItem[];
        game_invitations_sent?: GameInvitationItem[];
        game_schedule?: GameScheduleItem[];
        game_results?: GameResultItem[];
        friend_requests_received?: FriendRequestItem[];
        friend_requests_sent?: FriendRequestItem[];
    }


    // export interface FriendUserData {
    //     [key: string]: number | string | boolean;
    //     id: number;
    //     avatar: string;
    //     email: string;
    //     username: string;
    //     first_name: string;
    //     last_name: string;
    //     last_login: string;
    //     is_mutual_friend: boolean;
    // }
    // export interface BlockedUserData {
    //     [key: string]: number | string;
    //     id: number;
    //     avatar: string;
    //     email: string;
    //     username: string;
    //     first_name: string;
    //     last_name: string;
    //     last_login: string;
    // }

    // export interface FriendRequestItem {
    //     [key: string]: number | string;
    //     request_id: number;
    //     id: number;
    //     avatar: string;
    //     username: string;
    // }

    // export interface GameInvitationItem {
    //     [key: string]: number | string;
    //     id: number;
    //     invite_id: number;
    //     username: string;
    //     alias: string;
    //     avatar: string;
    //     game_id: number;
    //     game_mode: string;
    // }

    // export interface PlayerData {
    //     [key: string]: number | string | boolean;
    //     id: number;
    //     username: string;
    //     alias: string;
    //     avatar: string;
    // }

    // export type gameMode = "1vs1" | "tournament";
    // export type gameID = 0 | 1;

    // export interface GameScheduleItem {
    //     [key: string]: number | string | PlayerData | gameID | gameMode;
    //     schedule_id: number;
    //     game_id: gameID;
    //     game_mode: gameMode;
    //     duration: number;
    //     player_one: PlayerData;
    //     player_two: PlayerData;
    // }

    // export interface UserData {
    //     [key: string]: number | string | FriendUserData[] | BlockedUserData[] | boolean;
    //     id: number;
    //     username: string;
    //     email: string;
    //     first_name: string;
    //     last_name: string;
    //     avatar: string;
    //     last_login: string;
    //     date_joined: string;
    //     alias: string;
    //     games_played: string;
    //     wins: string;
    //     losses: string;
    //     friends: FriendUserData[];
    //     blocked: BlockedUserData[];
    //     is_friend: boolean;
    //     is_self: boolean;
    // }

    // export interface UserSession {
    //     // [key: string]: UserData | GameInvitationData[] | GameScheduleItem[] | FriendRequestData[];
    //     user?: UserData;
    //     game_invitations_received?: GameInvitationItem[];
    //     game_invitations_sent?: GameInvitationItem[];
    //     game_schedule?: GameScheduleItem[];
    //     friend_requests_received?: FriendRequestItem[];
    //     friend_requests_sent?: FriendRequestItem[];
    // }

    // export interface SearchResult {
    //     [key: string]: number | string;
    //     id: number;
    //     avatar: string;
    //     email: string;
    //     username: string;
    //     first_name: string;
    //     last_name: string;
    // }
}




// export interface UserData {
//     id: number;
//     avatar: string;
//     email: string;
//     username: string;
//     first_name: string;
//     last_name: string;
//     last_login: string;
//     friends: Array<FriendUserData>;
//     blocked: Array<BlockedUserData>;
//     requestsReceived: Array<RequestUserData>;
//     requestsSent: Array<RequestUserData>;
//     gameInvitationsReceived: Array<GameInvitations>;
//     gameInvitationsSent: Array<GameInvitations>;
//     gameSchedule: Array<GameScheduleItem>;
//     is_friend: boolean;
//     is_self: boolean;
// }
