import * as modules from './modules.js';

const onDomLoaded = async () => {
    await modules.sessionService.fetchActiveSession();
    console.log("DOM LOADED");
    modules.router.init("pong-app");
    // router.init("pong-app");
};

document.addEventListener("DOMContentLoaded", () => {
    onDomLoaded();
});
