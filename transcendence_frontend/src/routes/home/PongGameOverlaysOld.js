import { avatarInfo } from '../../components/bootstrap/AvatarComponent';
import BsModal from '../../components/bootstrap/BsModal';
import { BaseElement, createRef, ref, html } from '../../lib_templ/BaseElement.js';
import { sessionService } from '../../services/api/API';

/**
 * @template T
 * @param {BaseElement} parent
 * @param {T} initialValue - The initial state value.
 * @returns {[() => T, (newValue: T) => void]} - A tuple with a state getter and a state setter.
 */
export function useState(parent, initialValue) {
    let state = initialValue;

    /** @param {T} newValue */
    const setState = (newValue) => {
        state = newValue;
        // //   console.log(`State updated to: ${state}`);
        parent.requestUpdate();
    };

    /** @returns {T} */
    function getState() {
        return state;
    }

    return [getState, setState];
}

export class PongGameOverlays extends BaseElement {
    static observedAttributes = [];
    constructor() {
        super(false, false, true);
        this.session = sessionService.subscribe(this);
    }
    /** @type {import('../../lib_templ/BaseElement').Ref<BsModal>} */
    waitForLaunchModal = createRef();
    /** @type {import('../../lib_templ/BaseElement').Ref<BsModal>} */
    waitForStartModal = createRef();
    /** @type {import('../../lib_templ/BaseElement').Ref<BsModal>} */
    startGameModal = createRef();
    /** @type {import('../../lib_templ/BaseElement').Ref<BsModal>} */
    disconnectModal = createRef();
    /** @type {import('../../lib_templ/BaseElement').Ref<BsModal>} */
    gameDoneModal = createRef();




    /** @param {APITypes.GameScheduleItem | null} [data] @param {number} [id] */
    getPlayerDataFromId = (data, id) => (id != undefined && data?.player_one.id === id) ? data?.player_one : data?.player_two;
    /** @param {APITypes.GameScheduleItem | null} [data] */
    getPlayerDataSelf = (data) => data?.player_one.id === this.session.value?.user?.id ? data?.player_one : data?.player_two
    /** @param {APITypes.GameScheduleItem | null} [data] */
    getPlayerDataOther = (data) => data?.player_one.id !== this.session.value?.user?.id ? data?.player_one : data?.player_two
    /** @param {number} [id] */
    playerIsSelf = (id) => id === this.session.value?.user?.id
 
    renderSpinner = () => html`
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    `

    // getBaseContent = () => html`
    
    // `

    /** @param {'launchSelf' | 'launchOther'} type @param {APITypes.GameScheduleItem | null} [gameData] */
    showWaitForLaunch = async (type, gameData) => {
        await this.updateComplete;
        await this.waitForLaunchModal.value?.updateComplete;
        this.waitForLaunchModal.value?.setContentAndShow({
        content: html`
            <div class="d-flex flex-column align-items-center">
                ${type === 'launchSelf' ? html`
                    <p>Connecting to the server...</p>    
                ` : html`
                    <div class="d-flex align-items-center">
                        <span class="me-2">Waiting for</span>
                        ${avatarInfo(this.getPlayerDataOther(gameData))}
                        <span class="ms-2">to Launch the Game</span>
                    </div>
                `}
                ${this.renderSpinner()}
            </div>
        `,
        // footer: html`
        //     <bs-button text="Close" ._async_handler=${(e)=> {
        //         this.waitForLaunchModal.value?.hideModal();
        //     }}></bs-button>
        // `
    })}
    /** @param {APITypes.GameScheduleItem | null} [gameData] */
    showWaitForStart = async (gameData) => {
        await this.updateComplete;
        await this.waitForStartModal.value?.updateComplete;
        this.waitForStartModal.value?.setContentAndShow({
        content: html`
            <div class="d-flex flex-column align-items-center">
                <div class="d-flex align-items-center">
                    <span class="me-2">Waiting for</span>
                    ${avatarInfo(this.getPlayerDataOther(gameData))}
                    <span class="ms-2">to start the Match</span>
                </div>
                ${this.renderSpinner()}
            </div>
        `,
        // footer: html`
        //     <bs-button text="Close" ._async_handler=${(e)=> {
        //         this.waitForStartModal.value?.hideModal();
        //     }}></bs-button>
        // `
    })}
    /**
     * @param {APITypes.GameScheduleItem | null} [gameData]
     * @param {() => void} [onStart]
     */
    showStartGame = async (gameData, onStart) => {
        await this.updateComplete;
        await this.startGameModal.value?.updateComplete;
        this.startGameModal.value?.setContentAndShow({
        header: html`
                    <span>Pong Match starts in: </span>
                    <timer-comp timeout="3" ></timer-comp>`,
        content: html`
            <div class="d-flex align-items-center justify-content-around">
                ${avatarInfo(gameData?.player_two)}
                <p class="m-0">VS</p>
                ${avatarInfo(gameData?.player_one)}
            </div>
        `,
        footer: html`
            <bs-button text="Start Game" ._async_handler=${(e)=> {
                this.startGameModal.value?.hideModal();
                if (onStart) onStart();
            }}></bs-button>
        `
    })}
    
    /**
     * @param {APITypes.GameScheduleItem | null} [gameData]
     * @param {number} [id]
     */
    showDisconnect = async (gameData, id) => {
        await this.updateComplete;
        await this.gameDoneModal.value?.updateComplete;
        this.disconnectModal.value?.setContentAndShow({
        header: html`<span>Connection Lost</span>`,
        content: html`
            <div class="d-flex flex-row align-items-center justify-content-center">
                ${avatarInfo(this.getPlayerDataFromId(gameData, id))}
                ${this.playerIsSelf(id) ? 'You' : ''}
                <span>disconnected</span>
            </div>
            <div>
                ${this.playerIsSelf(id) ? 'attempting to reconnect' : 'waiting for Opponent...'}
                ${this.renderSpinner()}
            </div>
        `,
         footer: html`
         <bs-button text="Close" ._async_handler=${(e)=> {
             this.disconnectModal.value?.hideModal();
         }}></bs-button>
     `
    })}
   
    /**
     * @param {FromWorkerGameMessageTypes.GameEnd} [data]
     * @param {() => void} [onDoneCb]
     */
    showGameDone = async (data, onDoneCb) => {
        // this.hide('all');
        await this.updateComplete;
        await this.gameDoneModal.value?.updateComplete;
        const hasWon = data?.winner_id === this.session.value?.user?.id;
        const myPlayer = this.getPlayerDataSelf(data?.game_result);
        const myXp = hasWon ? data?.game_result?.result.winner_xp : data?.game_result?.result.loser_xp;
        this.gameDoneModal.value?.setContentAndShow({
        header: html`
            <span>${hasWon ? 'You won the Match!' : 'You lost the Match'}</span>
        `,
        content: html`
            <div class="d-flex flex-column align-items-center justify-content-center">
                ${avatarInfo(myPlayer)}
                <p>XP: ${myXp}</p>
            </div>
        `,
        footer: html`
            <bs-button
            color="success"
            text="ask for a rematch"
            ._async_handler=${(e) => {
                this.gameDoneModal.value?.hideModal();
            }}
            ></bs-button>
            <bs-button
            text="Close the Game"
            ._async_handler=${(e) => {
                if (onDoneCb && typeof onDoneCb === 'function') onDoneCb();
                this.gameDoneModal.value?.hideModal();
            }}
            ></bs-button>
        `
    })}

    /** @param {'waitForLaunchModal' | 'waitForStartModal' | 'startGameModal' | 'disconnectModal' | 'gameDoneModal' | 'all'} type  */
    async hide(type) {
        await this.updateComplete;
        await this.waitForLaunchModal.value?.updateComplete;
        await this.waitForStartModal.value?.updateComplete;
        await this.startGameModal.value?.updateComplete;
        await this.disconnectModal.value?.updateComplete;
        await this.gameDoneModal.value?.updateComplete;
        if (type === 'all' || type === 'waitForLaunchModal') this.waitForLaunchModal.value?.hideModal();
        if (type === 'all' || type === 'waitForStartModal') this.waitForStartModal.value?.hideModal();
        if (type === 'all' || type === 'startGameModal') this.startGameModal.value?.hideModal();
        if (type === 'all' || type === 'disconnectModal') this.disconnectModal.value?.hideModal();
        if (type === 'all' || type === 'gameDoneModal') this.gameDoneModal.value?.hideModal();
    }

    render() {
        return html`
            <bs-modal fade ${ref(this.waitForLaunchModal)} ></bs-modal>
            <bs-modal fade ${ref(this.waitForStartModal)} ></bs-modal>
            <bs-modal fade ${ref(this.startGameModal)} ></bs-modal>
            <bs-modal fade ${ref(this.disconnectModal)} ></bs-modal>
            <bs-modal fade ${ref(this.gameDoneModal)} ></bs-modal>
        `
    }
}
customElements.define("pong-game-overlays", PongGameOverlays);

// /**
//  * @template T
//  * @param {BaseElement} parent
//  * @param {T} initialValue - The initial state value.
//  * @returns {[() => T, (newValue: T) => void]} - A tuple with a state getter and a state setter.
//  */
// export function useState(parent, initialValue) {
//     let state = initialValue;

//     /** @param {T} newValue */
//     const setState = (newValue) => {
//         state = newValue;
//         // //   console.log(`State updated to: ${state}`);
//         parent.requestUpdate();
//     };

//     /** @returns {T} */
//     function getState() {
//         return state;
//     }

//     return [getState, setState];
// }

// export class PongGameOverlays extends BaseElement {
//     static observedAttributes = [];
//     constructor() {
//         super(false, false, true);
//         this.session = sessionService.subscribe(this);
//     }
//     /** @type {import('../../lib_templ/BaseElement').Ref<BsModal>} */
//     waitForLaunchModal = createRef();
//     /** @type {import('../../lib_templ/BaseElement').Ref<BsModal>} */
//     waitForStartModal = createRef();
//     /** @type {import('../../lib_templ/BaseElement').Ref<BsModal>} */
//     startGameModal = createRef();
//     /** @type {import('../../lib_templ/BaseElement').Ref<BsModal>} */
//     disconnectModal = createRef();
//     /** @type {import('../../lib_templ/BaseElement').Ref<BsModal>} */
//     gameDoneModal = createRef();




//     /** @param {APITypes.GameScheduleItem | null} [data] @param {number} [id] */
//     getPlayerDataFromId = (data, id) => (id != undefined && data?.player_one.id === id) ? data?.player_one : data?.player_two;
//     /** @param {APITypes.GameScheduleItem | null} [data] */
//     getPlayerDataSelf = (data) => data?.player_one.id === this.session.value.user?.id ? data?.player_one : data?.player_two
//     /** @param {APITypes.GameScheduleItem | null} [data] */
//     getPlayerDataOther = (data) => data?.player_one.id !== this.session.value.user?.id ? data?.player_one : data?.player_two
//     /** @param {number} [id] */
//     playerIsSelf = (id) => id === this.session.value.user?.id
 
//     renderSpinner = () => html`
//         <div class="spinner-border text-primary" role="status">
//             <span class="visually-hidden">Loading...</span>
//         </div>
//     `

//     // getBaseContent = () => html`
    
//     // `

//     /** @param {'launchSelf' | 'launchOther'} type @param {APITypes.GameScheduleItem | null} [gameData] */
//     showWaitForLaunch = (type, gameData) => {
//         console.log('showWaitForLaunch');
        
//         // this.hide('all');
//         this.waitForLaunchModal.value?.setContentAndShow({
//         content: html`
//             <div class="d-flex flex-column align-items-center">
//                 ${type === 'launchSelf' ? html`
//                     <p>Connecting to the server...</p>    
//                 ` : html`
//                     <div class="d-flex align-items-center">
//                         <span class="me-2">Waiting for</span>
//                         ${avatarInfo(this.getPlayerDataOther(gameData))}
//                         <span class="ms-2">to Launch the Game</span>
//                     </div>
//                 `}
//                 ${this.renderSpinner()}
//             </div>
//         `,
//         // footer: html`
//         //     <bs-button text="Close" ._async_handler=${(e)=> {
//         //         this.waitForLaunchModal.value?.hideModal();
//         //     }}></bs-button>
//         // `
//     })}
//     /** @param {APITypes.GameScheduleItem | null} [gameData] */
//     showWaitForStart = (gameData) => {
//         this.hide('all');
//         this.waitForStartModal.value?.setContentAndShow({
//         content: html`
//             <div class="d-flex flex-column align-items-center">
//                 <div class="d-flex align-items-center">
//                     <span class="me-2">Waiting for</span>
//                     ${avatarInfo(this.getPlayerDataOther(gameData))}
//                     <span class="ms-2">to start the Match</span>
//                 </div>
//                 ${this.renderSpinner()}
//             </div>
//         `,
//         // footer: html`
//         //     <bs-button text="Close" ._async_handler=${(e)=> {
//         //         this.waitForStartModal.value?.hideModal();
//         //     }}></bs-button>
//         // `
//     })}
//     /**
//      * @param {APITypes.GameScheduleItem | null} [gameData]
//      * @param {() => void} [onStart]
//      */
//     showStartGame = (gameData, onStart) => {
//         this.hide('all');
//         this.startGameModal.value?.setContentAndShow({
//         header: html`
//                     <span>Pong Match starts in: </span>
//                     <timer-comp timeout="3" ></timer-comp>`,
//         content: html`
//             <div class="d-flex align-items-center justify-content-around">
//                 ${avatarInfo(gameData?.player_two)}
//                 <p class="m-0">VS</p>
//                 ${avatarInfo(gameData?.player_one)}
//             </div>
//         `,
//         footer: html`
//             <bs-button text="Start Game" ._async_handler=${(e)=> {
//                 this.startGameModal.value?.hideModal();
//                 if (onStart) onStart();
//             }}></bs-button>
//         `
//     })}
    
//     /**
//      * @param {APITypes.GameScheduleItem | null} [gameData]
//      * @param {number} [id]
//      */
//     showDisconnect = (gameData, id) => {
//         this.hide('all');
//         this.disconnectModal.value?.setContentAndShow({
//         header: html`<span>Connection Lost</span>`,
//         content: html`
//             <div class="d-flex flex-row align-items-center justify-content-center">
//                 ${avatarInfo(this.getPlayerDataFromId(gameData, id))}
//                 ${this.playerIsSelf(id) ? 'You' : ''}
//                 <span>disconnected</span>
//             </div>
//             <div>
//                 ${this.playerIsSelf(id) ? 'attempting to reconnect' : 'waiting for Opponent...'}
//                 ${this.renderSpinner()}
//             </div>
//         `,
//          footer: html`
//          <bs-button text="Close" ._async_handler=${(e)=> {
//              this.disconnectModal.value?.hideModal();
//          }}></bs-button>
//      `
//     })}
   
//     /**
//      * @param {FromWorkerGameMessageTypes.GameEnd} [data]
//      * @param {() => void} [onDoneCb]
//      */
//     showGameDone = (data, onDoneCb) => {
//         this.hide('all');
//         const hasWon = data?.winner_id === this.session.value.user?.id;
//         const myPlayer = this.getPlayerDataSelf(data?.game_result);
//         const myXp = hasWon ? data?.game_result?.result.winner_xp : data?.game_result?.result.loser_xp;
//         this.gameDoneModal.value?.setContentAndShow({
//         header: html`
//             <span>${hasWon ? 'You won the Match!' : 'You lost the Match'}</span>
//         `,
//         content: html`
//             <div class="d-flex flex-column align-items-center justify-content-center">
//                 ${avatarInfo(myPlayer)}
//                 <p>XP: ${myXp}</p>
//             </div>
//         `,
//         footer: html`
//             <bs-button
//             color="success"
//             text="ask for a rematch"
//             ._async_handler=${(e) => {
//                 this.gameDoneModal.value?.hideModal();
//             }}
//             ></bs-button>
//             <bs-button
//             text="Close the Game"
//             ._async_handler=${(e) => {
//                 if (onDoneCb && typeof onDoneCb === 'function') onDoneCb();
//                 this.gameDoneModal.value?.hideModal();
//             }}
//             ></bs-button>
//         `
//     })}

//     /** @param {'waitForLaunchModal' | 'waitForStartModal' | 'startGameModal' | 'disconnectModal' | 'gameDoneModal' | 'all'} type  */
//     hide(type) {
//         if (type === 'all' || type === 'waitForLaunchModal') this.waitForLaunchModal.value?.hideModal();
//         if (type === 'all' || type === 'waitForStartModal') this.waitForStartModal.value?.hideModal();
//         if (type === 'all' || type === 'startGameModal') this.startGameModal.value?.hideModal();
//         if (type === 'all' || type === 'disconnectModal') this.disconnectModal.value?.hideModal();
//         if (type === 'all' || type === 'gameDoneModal') this.gameDoneModal.value?.hideModal();
//     }

//     render() {
//         return html`
//             <bs-modal fade ${ref(this.waitForLaunchModal)} ></bs-modal>
//             <bs-modal fade ${ref(this.waitForStartModal)} ></bs-modal>
//             <bs-modal fade ${ref(this.startGameModal)} ></bs-modal>
//             <bs-modal fade ${ref(this.disconnectModal)} ></bs-modal>
//             <bs-modal fade ${ref(this.gameDoneModal)} ></bs-modal>
//         `
//     }
// }
// customElements.define("pong-game-overlays", PongGameOverlays);