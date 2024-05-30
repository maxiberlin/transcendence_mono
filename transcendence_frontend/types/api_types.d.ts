declare namespace APITypes {

    export type JSONValue =
        | string
        | number
        | boolean
        | JSONObject
        | JSONArray;

    export interface JSONObject {
        [x: string]: JSONValue;
    }

    export interface JSONArray extends Array<JSONValue> { }

    export type ApiData =
        | LoginData
        | UserData;





    export interface LoginData extends Object {
        success: boolean;
        message: string;
        user_id: number;
    }

    export interface FriendUserData extends Object {
        id: number;
        avatar: string;
        email: string;
        username: string;
        first_name: string;
        last_name: string;
        last_login: string;
        is_mutual_friend: boolean;
    }
    export interface BlockedUserData extends Object {
        id: number;
        avatar: string;
        email: string;
        username: string;
        first_name: string;
        last_name: string;
        last_login: string;
    }

    export interface RequestUserData extends Object {
        request_id: number;
        id: number;
        avatar: string;
        username: string;
    }

    export interface GameInvitations extends Object {
        invite_id: number;
        id: number;
        username: string;
        alias: string;
        avatar: string;
    }

    export interface GameScheduleItem extends Object {
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
            speed: number,
            maxScore: number,
        };
    }


    export interface UserData extends Object {
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

    export interface SearchResult extends Object {
        id: number;
        avatar: string;
        email: string;
        username: string;
        first_name: string;
        last_name: string;
    }

}
