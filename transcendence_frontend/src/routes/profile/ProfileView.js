import { BaseElem, html, css,
    sessionService, Router, fetcher, router,
    renderDropdow, actions,
    renderCard, renderCardInfo, renderAvatar, renderListCard, rendListItem } from '../../modules.js';



class ProfileSettingsView extends BaseElem {
    constructor() {
        super(false, false);
    }
    render() {
        return html`
            <div class="mb-3">
                <label for="profile-edit-firstname" class="form-label">First Name</label>
                <input
                    type="text"
                    class="form-control"
                    name="first_name"
                    id="profile-edit-firstname"
                    placeholder="John"
                    value="curr first name"
                />
            </div>
            <div class="mb-3">
                <label for="profile-edit-lastname" class="form-label">Last Name</label>
                <input
                    type="text"
                    class="form-control"
                    name="last_name"
                    id="profile-edit-lastname"
                    placeholder="Doe"
                    value="curr last name"
                />
            </div>
          
            
            
        `
    }
}
customElements.define("profile-settings-view", ProfileSettingsView);


export class ProfileView extends BaseElem {
    constructor() {
        super(false, false)
        this.profileUserData = {
            avatar: "",
            username: "",
            first_name: "",
            last_name: "",
            last_login: "",
            date_joined: "",
            total_games: 8,
            total_wins: 5,
            total_draw: 1,
            total_losses: 2,
            ranking: 14,
            is_self: false,
            is_friend: false
        };
        this.sessionUser = sessionService.subscribe(this, true);
    }

    /** @param {Router} router  */
    async onBeforeMount(route, router, params) {

        if (!sessionService.isLoggedIn) {
            return router.redirect("/");
        }

        if (this.sessionUser.value && !params.pk || this.sessionUser.value.pk === params.pk) {
            this.profileUserData = this.sessionUser.value;
            return ;
        }
        if (params.pk) {
            try {
                this.profileUserData = await fetcher.$get(`/profile/${params.pk}`)
            } catch (error) {
                console.log(error)
                this.#isError = error;
                this.#isError.pk = params.pk;
                if (error instanceof Error) {
                    console.log("dispatch notify event")
                    this.#isError.data = {message: error.message}
                    document.dispatchEvent(new CustomEvent("render-notification", {detail: {message: this.#isError.data.message}, bubbles: true}));
                    return router.redirect("/");
                }
            }
        } else {

        }
    }
    #isError;


    /** @param {import('../../../types/api_data.js').UserData} userData */
    getActionButtons = (userData) => {
        if (userData.is_self) 
            return html`
            <a href="/settings" class="btn btn-outline-primary px-4 p-2 m-2 rounded-4">
                <i class="fa-solid fa-pen-to-square pe-2"></i>Edit Profile
            </a>
            <a href="/logout" class="btn btn-danger px-4 p-2 m-2 rounded-4">
                <i class="fa-solid fa-right-from-bracket pe-2"></i>Logout
            </a>
            `
        let data;
        // console.log("render new Profile Data -> render new Button");
        // console.log(this.sessionUser.value)
       
        if ((data = sessionService.getFriend(userData.id)) !== undefined) {
            return html`
                <button disabled class="btn btn-dark me-2"><i class="fa-solid fa-user-check"></i></button>
                ${renderDropdow({color: "dark", outline: true, icon: "ellipsis-vertical"}, [
                    actions.removeFriend(userData.id, {host: this, dropdownitem: true}),
                    actions.blockUser(userData.id, {cb: () => {router.redirect(`/profile/${userData.id}`);}, dropdownitem: true})
                ])}
            `
        } else if ((data = sessionService.getReceivedRequest(userData.id)) !== undefined) {
            return html`
                ${actions.acceptFriendRequest(data.request_id, {cb: () => {super.requestUpdate()}})}
                ${actions.rejectFriendRequest(data.request_id, {cb: () => {super.requestUpdate()}})}
                ${renderDropdow({color: "dark", outline: true, icon: "ellipsis-vertical"}, [
                    actions.blockUser(userData.id, {cb: () => {router.redirect(`/profile/${userData.id}`);}, dropdownitem: true})
                ])}
            `
        } else if ((data = sessionService.getSentRequest(userData.id)) !== undefined) {
            return html`
                <button disabled class="btn btn-dark me-2"><i class="fa-solid fa-user-clock"></i></button>
                ${actions.cancelFriendRequest(userData.id, {cb: () => {super.requestUpdate()}})}
                ${renderDropdow({color: "dark", outline: true, icon: "ellipsis-vertical"}, [
                    actions.blockUser(userData.id, {cb: () => {router.redirect(`/profile/${userData.id}`);}, dropdownitem: true})
                ])}
            `
        } else {
            return html`
                ${actions.sendFriendRequest(userData.id, {cb: () => {super.requestUpdate()}})}
                ${renderDropdow({color: "dark", outline: true, icon: "ellipsis-vertical"}, [
                    actions.blockUser(userData.id, {cb: () => {router.redirect(`/profile/${userData.id}`);}, dropdownitem: true})
                ])}
            `
        }

    }

    renderCard = (col, content) => html`
    
    `
    // d-flex flex-column flex-md-row
    render() {

        // console.log("render new Profile Data");
        if (this.#isError && this.#isError.data.message !== "Blocked: You cannot view this account") {
            this.dispatchEvent(new CustomEvent("render-notification", {detail: {message: this.#isError.data.message}, bubbles: true}));
            router.go("/");
        }

        return html`
            ${this.#isError ? html`
            <div class="alert alert-danger" role="alert">
                <h4 class="alert-heading">${this.#isError.data.message}</h4>
                <hr>
                
            </div>
            ` : html`
            <div class="card border-0 rounded-0" >
                <div class="card-body">
                    <div class="row">
                        <div class="col-12 col-md-3  d-flex justify-content-center  align-items-center" >
                            <avatar-component  status="online" statusborder radius="5" src="${this.profileUserData.avatar}" size="150"></avatar-component>
                        </div>
                        <!-- mt-3 col-12 col-md-6 -->
                        <div class="col text-center text-md-start mt-3 mt-md-0">
                            <div class="position-relative">
                                <div class="mb-2">
                                    <h3 class="display-5 m-0"> ${this.profileUserData.username}</h3>
                                    <small class="text-body-secondary">${this.profileUserData.first_name} ${this.profileUserData.last_name}</small>
                                </div>
                                
                                <p class="lead mb-3 fs-6 text-wrap">
                                    This is a lead paragraph. It stands out from regular paragraphs.
                                    This is a lead paragraph. It stands out from regular paragraphs.
                                    This is a lead paragraph. It stands out from regular paragraphs.
                                    This is a lead paragraph. It stands out from regular paragraphs.
                                </p>
                            </div>
                        </div> 
                        <!-- container d-flex justify-content-center px-4 -->
                        <!-- <div class="col-12 col-md-3 d-flex flex-md-column flex-row justify-content-center align-items-stretch"> -->
                        <div class="col-12 ">
                            <div class="h-100 d-flex flex-row align-items-center justify-content-center">
                                ${this.getActionButtons(this.profileUserData)}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            <div class="mt-3 container-fluid text-center">
                <div class="row">
                    <div class="col-12 col-md-6 mt-3">
                    
                        <div class="row g-3">
                            <div class="col-4">
                                ${renderCard("", "", renderCardInfo("Rank", this.profileUserData.ranking ?? "-"))}
                            </div>
                            <div class="col-8">
                                ${renderCard("", "", renderCardInfo("Member since", new Date(this.profileUserData.date_joined).toLocaleDateString()))}
                            </div>

                            <div class="col-12">
                                ${renderCard("Game Stats", "chart-simple", html`
                                    <div class="row gx-4">
                                        <div class="col-4 border-bottom border-3 border-success-subtle">
                                            ${renderCardInfo("Wins", this.profileUserData.total_wins ?? "-")}
                                        </div>
                                        <div class="col-4 border-bottom border-3">
                                            ${renderCardInfo("Total", this.profileUserData.total_games ?? "-")}
                                        </div>
                                        <div class="col-4 border-bottom border-3 border-danger-subtle">
                                            ${renderCardInfo("Losses", this.profileUserData.total_losses ?? "-")}
                                        </div>
                                    </div>
                                `)}
                            </div>

                        </div>
                    </div>
                    <div class="col-12 col-md-6 mt-3">

                        <div class="row g-3">
                            <div class="col-12">
                                ${renderListCard("Match History", "scroll", 
                                    this.dataMatches.map(data=>rendListItem(html`
                                    <div class="d-flex w-100 px-2 align-items-center justify-content-between border-start border-4 ${data.self_points > data.opp_points  ? "border-success-subtle" : "border-danger-subtle"}">
                                        ${renderAvatar(data.id, data.username, data.avatar, "", "after")}
                                        ${renderCardInfo("Score", `${data.self_points} : ${data.opp_points}`)}
                                        ${renderCardInfo("Date", new Date(data.date).toLocaleDateString("de-DE", {dateStyle: "short"}))}
                                    </div>
                                        
                                    `))
                                )}
                                
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            `}
        `
    }
    dataa = new Array(10).fill(0);

    dataMatches = [
        {id: "6", avatar: "https://picsum.photos/200/300?random=1", username: "peterjo", self_points: "9", opp_points: "2", date: "2021-09-24T12:38:54.656Z"},
        {id: "7", avatar: "https://picsum.photos/200/300?random=2", username: "dedr werber", self_points: "4", opp_points: "7", date: "2021-09-24T12:38:54.656Z"},
        {id: "8", avatar: "https://picsum.photos/200/300?random=3", username: "hayloo", self_points: "9", opp_points: "7", date: "2021-09-24T12:38:54.656Z"},
        {id: "9", avatar: "https://picsum.photos/200/300?random=4", username: "dewdw", self_points: "8", opp_points: "1", date: "2021-09-24T12:38:54.656Z"},
        {id: "2", avatar: "https://picsum.photos/200/300?random=5", username: "petdewh5erjo", self_points: "1", opp_points: "8", date: "2021-09-24T12:38:54.656Z"},
        {id: "1", avatar: "https://picsum.photos/200/300?random=6", username: "giorghinho", self_points: "8", opp_points: "1", date: "2021-09-24T12:38:54.656Z"},
        {id: "34", avatar: "https://picsum.photos/200/300?random=8", username: "xoxoxP", self_points: "3", opp_points: "9", date: "2021-09-24T12:38:54.656Z"},
        {id: "10", avatar: "https://picsum.photos/200/300?random=7", username: "marmelade", self_points: "5", opp_points: "9", date: "2021-09-24T12:38:54.656Z"},
        ];
}
customElements.define("profile-view", ProfileView);



// class ProfileSettingsView extends BaseElem {
//     constructor() {
//         super(false, false);
//     }
//     render() {
//         return html`
//             <div class="mb-3">
//                 <label for="profile-edit-firstname" class="form-label">First Name</label>
//                 <input
//                     type="text"
//                     class="form-control"
//                     name="first_name"
//                     id="profile-edit-firstname"
//                     placeholder="John"
//                     value="curr first name"
//                 />
//             </div>
//             <div class="mb-3">
//                 <label for="profile-edit-lastname" class="form-label">Last Name</label>
//                 <input
//                     type="text"
//                     class="form-control"
//                     name="last_name"
//                     id="profile-edit-lastname"
//                     placeholder="Doe"
//                     value="curr last name"
//                 />
//             </div>
          
            
            
//         `
//     }
// }
// customElements.define("profile-settings-view", ProfileSettingsView);


// export class ProfileView extends BaseElem {
//     constructor() {
//         super(false, false)
//         this.profileUserData = {
//             avatar: "",
//             username: "",
//             first_name: "",
//             last_name: "",
//             last_login: "",
//             date_joined: "",
//             total_games: 8,
//             total_wins: 5,
//             total_draw: 1,
//             total_losses: 2,
//             ranking: 14,
//             is_self: false,
//             is_friend: false
//         };
//         this.sessionUser = sessionService.subscribe(this, true);
//     }

//     /** @param {Router} router  */
//     async onBeforeMount(route, router, params) {

//         if (!sessionService.isLoggedIn) {
//             return router.redirect("/");
//         }

//         if (this.sessionUser.value && !params.pk || this.sessionUser.value.pk === params.pk) {
//             this.profileUserData = this.sessionUser.value;
//             return ;
//         }
//         if (params.pk) {
//             try {
//                 this.profileUserData = await getUserData(params.pk);
//             } catch (error) {
//                 console.log(error)
//                 this.#isError = error;
//                 this.#isError.pk = params.pk;
//                 if (error instanceof Error) {
//                     console.log("dispatch notify event")
//                     this.#isError.data = {message: error.message}
//                     document.dispatchEvent(new CustomEvent("render-notification", {detail: {message: this.#isError.data.message}, bubbles: true}));
//                     return router.redirect("/");
//                 }
//             }
//         } else {

//         }
//     }
//     #isError;

//     renderRecentActivitiesEntry = (match) => html`
//         <li class="list-group-item text-body-secondary fs-6">
//             <div class=" row text-center align-items-center justify-content-between border-start border-4 ${match.self_points > match.opp_points  ? "border-success-subtle" : "border-danger-subtle"}">
//                 <div class="col-5 p-0 m-2">
//                     <a class="pw-3 m-0 link-body-emphasis link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" href="/profile/${match.id}">
//                         <avatar-component radius="3" src="${match.atavar}" size="40">
//                             <span class="m-2 text-truncate" slot="after">${match.username}</span>
//                         </avatar-component>
//                     </a>
//                 </div>
//                 <p class="m-0 col-3 p-0">
//                     SCORE <br>
//                     <span class="text-body">${match.self_points} : ${match.opp_points}</span>
                    
//                 </p>
//                 <p class="m-0 col-3 p-0">
//                     ${new Date(match.date).toLocaleDateString("de-DE", {dateStyle: "short"})}
//                 </p>
//             </div>
//         </li>

//     `

// // if ((data = sessionService.getFriend(userData.id)) !== undefined) {
// //     return html`
// //     <bs-button ._async_handler=${async ()=>{
// //         await sessionService.removeFriend(userData.id);
// //         super.requestUpdate();
// //     }} color="danger" outline icon="xmark" loadingtext="unfriend">unfriend</bs-button>
// //     <bs-button ._async_handler=${async ()=>{
// //         await sessionService.blockUser(userData.id);
// //         router.redirect(`/profile/${userData.id}`);
// //     }} color="danger" outline icon="xmark" loadingtext="block">block</bs-button>
// //     `
// // } else if ((data = sessionService.getReceivedRequest(userData.id)) !== undefined) {
// //     return html`
// //     <bs-button ._async_handler=${async ()=>{
// //         await sessionService.acceptFriendRequest(data.request_id);
// //         super.requestUpdate();
// //     }} color="success" outline icon="check" loadingtext="accept">accept</bs-button>
// //     <bs-button ._async_handler=${async ()=>{
// //         await sessionService.rejectFriendRequest(data.request_id);
// //         super.requestUpdate();
// //     }} color="danger" outline icon="xmark" loadingtext="reject">reject</bs-button>
// //     <bs-button ._async_handler=${async ()=>{
// //         await sessionService.blockUser(userData.id);
// //         router.redirect(`/profile/${userData.id}`);
// //     }} color="danger" outline icon="xmark" loadingtext="block">block</bs-button>
// //     `
// // } else if ((data = sessionService.getSentRequest(userData.id)) !== undefined) {
// //     return html`
// //     <bs-button ._async_handler=${async ()=>{
// //         await sessionService.cancelFriendRequest(userData.id);
// //         super.requestUpdate();
// //     }} color="danger" outline icon="xmark" loadingtext="cancel">cancel</bs-button>
// //     <bs-button ._async_handler=${async ()=>{
// //         await sessionService.blockUser(userData.id);
// //         router.redirect(`/profile/${userData.id}`);
// //     }} color="danger" outline icon="xmark" loadingtext="block">block</bs-button>
    
// //     `
// // } else {
// //     return html`
// //         <div class="col-12">
// //         <bs-button  ._async_handler=${async ()=>{
// //             console.log("async handler send friend request");
// //             await sessionService.sendFriendRequest(userData.id);
// //             console.log("async handler send req done");
// //             super.requestUpdate();
// //         }} color="dark" icon="user-plus" loadingtext="add">add</bs-button>

// //         </div>
// //         <bs-button ._async_handler=${async ()=>{
// //             await sessionService.blockUser(userData.id);
// //             router.redirect(`/profile/${userData.id}`);
// //         }} color="danger" icon="xmark" loadingtext="block">block</bs-button>
// //         <bs-dropdown></bs-dropdow>
// //     `
// // }

//     /** @param {import('../../services/types.js').UserData} userData */
//     getActionButtons = (userData) => {
//         if (userData.is_self) 
//             return html`
//             <a href="/settings" class="btn btn-outline-primary px-4 p-2 m-2 rounded-4">
//                 <i class="fa-solid fa-pen-to-square pe-2"></i>Edit Profile
//             </a>
//             <a href="/logout" class="btn btn-danger px-4 p-2 m-2 rounded-4">
//                 <i class="fa-solid fa-right-from-bracket pe-2"></i>Logout
//             </a>
//             `
//         let data;
//         // console.log("render new Profile Data -> render new Button");
//         // console.log(this.sessionUser.value)
       
//         if ((data = sessionService.getFriend(userData.id)) !== undefined) {
//             return html`
//                 <button disabled class="btn btn-dark me-2"><i class="fa-solid fa-user-check"></i></button>
//                 ${renderDropdow({color: "dark", outline: true, icon: "ellipsis-vertical"}, [
//                     actions.removeFriend(userData.id, {host: this, dropdownitem: true}),
//                     actions.blockUser(userData.id, {cb: () => {router.redirect(`/profile/${userData.id}`);}, dropdownitem: true})
//                 ])}
//             `
//         } else if ((data = sessionService.getReceivedRequest(userData.id)) !== undefined) {
//             return html`
//                 ${actions.acceptFriendRequest(data.request_id, {cb: () => {super.requestUpdate()}})}
//                 ${actions.rejectFriendRequest(data.request_id, {cb: () => {super.requestUpdate()}})}
//                 ${renderDropdow({color: "dark", outline: true, icon: "ellipsis-vertical"}, [
//                     actions.blockUser(userData.id, {cb: () => {router.redirect(`/profile/${userData.id}`);}, dropdownitem: true})
//                 ])}
//             `
//         } else if ((data = sessionService.getSentRequest(userData.id)) !== undefined) {
//             return html`
//                 <button disabled class="btn btn-dark me-2"><i class="fa-solid fa-user-clock"></i></button>
//                 ${actions.cancelFriendRequest(userData.id, {cb: () => {super.requestUpdate()}})}
//                 ${renderDropdow({color: "dark", outline: true, icon: "ellipsis-vertical"}, [
//                     actions.blockUser(userData.id, {cb: () => {router.redirect(`/profile/${userData.id}`);}, dropdownitem: true})
//                 ])}
//             `
//         } else {
//             return html`
//                 ${actions.sendFriendRequest(userData.id, {cb: () => {super.requestUpdate()}})}
//                 ${renderDropdow({color: "dark", outline: true, icon: "ellipsis-vertical"}, [
//                     actions.blockUser(userData.id, {cb: () => {router.redirect(`/profile/${userData.id}`);}, dropdownitem: true})
//                 ])}
//             `
//         }

//     }

//     renderCard = (col, content) => html`
    
//     `
//     // d-flex flex-column flex-md-row
//     render() {

//         // console.log("render new Profile Data");
//         if (this.#isError && this.#isError.data.message !== "Blocked: You cannot view this account") {
//             this.dispatchEvent(new CustomEvent("render-notification", {detail: {message: this.#isError.data.message}, bubbles: true}));
//             router.go("/");
//         }

//         return html`
//             ${this.#isError ? html`
//             <div class="alert alert-danger" role="alert">
//                 <h4 class="alert-heading">${this.#isError.data.message}</h4>
//                 <hr>
                
//             </div>
//             ` : html`
//             <div class="card border-0 rounded-0" >
//                 <div class="card-body">
//                     <div class="row">
//                         <div class="col-12 col-md-3  d-flex justify-content-center  align-items-center" >
//                             <avatar-component  status="online" statusborder radius="5" src="${this.profileUserData.avatar}" size="150"></avatar-component>
//                         </div>
//                         <!-- mt-3 col-12 col-md-6 -->
//                         <div class="col text-center text-md-start mt-3 mt-md-0">
//                             <div class="position-relative">
//                                 <div class="mb-2">
//                                     <h3 class="display-5 m-0"> ${this.profileUserData.username}</h3>
//                                     <small class="text-body-secondary">${this.profileUserData.first_name} ${this.profileUserData.last_name}</small>
//                                 </div>
                                
//                                 <p class="lead mb-3 fs-6 text-wrap">
//                                     This is a lead paragraph. It stands out from regular paragraphs.
//                                     This is a lead paragraph. It stands out from regular paragraphs.
//                                     This is a lead paragraph. It stands out from regular paragraphs.
//                                     This is a lead paragraph. It stands out from regular paragraphs.
//                                 </p>
//                             </div>
//                         </div> 
//                         <!-- container d-flex justify-content-center px-4 -->
//                         <!-- <div class="col-12 col-md-3 d-flex flex-md-column flex-row justify-content-center align-items-stretch"> -->
//                         <div class="col-12 ">
//                             <div class="h-100 d-flex flex-row align-items-center justify-content-center">
//                                 ${this.getActionButtons(this.profileUserData)}
//                             </div>
//                         </div>

//                     </div>
//                 </div>
//             </div>
//             <div class="mt-3 container-fluid text-center">
//                 <div class="row">
//                     <div class="col-12 col-md-6 mt-3">

                    
//                         <div class="row g-3">
//                             <div class="col-4">
//                                 <div class="card border-0 m-0 p-2">
//                                     <div class="card-body">
//                                     <p class="text-body-secondary p-0 m-0">Rank <br> <span class="text-body">#${this.profileUserData.ranking ?? "-"}</span> </p>
//                                     </div>
//                                 </div>
//                             </div>
//                             <div class="col-8">
//                                 <div class="card border-0 m-0 p-2">
//                                     <div class="card-body">
//                                     <p class="text-body-secondary p-0 m-0">Member since <br> <span class="text-body">${new Date(this.profileUserData.date_joined).toLocaleDateString()}</span></p>
//                                     </div>
//                                 </div>
//                             </div>
//                             <div class="col-12">
//                                 <div class="card border-0 m-0">
//                                     <div class="card-header border-0 m-0">
//                                         <h6 class="m-0"><i class="fa-solid fa-chart-simple m-2"></i>Game Stats</h6>
//                                     </div>
//                                     <div class="card-body">
//                                         <div class="row gx-4">
//                                             <div class="col-4">
//                                                 <p class="text-body-secondary p-2 m-0 border-bottom border-3 border-success-subtle">
//                                                     Wins
//                                                     <br>
//                                                     <span class="text-body fs-3">${this.profileUserData.total_wins ?? "-"}</span>
//                                                 </p>
//                                             </div>
//                                             <div class="col-4">
//                                                 <p class="text-body-secondary p-2 m-0 border-bottom border-3 ">
//                                                     Total
//                                                     <br>
//                                                     <span class="text-body fs-3">${this.profileUserData.total_games ?? "-"}</span>
//                                                 </p>
//                                             </div>
//                                             <div class="col-4">
//                                                 <p class="text-body-secondary p-2 m-0 border-bottom border-3  border-danger-subtle">
//                                                     Losses
//                                                     <br>
//                                                     <span class="text-body fs-3">${this.profileUserData.total_losses ?? "-"}</span>
//                                                 </p>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                     <div class="col-12 col-md-6 mt-3">

//                         <div class="row g-3">
//                             <div class="col-12">
//                                 <div class="card border-0 m-0 ">
//                                     <div class="card-header border-0 m-0">
//                                         <h6 class="m-0"><i class="fa-solid fa-scroll m-2"></i>Match History</h6>
//                                     </div>
//                                     <div class="card-body">
//                                         <ul class="list-group list-group-flush">
//                                             ${this.dataMatches.map(data=>this.renderRecentActivitiesEntry(data))}
//                                         </ul>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//             `}
//         `
//     }
//     dataa = new Array(10).fill(0);

//     dataMatches = [
//         {id: "6", atavar: "https://picsum.photos/200/300?random=1", username: "peterjo", self_points: "9", opp_points: "2", date: "2021-09-24T12:38:54.656Z"},
//         {id: "7", atavar: "https://picsum.photos/200/300?random=2", username: "dedr werber", self_points: "4", opp_points: "7", date: "2021-09-24T12:38:54.656Z"},
//         {id: "8", atavar: "https://picsum.photos/200/300?random=3", username: "hayloo", self_points: "9", opp_points: "7", date: "2021-09-24T12:38:54.656Z"},
//         {id: "9", atavar: "https://picsum.photos/200/300?random=4", username: "dewdw", self_points: "8", opp_points: "1", date: "2021-09-24T12:38:54.656Z"},
//         {id: "2", atavar: "https://picsum.photos/200/300?random=5", username: "petdewh5erjo", self_points: "1", opp_points: "8", date: "2021-09-24T12:38:54.656Z"},
//         {id: "1", atavar: "https://picsum.photos/200/300?random=6", username: "giorghinho", self_points: "8", opp_points: "1", date: "2021-09-24T12:38:54.656Z"},
//         {id: "10", atavar: "https://picsum.photos/200/300?random=7", username: "marmelade", self_points: "5", opp_points: "9", date: "2021-09-24T12:38:54.656Z"},
//         {id: "34", atavar: "https://picsum.photos/200/300?random=8", username: "xoxoxP", self_points: "3", opp_points: "9", date: "2021-09-24T12:38:54.656Z"},
//         ];
// }
// customElements.define("profile-view", ProfileView);

