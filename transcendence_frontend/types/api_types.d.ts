declare namespace APITypes {
    // eslint-disable-next-line no-use-before-define
    export type JSONValue = string | number | boolean | JSONObject | JSONArray;

    export interface JSONObject {
        [x: string]: JSONValue;
    }

    // eslint-disable-next-line prettier/prettier
    export interface JSONArray extends Array<JSONValue> { }

    export interface LoginData {
        success: boolean;
        message: string;
        user_id: number;
    }

    export interface FriendUserData {
        id: number;
        avatar: string;
        email: string;
        username: string;
        first_name: string;
        last_name: string;
        last_login: string;
        is_mutual_friend: boolean;
    }
    export interface BlockedUserData {
        id: number;
        avatar: string;
        email: string;
        username: string;
        first_name: string;
        last_name: string;
        last_login: string;
    }

    export interface RequestUserData {
        request_id: number;
        id: number;
        avatar: string;
        username: string;
    }

    export interface GameInvitations {
        invite_id: number;
        id: number;
        username: string;
        alias: string;
        avatar: string;
        game_id: number;
        game_mode: string;
    }

    export interface GameScheduleItem {
        schedule_id: number;
        game_id: string;
        game_mode: string;
        duration: number;
        player_one: {
            id: number;
            username: string;
            alias: string;
            avatar: string;
            score?: number;
            won?: boolean;
        };
        player_two: {
            id: number;
            username: string;
            alias: string;
            avatar: string;
            score?: number;
            won?: boolean;
        };
        gameSettings: {
            speed: number;
            maxScore: number;
        };
    }

    export interface UserData {
        id: number;
        avatar: string;
        email: string;
        username: string;
        first_name: string;
        last_name: string;
        last_login: string;
        friends: Array<FriendUserData>;
        blocked: Array<BlockedUserData>;
        requestsReceived: Array<RequestUserData>;
        requestsSent: Array<RequestUserData>;
        gameInvitationsReceived: Array<GameInvitations>;
        gameInvitationsSent: Array<GameInvitations>;
        gameSchedule: Array<GameScheduleItem>;
        is_friend: boolean;
        is_self: boolean;
    }

    export interface SearchResult {
        id: number;
        avatar: string;
        email: string;
        username: string;
        first_name: string;
        last_name: string;
    }
}
