import { BaseElem, sessionService, html, TemplateAsLiteral } from '../modules.js';


/**
 * @typedef {Object} ActionBtnData
 * @property {string} [color]
 * @property {string} [icon]
 * @property {string} [text]
 * @property {string} [radius]
 * @property {boolean} [dropdownitem]
 * @property {boolean} [stretch]
 * @property {boolean} [showText]
 * @property {boolean} [outline]
 * @property {string} [loadingText]
 * @property {()=>void} [cb]
 * @property {BaseElem} [host]
 */




/**
 * 
 * @param {any} handler 
 * @param {ActionBtnData} conf
 * @param {ActionBtnData} defConf
 * @returns 
 */
const getBtn = (handler, conf, defConf) => {
    const asyncHandler = async () => {
        await handler();
        if (!conf.host && conf.cb && typeof conf.cb === "function")
            conf.cb();
        if (conf.host && !conf.cb && conf.host instanceof BaseElem)
            conf.host.requestUpdate();
    };
    let text;
    if (conf.showText || (conf.showText === undefined && defConf.showText)) text = conf.text ?? defConf.text;
    else text = "";
    let loadingText;
    if (conf.showText || (conf.showText === undefined && defConf.showText)) loadingText = conf.loadingText ?? defConf.loadingText;
    else loadingText = "";
    const color = conf.color ?? defConf.color;
    const icon = conf.icon ?? defConf.icon;
    const radius = conf.radius ?? defConf.radius;
    const outline = conf.outline ?? defConf.outline;
    const dropdownitem = conf.dropdownitem ?? "";
    const stretch = conf.stretch ?? "";

    return html`
        <bs-button ._async_handler=${asyncHandler}
            color="${color}" icon="${icon}" radius="${radius}" ?outline=${outline}
            loadingText="${loadingText}" text="${text}" ?dropdownitem="${dropdownitem}" ?stretch="${stretch}">

        </bs-button>
    `;
};

/**
 * 
 * @param {ActionBtnData} conf
 * @param {Array<TemplateAsLiteral>} actions
 * @returns 
 */
export const renderDropdow = (conf, actions) => {
    const color = `btn-${conf.outline ? "outline-" : ""}${conf.color ?? "primary"}`;
    return html`
        <div class="dropdown">
            <button class="btn ${color} " ?outline=${conf.outline} type="button" data-bs-toggle="dropdown" aria-expanded="false">
                ${conf.icon ? html`<i class="fa-solid fa-fw fa-${conf.icon}"></i>` : ""}
                ${conf.text ?? ""}
            </button>
            <ul class="dropdown-menu">
                ${(actions && actions instanceof Array) ? actions.map((action) => html`<li>${action}</li>`) : ""}
            </ul>
        </div>
    
`;
};

export const actions = {
    unBlockUser:          /** @param {number} userId        @param {ActionBtnData} conf */
        (userId, conf) => getBtn(sessionService.unblockUser.bind(sessionService, userId), conf, { color: "success", icon: "unlock", text: "unblock user", loadingText: "unblock user", radius: "3", showText: true, outline: false }),
    blockUser:            /** @param {number} userId        @param {ActionBtnData} conf */
        (userId, conf) => getBtn(sessionService.blockUser.bind(sessionService, userId), conf, { color: "danger", icon: "lock", text: "block user", loadingText: "block user", radius: "3", showText: true, outline: true }),
    sendFriendRequest:    /** @param {number} userId        @param {ActionBtnData} conf */
        (userId, conf) => getBtn(sessionService.sendFriendRequest.bind(sessionService, userId), conf, { color: "dark", icon: "user-plus", text: "add", loadingText: "add", radius: "3", showText: true, outline: true }),
    removeFriend:         /** @param {number} userId        @param {ActionBtnData} conf */
        (userId, conf) => getBtn(sessionService.removeFriend.bind(sessionService, userId), conf, { color: "danger", icon: "user-xmark", text: "remove friend", loadingText: "remove friend", radius: "3", showText: true, outline: true }),
    cancelFriendRequest:  /** @param {number} requestId     @param {ActionBtnData} conf */
        (requestId, conf) => getBtn(sessionService.cancelFriendRequest.bind(sessionService, requestId), conf, { color: "danger", icon: "xmark", text: "cancel", loadingText: "cancel", radius: "3", showText: true, outline: true }),
    acceptFriendRequest:  /** @param {number} requestId     @param {ActionBtnData} conf */
        (requestId, conf) => getBtn(sessionService.acceptFriendRequest.bind(sessionService, requestId), conf, { color: "success", icon: "check", text: "accept", loadingText: "accept", radius: "3", showText: true, outline: true }),
    rejectFriendRequest:  /** @param {number} requestId     @param {ActionBtnData} conf */
        (requestId, conf) => getBtn(sessionService.rejectFriendRequest.bind(sessionService, requestId), conf, { color: "danger", icon: "xmark", text: "reject", loadingText: "reject", radius: "3", showText: true, outline: true }),
    sendGameInvitation:   /** @param {number} userId        @param {ActionBtnData} conf */
        (userId, conf) => getBtn(sessionService.sendGameInvitation.bind(sessionService, userId), conf, { color: "warning", icon: "gamepad", text: "play", loadingText: "play", radius: "3", showText: true, outline: true }),
    cancelGameInvitation: /** @param {number} invitationId  @param {ActionBtnData} conf */
        (invitationId, conf) => getBtn(null, conf, { color: "danger", icon: "xmark", text: "block", loadingText: "block", radius: "3", showText: true, outline: true }),
    acceptGameInvitation: /** @param {number} invitationId  @param {ActionBtnData} conf */
        (invitationId, conf) => getBtn(sessionService.acceptGameInvitation.bind(sessionService, invitationId), conf, { color: "success", icon: "check", text: "accept", loadingText: "accept", radius: "3", showText: true, outline: true }),
    rejectGameInvitation: /** @param {number} invitationId  @param {ActionBtnData} conf */
        (invitationId, conf) => getBtn(sessionService.rejectGameInvitation.bind(sessionService, invitationId), conf, { color: "danger", icon: "xmark", text: "reject", loadingText: "reject", radius: "3", showText: true, outline: true }),
    startGame:            /** @param {number} scheduleId    @param {ActionBtnData} conf */
        (scheduleId, conf) => getBtn(sessionService.startGameByScheduleId.bind(sessionService, scheduleId), conf, { color: "primary", icon: "gamepad", text: "start Match", loadingText: "start Match", radius: "3", showText: true, outline: true }),
};

actions.receivedGameInvitations = (invitationId, showText) => html`
    <div>
        ${actions.acceptGameInvitation(invitationId, { showText: showText })}
        ${actions.rejectGameInvitation(invitationId, { showText: showText })}
    </div>
`


