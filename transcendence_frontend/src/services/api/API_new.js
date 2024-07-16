import { Fetcher } from './api_helper.js';
import PubSub from '../../lib_templ/reactivity/PubSub.js';
import { ToastNotificationErrorEvent, ToastNotificationSuccessEvent } from '../../components/bootstrap/BsToasts.js';
import BaseBase from '../../lib_templ/BaseBase.js';
import PubSubConsumer from '../../lib_templ/reactivity/PubSubConsumer.js';

// export const fetcher = new Fetcher("http://127.0.0.1", {

// api endpoint at path /api
// export const fetcher = new Fetcher(window.location.origin + "/api", {
// export const fetcher = new Fetcher(window.location.origin + "/api", {
//     credentials: "include"
// });

// api at subdomain api.
const url = new URL(window.location.origin);
export const fetcher = new Fetcher(`${url.protocol}api.${url.host}`, {
    credentials: 'include',
});

export const userAPI = {
    /**
     * @param {string} username
     * @param {string} email
     * @param {string} password
     * @param {string} confirmPassword
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    register: async (username, email, password, confirmPassword) =>
        await fetcher.$post('/register', {
            bodyData: { username, email, password, confirmPassword },
        }),

    /**
     * @returns {Promise<APITypes.ApiResponse<APITypes.LoginData>>}
     */
    getCurrentSession: async () =>
        await fetcher.$get(`/login`),

    /**
     * @param {string} username
     * @param {string} password
     * @returns {Promise<APITypes.ApiResponse<APITypes.LoginData>>}
     */
    authenticate: async (username, password) =>
        await fetcher.$post(`/login`, { bodyData: { username, password } }),

    /**
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    logout: async () =>
        await fetcher.$post(`/logout`),

    /**
     * @param {number} user_id
     * @returns {Promise<APITypes.ApiResponse<APITypes.UserData>>}
     */
    getProfile: async (user_id) =>
        await fetcher.$get(`/profile/${user_id}`),

    /**
     * @param {number} user_id
     * @param {FormData} data
     * @returns {Promise<APITypes.ApiResponse<APITypes.UserData>>}
     */
    postProfile: async (user_id, data) =>
        await fetcher.$post(`/profile/${user_id}/edit`, {bodyData: data}),
    /**
     * @param {string} query
     * @returns {Promise<APITypes.ApiResponse<APITypes.SearchResult[]>>}
     */
    searchUser: async (query) =>
        await fetcher.$get(`/search`, { searchParams: new URLSearchParams({ q: query }) }),
};

export const friendAPI = {
    /**
     * @param {number} user_id
     * @returns {Promise<APITypes.ApiResponse<APITypes.FriendRequestItem[]>>}
     */
    getRequestsReceived: async (user_id) =>
        await fetcher.$get(`/friend/requests/${user_id}`),

    /**
     * @param {number} user_id
     * @returns {Promise<APITypes.ApiResponse<APITypes.FriendRequestItem[]>>}
     */
    getRequestsSent: async (user_id) =>
        await fetcher.$get(`/friend/requests-sent/${user_id}`),

    /**
     * @param {number} receiver_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    sendRequest: async (receiver_id) =>
        await fetcher.$post('/friend/request', { bodyData: { receiver_id } }),

    /**
     * @param {number} friend_request_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    cancelRequest: async (friend_request_id) =>
        await fetcher.$post(`/friend/request/cancel/${friend_request_id}`),

    /**
     * @param {number} friend_request_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    acceptRequest: async (friend_request_id) =>
        await fetcher.$post(`/friend/request/accept/${friend_request_id}`),

    /**
     * @param {number} friend_request_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    rejectRequest: async (friend_request_id) =>
        await fetcher.$post(`/friend/request/reject/${friend_request_id}`),

    /**
     * @param {number} receiver_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    removeFriend: async (receiver_id) =>
        await fetcher.$post('/friend/remove', { bodyData: { receiver_id } }),

    /**
     * @param {number} user_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    blockUser: async (user_id) =>
        await fetcher.$post(`/friend/block/${user_id}`),

    /**
     * @param {number} user_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    unblockUser: async (user_id) =>
        await fetcher.$post(`/friend/unblock/${user_id}`),
};

export const gameAPI = {
    /**
     * @param {number} schedule_id
     * @param {number} score_one
     * @param {number} score_two
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    postResult: async (schedule_id, score_one, score_two) =>
        await fetcher.$post(`/game/result`, { bodyData: {schedule_id, score_one, score_two} }),
    
    /**
     * @returns {Promise<APITypes.ApiResponse<APITypes.GameInvitationItem[]>>}
     */
    getInvitesReceived: async () =>
        await fetcher.$get(`/game/invites-recieved`),
    
    /**
     * @returns {Promise<APITypes.ApiResponse<APITypes.GameInvitationItem[]>>}
     */
    getInvitesSent: async () =>
        await fetcher.$get(`/game/invites-sent`),
    
    /**
     * @param {number} user_id 
     * @param {0 | 1} game_id 
     * @param {"1vs1" | "tournament"} game_mode 
     * @param {number} tournament_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    sendInvite: async (user_id, game_id, game_mode, tournament_id) =>
        await fetcher.$post(`/game/invite/${user_id}`, { bodyData: { game_id, game_mode, tournament: tournament_id } }),
    
    /**
     * @param {number} invite_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    acceptInvite: async (invite_id) =>
        await fetcher.$post(`/game/invite/accept/${invite_id}`),

    /**
     * @param {number} invite_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    cancelInvite: async (invite_id) =>
        await fetcher.$post(`/game/invite/cancel/${invite_id}`),
    
    /**
     * @param {number} invite_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    rejectInvite: async (invite_id) =>
        await fetcher.$post(`/game/invite/reject/${invite_id}`),
    
    /**
     * @param {string} name
     * @param {"round robin" | "single elimination" | "double elimination"} mode
     * @param {0 | 1} game_id 
     * @param {number[]} players 
     * @param {number} nb_rounds
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    createTournament: async (name, mode, game_id, players, nb_rounds=1) =>
        await fetcher.$post(`/game/tournament-create`, {
            bodyData: { name, mode, game_id, players, nb_players: players.length, nb_rounds }
        }),
    
    /**
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    getTournaments: async () =>
        await fetcher.$get(`/game/tournaments`),
    
    /**
     * @param {number} tournament_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    getTournamentDetails: async (tournament_id) =>
        await fetcher.$get(`/game/tournament-details/${tournament_id}`),
    
    /**
     * @param {number} tournament_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    startTournament: async (tournament_id) =>
        await fetcher.$post(`/game/tournament-start/${tournament_id}`),
    
    /**
     * @returns {Promise<APITypes.ApiResponse<APITypes.GameScheduleItem[]>>}
     */
    getGameSchedule: async () =>
        await fetcher.$post(`/game/schedule`),
    
    /**
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    getHistory: async () =>
        await fetcher.$get(`/game/history`),
    
    /**
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    getStats: async () =>
        await fetcher.$get(`/game/stats`),
    
    /**
     * @param {number} schedule_id
     * @returns {Promise<APITypes.ApiResponse<null>>}
     */
    startGame: async (schedule_id) =>
        await fetcher.$post(`/game/play/${schedule_id}`),
};


export class SessionStore {

    #isLoggedIn = false;

    /** @type {APITypes.UserSession | undefined} */
    #sessionData;

    get isLoggedIn() {
        return this.#isLoggedIn;
    }

    /**
     * 
     * @param {any} error 
    */
    //  * @param {boolean} notifyBadStatus 
    handleFetchError(error) {
        if (error instanceof DOMException)
            document.dispatchEvent(new ToastNotificationErrorEvent(`DOMException: ${error.name}: ${error.message}`))
        else if (error instanceof TypeError)
            document.dispatchEvent(new ToastNotificationErrorEvent(`TypeError: ${error.message}`))
        // else if (notifyBadStatus && error && error.message)
            
    }

    async registerAndLogin(username, email, password, confirmPassword) {
        try {
            const registerData = await userAPI.register(username, email, password, confirmPassword);
            if (!registerData.success)
                return registerData;
            return await this.login(username, password);
        } catch (error) {
            this.handleFetchError(error);
            return error;
        }
    }

    /**
     * 
     * @param {string} [username] 
     * @param {string} [password] 
     * @returns 
     */
    async login(username, password) {
        try {
            let loginData
            if (username && password) {
                console.log('login with credentials');
                loginData = await userAPI.authenticate(username, password);
            } else {
                console.log('login without credentials, fetch active');
                loginData = await userAPI.getCurrentSession();
                console.log(loginData);
            }
            if (loginData.success) {
                this.#isLoggedIn = true;
                await this.updateData(["all"], loginData.data.user_id)
            }
            return loginData;
        } catch (error) {
            this.handleFetchError(error);
        }
    }

    async logout() {
        try {
            await userAPI.logout();
            this.#isLoggedIn = false;
            this.#sessionData = undefined;
            this.#pubsub.publish(this.#sessionData);
        } catch (error) {
            this.handleFetchError(error);
        }
    }

    // /**
    //  * @param {"friends" | "blocked" | "game_invitations_received" | "game_invitations_sent" | "friend_requests_received" | "friend_requests_sent"} list
    //  * @param {number} user_id
    //  * @returns {APITypes.FriendUserData | APITypes.BlockedUserData | APITypes.GameInvitationItem | APITypes.FriendRequestItem | undefined}
    //  */
    // getUserFromList(list, user_id) {
    //     if (!this.#isLoggedIn || !this.#sessionData) return;
    //     let item;
    //     // if (list in this.#sessionData) item = this.#sessionData[list];

    //     if (list === "friend_requests_received")
    //         return this.#sessionData.friend_requests_received?.find((i)=> i.id == user_id);
    //     else if (list === "friend_requests_sent")
    //         return this.#sessionData.friend_requests_sent?.find((i)=> i.id == user_id);
    //     else if (list === "game_invitations_received")
    //         return this.#sessionData.game_invitations_received?.find((i)=> i.id == user_id);
    //     else if (list === "game_invitations_sent")
    //         return this.#sessionData.game_invitations_sent?.find((i)=> i.id == user_id);
    //     else if (list == "friends" && this.#sessionData.user)
    //         return this.#sessionData.user.friends?.find((i)=> i.id == user_id);
    //     else if (list == "blocked" && this.#sessionData.user)
    //         return this.#sessionData.user.blocked?.find((i)=> i.id == user_id);
    // }

    // if (list === "friend_requests_received") item = this.#sessionData.friend_requests_received;
    // else if (list === "friend_requests_sent") item = this.#sessionData.friend_requests_sent;
    // else if (list === "game_invitations_received") item = this.#sessionData.game_invitations_received;
    // else if (list === "game_invitations_sent") item = this.#sessionData.game_invitations_sent;
    // else if (list == "friends" && this.#sessionData.user) item = this.#sessionData.user.friends;
    // else if (list == "blocked" && this.#sessionData.user) item = this.#sessionData.user.blocked;

    getFriendReqRec = (user_id) => this.#sessionData?.friend_requests_received?.find((i)=> i.id === user_id);
    getFriendReqSent = (user_id) => this.#sessionData?.friend_requests_sent?.find((i)=> i.id === user_id);
    getGameInvitRec = (user_id) => this.#sessionData?.game_invitations_received?.find((i)=> i.id === user_id);
    getGameInvitSent = (user_id) => this.#sessionData?.game_invitations_sent?.find((i)=> i.id === user_id);
    getFriend = (user_id) => this.#sessionData?.user?.friends?.find((i)=> i.id === user_id);
    getBlocked = (user_id) => this.#sessionData?.user?.blocked?.find((i)=> i.id === user_id);

    /**
     * @param {number} user_id 
     * @param {"1vs1" | "tournament"} game_mode 
     * @param {0 | 1} game_id 
     */
    async sendGameInvitation(user_id, game_mode, game_id = 0) {
        if (!this.#isLoggedIn || !this.#sessionData) return;
        await gameAPI.sendInvite(user_id, game_id, game_mode, 0);
        await this.updateData(["game_invitations_sent"]);
    }

    async updateUserData(formData) {
        if (!this.#isLoggedIn || !this.#sessionData?.user) return;
        try {
            const ret = await userAPI.postProfile(this.#sessionData?.user?.id, formData);
            await this.updateData(["user"]);
            console.log('res uodate user data: ', ret);
            if (ret.statuscode === 200)
                document.dispatchEvent(new ToastNotificationSuccessEvent(ret.message))
        } catch (error) {
            this.handleFetchError(error);
        }
        
        
    }

    /**
     * @typedef {keyof APITypes.UserSession | "all"} ListItem
     * @param {ListItem[]} lists
     * @param {number} [user_id]
     * @returns {Promise<void>}
     */
    async updateData(lists, user_id) {
        if (this.#sessionData?.user) user_id = this.#sessionData.user.id;
        if (!user_id) throw new Error("unable to fetch data without the user id");
        /** @type {Promise<APITypes.ApiResponse<APITypes.UserData> | APITypes.ApiResponse<APITypes.FriendRequestItem[]> | APITypes.ApiResponse<APITypes.GameInvitationItem[]> | APITypes.ApiResponse<APITypes.GameScheduleItem[]>> []} */
        let promises = [];
        if (lists.length == 1 && lists[0] == "all") {
            console.log('fetch all');
            lists = ["user", "friend_requests_received", "friend_requests_sent", "game_invitations_received", "game_invitations_sent", "game_schedule"]
            promises = [
                userAPI.getProfile(user_id),
                friendAPI.getRequestsReceived(user_id),
                friendAPI.getRequestsSent(user_id),
                gameAPI.getInvitesReceived(),
                gameAPI.getInvitesSent(),
                gameAPI.getGameSchedule()
            ]
        } else {
            for (const list of lists) {
                switch (list) {
                    case "user":
                        promises.push(userAPI.getProfile(user_id));
                        break;
                    case "friend_requests_received":
                        promises.push(friendAPI.getRequestsReceived(user_id));
                        break;
                    case "friend_requests_sent":
                        promises.push(friendAPI.getRequestsSent(user_id));
                        break;
                    case "game_invitations_received":
                        promises.push(gameAPI.getInvitesReceived());
                        break;
                    case "game_invitations_sent":
                        promises.push(gameAPI.getInvitesSent());
                        break;
                    case "game_schedule":
                        promises.push(gameAPI.getGameSchedule());
                    default:
                        throw new Error("INVALID UPDATE ITEM");
                }
            }
        }
        try {
            console.log("promises: ", promises);
            const data = await Promise.all(promises);
            if (this.#sessionData === undefined) this.#sessionData = {}
            data.forEach((val, i) => {
                console.log('foreach push.., list[i]', lists[i], ", val: ", val);
                if (val.statuscode !== 200) document.dispatchEvent(new ToastNotificationErrorEvent(val.message))
                else if (this.#sessionData) this.#sessionData[lists[i]] = val.data
            });
            this.#pubsub.publish(this.#sessionData);  
        } catch (error) {
            this.handleFetchError(error);
        }
        
    }


    /**
     * @param {"add-friend" | "remove-friend" | "block-user" | "unblock-user"} action
     * @param {number} user_id
     */
    async handleUser(action, user_id) {
        console.log('handle action! user: ', this.#sessionData);
        if (!this.#isLoggedIn || !this.#sessionData) return;
        let data;
        try {
            if (action === "add-friend") {
                data = await friendAPI.sendRequest(user_id);
                await this.updateData(["friend_requests_sent"]);
            } else if (action === "remove-friend") {
                data = await friendAPI.removeFriend(user_id);
                await this.updateData(["user"]);
            } else if (action === "block-user") {
                data = await friendAPI.blockUser(user_id);
                await this.updateData(["user"]);
            } else if (action === "unblock-user") {
                data = await friendAPI.unblockUser(user_id);
                await this.updateData(["user"]);
            }
            if (data && data.statuscode !== 200)
                document.dispatchEvent(new ToastNotificationErrorEvent(data.message))
        } catch (error) {
            this.handleFetchError(error)
        }
    }


    /**
     * @param {"friend-reject" | "friend-accept" | "friend-cancel" | "game-reject" | "game-accept" | "game-cancel"} action
     * @param {number} request_id 
     */
    async handleRequest(action, request_id) {
        if (!this.#isLoggedIn || !this.#sessionData) return;
        try {
            let data;
            let toUpdate = [];
            if (action === "game-accept") {
                data = await gameAPI.acceptInvite(request_id);
                toUpdate = ["game_invitations_received", "game_schedule"];
            
            } else if (action === "game-reject") {
                data = await gameAPI.rejectInvite(request_id);
                toUpdate = ["game_invitations_received"]
            
            } else if (action === "game-cancel") {
                data = await gameAPI.cancelInvite(request_id);
                toUpdate = ["game_invitations_sent"]
            
            } else if (action === "friend-accept") {
                data = await friendAPI.acceptRequest(request_id);
                toUpdate = ["friend_requests_received", "user"]
            
            } else if (action === "friend-reject") {
                data = await friendAPI.rejectRequest(request_id);
                toUpdate = ["friend_requests_received"]
            
            } else if (action === "friend-cancel") {
                data = await friendAPI.cancelRequest(request_id);
                toUpdate = ["friend_requests_sent"]
            }
            if (data && data.statuscode !== 200) {
                console.log("dispatch stasu wrign!: ", data.message);
                document.dispatchEvent(new ToastNotificationErrorEvent(data.message));
            } else if (data) {
                await this.updateData(toUpdate);
            }
        } catch (error) {
            this.handleFetchError(error)
        }
    }


    /**
     * 
     * @param {BaseBase} [host]
     * @param {boolean} force 
     * @returns {PubSubConsumer<APITypes.UserSession | undefined>}
     */
    subscribe(host, force = false) {
        // console.log('subscribe to sessionService');
        return this.#pubsub.subscribe(this.#sessionData, host, force);
    }

    #pubsub = new PubSub();
}

export const sessionService = new SessionStore();

// export class SessionStore {
//     static loginStates = {
//         login_get_error_no_session: "no session",
//         login_get_ok_active_session: "You have an active session.",
//         login_post_error_credentials: "Invalid credentials",
//         login_post_error_account_disabled: "Account is disabled",
//         login_post_ok: "Login Successful",
//     }

//     constructor() {}
//     #isLoggedIn = false;

//     /** @type {APITypes.UserData | undefined} */
//     #userData;
//     get isLoggedIn() {
//         return (this.#isLoggedIn);
//     }
//     async fetchActiveSession() {
// //         // console.log("initial fetch to check active session");
//         try {
//             const loginData = await fetcher.$get("/login");
//             if (!loginData || !loginData.success) {
//                 this.#pubsub.publish(this.#userData);
//                 return false;
//             } else {
//                 await this.#fetchSessionUser(loginData.user_id);
//                 this.#pubsub.publish(this.#userData);
//             }
//         }
//         catch {
// //             // console.log(error)
//             return false;
//         }
//         // catch (error) {
// //         //     console.log(error)
//         //     return false;
//         // }

//     }

//     async login(username, password) {
//         const loginData = await fetcher.$post("/login", { bodyData: { username, password } } );
// //         // console.log("session: login: loginData: ", loginData);
//         if (loginData.success === true) {
//             await this.#fetchSessionUser(loginData.user_id);
// //             // console.log("login: after fetch user");

//             this.#pubsub.publish(this.#userData);
//         }
//         return (loginData);

//     }

//     async logout() {
//         try {
//             await fetcher.$post("/logout", {})
//             this.#isLoggedIn = false;
//             this.#userData = undefined;
//             this.#pubsub.publish(this.#userData);

//         } catch (error) {
// //             console.log(error)
//         }
//     }

//     /** @param {number} user_id @returns {APITypes.FriendUserData | undefined} */
//     getFriend(user_id) {
//         if (this.#userData)
//             return this.#userData.friends.find((friend)=>friend.id === user_id);
//     }
//     /** @param {number} user_id @returns {APITypes.FriendUserData | undefined} */
//     getBlocked(user_id) {
//         if (this.#userData)
//             return this.#userData.friends.find((friend)=>friend.id === user_id);
//     }
//     /** @param {number} user_id @returns {APITypes.RequestUserData | undefined} */
//     getSentRequest(user_id) {
//         if (this.#userData)
//             return this.#userData.requestsSent.find((friend)=>friend.id === user_id);
//     }
//     /** @param {number} user_id @returns {APITypes.RequestUserData | undefined} */
//     getReceivedRequest(user_id) {
//         if (this.#userData)
//             return this.#userData.requestsReceived.find((friend)=>friend.id === user_id);
//     }

//     getInvited(user_id) {
//         if (this.#userData) {
//             const sent = this.#userData.gameInvitationsSent.find((friend)=>friend.id === user_id);
//             if (sent) return sent;
//             return this.#userData.gameInvitationsReceived.find((friend)=>friend.id === user_id);
//         }
//     }

//     async refetchSessionUserData() {
//         if (!this.#isLoggedIn) return ;
//         await this.#fetchSessionUser(this.#userData?.id);
//         this.#pubsub.publish(this.#userData);
//     }

//     #fetchSessionUser(id) {
//         return Promise.all([
//             fetcher.$get(`/profile/${id}`),
//             this.#fetchRequestsReceived(id),
//             this.#fetchRequestsSent(id),
//             this.#fetchGameInvitationsReceived(id),
//             this.#fetchGameInvitationsSent(id),
//             this.#fetchGameSchedule(id)
//         ])
//         .then((data)=> {
//             if (data[0] && data[0].success === false)
//                 Promise.reject(data[0]);
//             if (data[1] && data[1].success === false)
//                 Promise.reject(data[1].message);
//             if (data[2] && data[2].success === false)
//                 Promise.reject(data[2].message);
//             if (data[3] && data[3].success === false)
//                 Promise.reject(data[3].message);
//             if (data[4] && data[4].success === false)
//                 Promise.reject(data[4].message);
//             if (data[5] && data[5].success === false)
//                 Promise.reject(data[5].message);
// //             // console.log("fetch session user data:" , data);
//             this.#isLoggedIn = true;
//             this.#userData = data[0];
//             if (this.#userData) {
//                 this.#userData.requestsReceived = data[1].data;
//                 this.#userData.requestsSent = data[2].data;
//                 this.#userData.gameInvitationsReceived = data[3].data;
//                 this.#userData.gameInvitationsSent = data[4].data;
//                 this.#userData.gameSchedule = data[5].data;
//             }
// //             // console.log("userData: ", this.#userData);
//         })
//     }
//     #fetchRequestsReceived(id) {
//         return fetcher.$get(`/friend/requests/${id}`);
//     }
//     #fetchRequestsSent(id) {
//         return fetcher.$get(`/friend/requests-sent/${id}`);
//     }
//     #fetchGameInvitationsReceived(id) {
//         return fetcher.$get(`/game/invites-recieved`);
//     }
//     #fetchGameInvitationsSent(id) {
//         return fetcher.$get(`/game/invites-sent`);
//     }
//     #fetchGameSchedule(id) {
//         return fetcher.$get(`/game/schedule`);
//     }

//     async blockUser(user_id) {
//         if (!this.#isLoggedIn) return ;
//         await fetcher.$get(`/friend/block/${user_id}`);
//         await this.#fetchSessionUser(this.#userData?.id);
//         this.#pubsub.publish(this.#userData);
//     }
//     async unblockUser(user_id) {
//         if (!this.#isLoggedIn) return ;
//         await fetcher.$get(`/friend/unblock/${user_id}`);
//         await this.#fetchSessionUser(this.#userData?.id);
//         this.#pubsub.publish(this.#userData);
//     }

//     async removeFriend(id) {
//         if (!this.#isLoggedIn) return ;
//         await fetcher.$post("/friend/remove", {bodyData: {receiver_id: id}});
//         await this.#fetchSessionUser(this.#userData?.id);
//         this.#pubsub.publish(this.#userData);
//     }

//     async sendFriendRequest(id) {
//         if (!this.#isLoggedIn || !this.#userData) return ;
// //         console.log("api - await send friend request");
//         await fetcher.$post("/friend/request", {bodyData: {receiver_id: id}});
// //         console.log("api - awaiting done send friend request");
//         const data = await this.#fetchRequestsSent(this.#userData?.id);
//         this.#userData.requestsSent = data.data;
//         this.#pubsub.publish(this.#userData);
//     }

//     async cancelFriendRequest(id) {
//         if (!this.#isLoggedIn || !this.#userData) return ;
// //         // console.log("cancel friend request: id: ", id);
//         await fetcher.$get(`/friend/request/cancel/${id}`);
//         // await fetcher.$post("/friend/request/cancel", {bodyData: {receiver_id: id}});
//         const data = await this.#fetchRequestsSent(this.#userData.id);
//         this.#userData.requestsSent = data.data;
//         this.#pubsub.publish(this.#userData);
//     }

//     async acceptFriendRequest(id) {
//         if (!this.#isLoggedIn || !this.#userData) return ;
// //         // console.log("accept friend request: id: ", id);
//         await fetcher.$get(`/friend/request/accept/${id}`);
//         const data = await this.#fetchRequestsReceived(this.#userData.id);
//         this.#userData.requestsReceived = data.data;
//         this.#pubsub.publish(this.#userData);
//     }

//     async rejectFriendRequest(id) {
//         if (!this.#isLoggedIn || !this.#userData) return ;
//         await fetcher.$get(`/friend/request/reject/${id}`);
//         const data = await this.#fetchRequestsReceived(this.#userData.id);
//         this.#userData.requestsReceived = data.data;
//         this.#pubsub.publish(this.#userData);
//     }

//     async sendGameInvitation(user_id) {
//         if (!this.#isLoggedIn || !this.#userData) return ;
//         // await fetcher.$post(`/game/invite/${user_id}`, {});
//         await fetcher.$post(`/game/invite/${user_id}`, {bodyData: {
//             game_id: 0,
//             game_mode: "1vs1",
//             tournament: null
//         }});
//         const data = await this.#fetchGameInvitationsSent();
//         this.#userData.gameInvitationsSent = data.data;
//     }
//     async acceptGameInvitation(invitation_id) {
//         if (!this.#isLoggedIn || !this.#userData) return ;
//         await fetcher.$post(`/game/invite/accept/${invitation_id}`, {});
//         const data = await this.#fetchGameInvitationsReceived();
//         this.#userData.gameInvitationsReceived = data.data;
//     }
//     async rejectGameInvitation(invitation_id) {
//         if (!this.#isLoggedIn || !this.#userData) return ;
//         await fetcher.$post(`/game/invite/reject/${invitation_id}`, {});
//         const data = await this.#fetchGameInvitationsReceived();
//         this.#userData.gameInvitationsReceived = data.data;
//     }
//     async startGameByScheduleId(schedule_id) {
//         if (!this.#isLoggedIn || !this.#userData) return ;
//         await fetcher.$post(`/game/play/${schedule_id}`, {});
//     }

//     subscribe(host, force=false) {
//         return this.#pubsub.subscribe(host, this.#userData, force);
//     }

//     #pubsub = new PubSub();

// }

// export const sessionService = new SessionStore();

// // /**
// //  * @typedef {import('./api_helper.js').JsonObj} LoginData
// //  * @property {boolean} success
// //  * @property {string} message
// //  * @property {number} [user_id]
// //  */

// // /**
// //  * @typedef {import('./types.ts').JSONObject} LoginData
// //  * @property {boolean} success
// //  * @property {string} message
// //  * @property {number} [user_id]
// //  */

// // /**
// //  * @typedef {Object} UserData
// //  * @property {string} avatar
// //  * @property {string} email
// //  * @property {string} username
// //  * @property {string} first_name
// //  * @property {string} last_name
// //  * @property {string} last_name
// //  * @property {Array<any>} friends
// //  * @property {boolean} is_friend
// //  * @property {boolean} is_self
// //  * @property {string} last_login
// //  */

// function getUserData(id) {
//     return fetcher.$get(`/profile/${id}`);
// }

// export class SessionStore {
//     static loginStates = {
//         login_get_error_no_session: "no session",
//         login_get_ok_active_session: "You have an active session.",
//         login_post_error_credentials: "Invalid credentials",
//         login_post_error_account_disabled: "Account is disabled",
//         login_post_ok: "Login Successful",
//     }

//     #handleError(error) {
// // //         console.log(error);
//     }

//     constructor() {}
//     #isLoggedIn = false;
//     #userData;
//     get isLoggedIn() {
//         return (this.#isLoggedIn);
//     }
//     async fetchActiveSession() {
// // //         console.log("initial fetch to check active session");
//         try {
//             /** @type {import('./types.ts').LoginData} */
//             const loginData = await fetcher.$get("/login");
//             if (!loginData || !loginData.success) {
// // //                 console.log("NO ACTIVE SESSION")
//                 this.#pubsub.publish(this.#userData);
//                 return false;
//             }
// // //             console.log("joooo ACTIVE SESSION")
//             await this.#setloggedUser(loginData);
//         } catch (error) {
// // //             console.log("error trying to fetch active session: ");
// // //             console.log(error)
//             return false;
//         }

//         // .then(this.setloggedUser.bind(this))
//         // .catch(this.#handleError)
//     }

//     /** @param {import('./types.ts').LoginData} loginData  */
//     async #setloggedUser(loginData) {
// // //         console.log("sessionStore: set logged user, loginData: ", loginData);
//         /** @type {import('./types.ts').UserData} */
//         const data = await getUserData(loginData.user_id);
// // //         console.log("userData: ", data);
//         this.#userData = data;
//         this.#isLoggedIn = true;
// // //         console.log("user logged in, user to publish: ", this.#userData);
//         this.#pubsub.publish(this.#userData);
//         // // return new Promise((resolve, reject)=> {
//         // //     if (!loginData.user_id || typeof loginData.user_id !== "number")
//         // //         reject(new Error("invalid loginData, no user_id"));
//         // // })
//         // fetcher.$get(`/profile/${loginData.user_id}`)
//         // .then((data) => {
// // //         //     console.log("my user data: ", data);
//         //     this.#userData = data;
//         //     this.#isLoggedIn = true;
//         //     this.#pubsub.publish(this.#userData);

//         // })
//         // .catch(this.#handleError)
//     }

//     async login(username, password) {
// // //         console.log("SessionStore: login");
//         const loginData = await fetcher.$post("/login", { bodyData: { username, password } } );
// // //         console.log("LOGIN::!!!!: data: ", loginData);
//         if (loginData.success === true)
//             await this.#setloggedUser(loginData);
//         return (loginData);

//         // return new Promise((reject, resolve) => {
//         //     fetcher.$post("/login", { bodyData: { username, password } } )
//         //         .then((data)=> {
//         //             this.setloggedUser.bind(this);
//         //             router.go("/")
//         //         })
//         //         .catch(this.#handleError);

//         // });
//     }

//     async logout() {
// // //         console.log("SessionStore: logout");
//         try {
//             await fetcher.$post("/logout", {})
//             this.#isLoggedIn = false;
//             this.#userData = undefined;
//             this.#pubsub.publish(this.#userData);

//         } catch (error) {

//         }
//     }

//     // #dataProxy = new Proxy(this.#userData, {set: ()=>false});

//     subscribe(host) {
//         return this.#pubsub.subscribe(host, this.#userData);
//     }

//     #pubsub = new PubSub();

// }

// export const sessionService = new SessionStore();

// class SessionStore {

//     #handleError(error) {
// // //         console.log(error);
//     }

//     constructor() {

//     }
//     #isLoggedIn = false;
//     #userData;
//     get isLoggedIn() {
//         return (this.#isLoggedIn);
//     }
//     async fetchActiveSession() {
// // //         console.log("initial fetch to check active session");
//         fetcher.$get("/login")
//         .then(this.setloggedUser.bind(this))
//         .catch(this.#handleError)
//     }

//     /** @param {LoginData} loginData  */
//     setloggedUser(loginData) {
// // //         console.log("sessionStore: set logged user");
//         if (!loginData.user_id || typeof loginData.user_id !== "number") throw new Error("unable!");
//         fetcher.$get(`/profile/${loginData.user_id}`)
//         .then((data) => {
// // //             console.log("my user data: ", data);
//             this.#userData = data;
//             this.#isLoggedIn = true;
//             this.#pubsub.publish(this.#userData);

//         })
//         .catch(this.#handleError)
//     }

//     login(username, password) {
// // //         console.log("SessionStore: login");
//         fetcher.$post("/login", { bodyData: { username, password } } )
//             .then((data)=> {
//                 this.setloggedUser.bind(this);
//                 router.go("/")
//             })
//             .catch(this.#handleError);
//     }

//     logout() {
// // //         console.log("SessionStore: logout");
//         fetcher.$post("/logout", {})
//         .then((data) => {
//             this.#isLoggedIn = false;
//             // this.#userData = {};
//             this.#userData = undefined;
//             this.#pubsub.publish(this.#userData);
//             router.go("/");
//         })
//         .catch(this.#handleError);
//     }

//     // #dataProxy = new Proxy(this.#userData, {set: ()=>false});

//     subscribe(host) {
//         return this.#pubsub.subscribe(host);
//     }

//     #pubsub = new PubSub();

// }

// export const sessionService = new SessionStore();
