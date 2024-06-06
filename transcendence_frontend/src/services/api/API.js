import { Fetcher } from './api_helper.js';
import PubSub from '../../lib_templ/reactivity/PubSub.js';

// export const fetcher = new Fetcher("http://127.0.0.1", {

// api endpoint at path /api
// export const fetcher = new Fetcher(window.location.origin + "/api", {
//     credentials: "include"
// });

// api at subdomain api.
const url = new URL(window.location.origin);
export const fetcher = new Fetcher(`${url.protocol}api.${url.host}`, {
    credentials: 'include',
});

const userAPI = {
    getLogin: () => fetcher.$get('/login'),
    postLogin: (username, password) =>
        fetcher.$post('/login', { bodyData: { username, password } }),
    postLogout: () => fetcher.$post('/logout', {}),
    getProfile: (id) => fetcher.$get(`/profile/${id}`),
};

const friendAPI = {
    getRequests: (id) => fetcher.$get(`/friend/requests/${id}`),
    getRequestsSent: (id) => fetcher.$get(`/friend/requests-sent/${id}`),
    sendRequest: (id) =>
        fetcher.$post('/friend/request', { bodyData: { receiver_id: id } }),
    cancelRequest: (id) => fetcher.$get(`/friend/request/cancel/${id}`),
    acceptRequest: (id) => fetcher.$get(`/friend/request/accept/${id}`),
    rejectRequest: (id) => fetcher.$get(`/friend/request/reject/${id}`),
    blockUser: (id) => fetcher.$get(`/friend/block/${id}`),
    unblockUser: (id) => fetcher.$get(`/friend/unblock/${id}`),
    removeFriend: (id) =>
        fetcher.$post('/friend/remove', { bodyData: { receiver_id: id } }),
};

const gameAPI = {
    getInvitesReceived: () => fetcher.$get('/game/invites-recieved'),
    getInvitesSent: () => fetcher.$get('/game/invites-sent'),
    getSchedule: () => fetcher.$get('/game/schedule'),
    sendInvite: (user_id) =>
        fetcher.$post('/game/invite', {
            bodyData: {
                game_id: 0,
                game_mode: '1vs1',
                tournament: null,
            },
        }),
    acceptInvite: (invitation_id) =>
        fetcher.$post(`/game/invite/accept/${invitation_id}`, {}),
    rejectInvite: (invitation_id) =>
        fetcher.$post(`/game/invite/reject/${invitation_id}`, {}),
    startGame: (schedule_id) => fetcher.$post(`/game/play/${schedule_id}`, {}),
};

export class SessionStore {
    static loginStates = {
        login_get_error_no_session: 'no session',
        login_get_ok_active_session: 'You have an active session.',
        login_post_error_credentials: 'Invalid credentials',
        login_post_error_account_disabled: 'Account is disabled',
        login_post_ok: 'Login Successful',
    };

    #isLoggedIn = false;

    /** @type {APITypes.UserData | undefined} */
    #userData;

    get isLoggedIn() {
        return this.#isLoggedIn;
    }

    async fetchActiveSession() {
        console.log('initial fetch to check active session');
        try {
            const loginData = await fetcher.$get('/login');
            console.log('inital data: ', loginData);
            if (!loginData || !loginData.success) {
                this.#pubsub.publish(this.#userData);
                return false;
            }
            this.#isLoggedIn = true;
            await this.#fetchSessionUser(loginData.user_id);
            this.#pubsub.publish(this.#userData);
            return true;
        } catch (error) {
            console.log(error);
        }
        return false;
        // catch (error) {
        //     console.log(error)
        //     return false;
        // }
    }

    async login(username, password) {
        const loginData = await fetcher.$post('/login', {
            bodyData: { username, password },
        });
        console.log('session: login: loginData: ', loginData);
        if (loginData.success === true) {
            console.log('login: after fetch user');
            this.#isLoggedIn = true;
            await this.#fetchSessionUser(loginData.user_id);

            this.#pubsub.publish(this.#userData);
        }
        return loginData;
    }

    async logout() {
        try {
            await fetcher.$post('/logout', {});
            this.#isLoggedIn = false;
            this.#userData = undefined;
            this.#pubsub.publish(this.#userData);
        } catch (error) {
            console.log(error);
        }
    }

    /**
     * @param {number} user_id
     * @returns {APITypes.FriendUserData | undefined}
     */
    getFriend(user_id) {
        if (this.#userData)
            return this.#userData.friends.find(
                (friend) => friend.id === user_id,
            );
        return undefined;
    }

    /**
     * @param {number} user_id
     * @returns {APITypes.FriendUserData | undefined}
     */
    getBlocked(user_id) {
        if (this.#userData)
            return this.#userData.friends.find(
                (friend) => friend.id === user_id,
            );
        return undefined;
    }

    getSentRequest(user_id) {
        if (this.#userData)
            return this.#userData.requestsSent.find(
                (friend) => friend.id === user_id,
            );
        return undefined;
    }

    getReceivedRequest(user_id) {
        if (this.#userData)
            return this.#userData.requestsReceived.find(
                (friend) => friend.id === user_id,
            );
        return undefined;
    }

    getInvited(user_id) {
        if (this.#userData) {
            const sent = this.#userData.gameInvitationsSent.find(
                (friend) => friend.id === user_id,
            );
            if (sent) return sent;
            return this.#userData.gameInvitationsReceived.find(
                (friend) => friend.id === user_id,
            );
        }
        return undefined;
    }

    async refetchSessionUserData() {
        if (!this.#isLoggedIn) return;
        await this.#fetchSessionUser(this.#userData?.id);
        this.#pubsub.publish(this.#userData);
    }

    #fetchSessionUser(id) {
        return Promise.all([
            fetcher.$get(`/profile/${id}`),
            this.#fetchRequestsReceived(id),
            this.#fetchRequestsSent(id),
            this.#fetchGameInvitationsReceived(),
            this.#fetchGameInvitationsSent(),
            this.#fetchGameSchedule(),
        ]).then((data) => {
            if (data[0] && data[0].success === false) Promise.reject(data[0]);
            if (data[1] && data[1].success === false)
                Promise.reject(data[1].message);
            if (data[2] && data[2].success === false)
                Promise.reject(data[2].message);
            if (data[3] && data[3].success === false)
                Promise.reject(data[3].message);
            [this.#userData] = data;
            if (this.#userData) {
                this.#userData.requestsReceived = data[1].data;
                this.#userData.requestsSent = data[2].data;
                this.#userData.gameInvitationsReceived = data[3].data;
                this.#userData.gameInvitationsSent = data[4].data;
                this.#userData.gameSchedule = data[5].data;
            }
            console.log('userData: ', this.#userData);
        });
    }

    // eslint-disable-next-line class-methods-use-this
    #fetchRequestsReceived(id) {
        return fetcher.$get(`/friend/requests/${id}`);
    }

    // eslint-disable-next-line class-methods-use-this
    #fetchRequestsSent(id) {
        return fetcher.$get(`/friend/requests-sent/${id}`);
    }

    // eslint-disable-next-line class-methods-use-this
    #fetchGameInvitationsReceived() {
        return fetcher.$get(`/game/invites-recieved`);
    }

    // eslint-disable-next-line class-methods-use-this
    #fetchGameInvitationsSent() {
        return fetcher.$get(`/game/invites-sent`);
    }

    // eslint-disable-next-line class-methods-use-this
    #fetchGameSchedule() {
        return fetcher.$post(`/game/schedule`, {});
    }

    async blockUser(user_id) {
        if (!this.#isLoggedIn) return;
        await fetcher.$get(`/friend/block/${user_id}`);
        await this.#fetchSessionUser(this.#userData?.id);
        this.#pubsub.publish(this.#userData);
    }

    async unblockUser(user_id) {
        if (!this.#isLoggedIn) return;
        await fetcher.$get(`/friend/unblock/${user_id}`);
        await this.#fetchSessionUser(this.#userData?.id);
        this.#pubsub.publish(this.#userData);
    }

    async removeFriend(id) {
        if (!this.#isLoggedIn) return;
        await fetcher.$post('/friend/remove', {
            bodyData: { receiver_id: id },
        });
        await this.#fetchSessionUser(this.#userData?.id);
        this.#pubsub.publish(this.#userData);
    }

    async sendFriendRequest(id) {
        if (!this.#isLoggedIn || !this.#userData) return;
        // console.log('api - await send friend request');
        await fetcher.$post('/friend/request', {
            bodyData: { receiver_id: id },
        });
        // console.log('api - awaiting done send friend request');
        const data = await this.#fetchRequestsSent(this.#userData?.id);
        this.#userData.requestsSent = data.data;
        this.#pubsub.publish(this.#userData);
    }

    async cancelFriendRequest(id) {
        if (!this.#isLoggedIn || !this.#userData) return;
        // console.log("cancel friend request: id: ", id);
        await fetcher.$get(`/friend/request/cancel/${id}`);
        // await fetcher.$post("/friend/request/cancel", {bodyData: {receiver_id: id}});
        const data = await this.#fetchRequestsSent(this.#userData.id);
        this.#userData.requestsSent = data.data;
        this.#pubsub.publish(this.#userData);
    }

    async acceptFriendRequest(id) {
        if (!this.#isLoggedIn || !this.#userData) return;
        // console.log("accept friend request: id: ", id);
        await fetcher.$get(`/friend/request/accept/${id}`);
        const data = await this.#fetchRequestsReceived(this.#userData.id);
        this.#userData.requestsReceived = data.data;
        this.#pubsub.publish(this.#userData);
    }

    async rejectFriendRequest(id) {
        if (!this.#isLoggedIn || !this.#userData) return;
        await fetcher.$get(`/friend/request/reject/${id}`);
        const data = await this.#fetchRequestsReceived(this.#userData.id);
        this.#userData.requestsReceived = data.data;
        this.#pubsub.publish(this.#userData);
    }

    async sendGameInvitation(user_id) {
        if (!this.#isLoggedIn || !this.#userData) return;
        // await fetcher.$post(`/game/invite/${user_id}`, {});
        await fetcher.$post(`/game/invite/${user_id}`, {
            bodyData: {
                game_id: 0,
                game_mode: '1vs1',
                tournament: null,
            },
        });
        const data = await this.#fetchGameInvitationsSent();
        this.#userData.gameInvitationsSent = data.data;
    }

    async acceptGameInvitation(invitation_id) {
        if (!this.#isLoggedIn || !this.#userData) return;
        await fetcher.$post(`/game/invite/accept/${invitation_id}`, {});
        const data = await this.#fetchGameInvitationsReceived();
        this.#userData.gameInvitationsReceived = data.data;
    }

    async rejectGameInvitation(invitation_id) {
        if (!this.#isLoggedIn || !this.#userData) return;
        await fetcher.$post(`/game/invite/reject/${invitation_id}`, {});
        const data = await this.#fetchGameInvitationsReceived();
        this.#userData.gameInvitationsReceived = data.data;
    }

    async startGameByScheduleId(schedule_id) {
        if (!this.#isLoggedIn || !this.#userData) return;
        await fetcher.$post(`/game/play/${schedule_id}`, {});
    }

    subscribe(host, force = false) {
        return this.#pubsub.subscribe(host, this.#userData, force);
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
//         // console.log("initial fetch to check active session");
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
//             // console.log(error)
//             return false;
//         }
//         // catch (error) {
//         //     console.log(error)
//         //     return false;
//         // }

//     }

//     async login(username, password) {
//         const loginData = await fetcher.$post("/login", { bodyData: { username, password } } );
//         // console.log("session: login: loginData: ", loginData);
//         if (loginData.success === true) {
//             await this.#fetchSessionUser(loginData.user_id);
//             // console.log("login: after fetch user");

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
//             console.log(error)
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
//             // console.log("fetch session user data:" , data);
//             this.#isLoggedIn = true;
//             this.#userData = data[0];
//             if (this.#userData) {
//                 this.#userData.requestsReceived = data[1].data;
//                 this.#userData.requestsSent = data[2].data;
//                 this.#userData.gameInvitationsReceived = data[3].data;
//                 this.#userData.gameInvitationsSent = data[4].data;
//                 this.#userData.gameSchedule = data[5].data;
//             }
//             // console.log("userData: ", this.#userData);
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
//         console.log("api - await send friend request");
//         await fetcher.$post("/friend/request", {bodyData: {receiver_id: id}});
//         console.log("api - awaiting done send friend request");
//         const data = await this.#fetchRequestsSent(this.#userData?.id);
//         this.#userData.requestsSent = data.data;
//         this.#pubsub.publish(this.#userData);
//     }

//     async cancelFriendRequest(id) {
//         if (!this.#isLoggedIn || !this.#userData) return ;
//         // console.log("cancel friend request: id: ", id);
//         await fetcher.$get(`/friend/request/cancel/${id}`);
//         // await fetcher.$post("/friend/request/cancel", {bodyData: {receiver_id: id}});
//         const data = await this.#fetchRequestsSent(this.#userData.id);
//         this.#userData.requestsSent = data.data;
//         this.#pubsub.publish(this.#userData);
//     }

//     async acceptFriendRequest(id) {
//         if (!this.#isLoggedIn || !this.#userData) return ;
//         // console.log("accept friend request: id: ", id);
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
// //         console.log(error);
//     }

//     constructor() {}
//     #isLoggedIn = false;
//     #userData;
//     get isLoggedIn() {
//         return (this.#isLoggedIn);
//     }
//     async fetchActiveSession() {
// //         console.log("initial fetch to check active session");
//         try {
//             /** @type {import('./types.ts').LoginData} */
//             const loginData = await fetcher.$get("/login");
//             if (!loginData || !loginData.success) {
// //                 console.log("NO ACTIVE SESSION")
//                 this.#pubsub.publish(this.#userData);
//                 return false;
//             }
// //             console.log("joooo ACTIVE SESSION")
//             await this.#setloggedUser(loginData);
//         } catch (error) {
// //             console.log("error trying to fetch active session: ");
// //             console.log(error)
//             return false;
//         }

//         // .then(this.setloggedUser.bind(this))
//         // .catch(this.#handleError)
//     }

//     /** @param {import('./types.ts').LoginData} loginData  */
//     async #setloggedUser(loginData) {
// //         console.log("sessionStore: set logged user, loginData: ", loginData);
//         /** @type {import('./types.ts').UserData} */
//         const data = await getUserData(loginData.user_id);
// //         console.log("userData: ", data);
//         this.#userData = data;
//         this.#isLoggedIn = true;
// //         console.log("user logged in, user to publish: ", this.#userData);
//         this.#pubsub.publish(this.#userData);
//         // // return new Promise((resolve, reject)=> {
//         // //     if (!loginData.user_id || typeof loginData.user_id !== "number")
//         // //         reject(new Error("invalid loginData, no user_id"));
//         // // })
//         // fetcher.$get(`/profile/${loginData.user_id}`)
//         // .then((data) => {
// //         //     console.log("my user data: ", data);
//         //     this.#userData = data;
//         //     this.#isLoggedIn = true;
//         //     this.#pubsub.publish(this.#userData);

//         // })
//         // .catch(this.#handleError)
//     }

//     async login(username, password) {
// //         console.log("SessionStore: login");
//         const loginData = await fetcher.$post("/login", { bodyData: { username, password } } );
// //         console.log("LOGIN::!!!!: data: ", loginData);
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
// //         console.log("SessionStore: logout");
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
// //         console.log(error);
//     }

//     constructor() {

//     }
//     #isLoggedIn = false;
//     #userData;
//     get isLoggedIn() {
//         return (this.#isLoggedIn);
//     }
//     async fetchActiveSession() {
// //         console.log("initial fetch to check active session");
//         fetcher.$get("/login")
//         .then(this.setloggedUser.bind(this))
//         .catch(this.#handleError)
//     }

//     /** @param {LoginData} loginData  */
//     setloggedUser(loginData) {
// //         console.log("sessionStore: set logged user");
//         if (!loginData.user_id || typeof loginData.user_id !== "number") throw new Error("unable!");
//         fetcher.$get(`/profile/${loginData.user_id}`)
//         .then((data) => {
// //             console.log("my user data: ", data);
//             this.#userData = data;
//             this.#isLoggedIn = true;
//             this.#pubsub.publish(this.#userData);

//         })
//         .catch(this.#handleError)
//     }

//     login(username, password) {
// //         console.log("SessionStore: login");
//         fetcher.$post("/login", { bodyData: { username, password } } )
//             .then((data)=> {
//                 this.setloggedUser.bind(this);
//                 router.go("/")
//             })
//             .catch(this.#handleError);
//     }

//     logout() {
// //         console.log("SessionStore: logout");
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
