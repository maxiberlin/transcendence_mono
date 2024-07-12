/* eslint-disable prettier/prettier */
declare namespace APITypes {

    type JSONValue = string | number | boolean | null | { [x: string]: JSONValue; } | Array<JSONValue>;

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

    export interface BasicUserData {
        id: number;
        avatar: string;
        username: string;
        online: boolean | null;
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

    export interface GameInvitationItem extends BasicUserData {
        [key: string]: JSONValue;
        alias: string;
        invite_id: number;
        game_id: number;
        game_mode: string;
    }

    export interface PlayerData extends BasicUserData {
        [key: string]: JSONValue;
        alias: string;
    }

    export type gameMode = "1vs1" | "tournament";
    export type gameID = 0 | 1;

    export interface GameScheduleItem {
        [key: string]: number | string | PlayerData | gameID | gameMode;
        schedule_id: number;
        game_id: gameID;
        game_mode: gameMode;
        duration: number;
        player_one: PlayerData;
        player_two: PlayerData;
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
