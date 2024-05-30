// worker.js


/** @type {PongRemote | undefined} */
let game;

/** @param {MessageEvent} ev */
onmessage = (ev) => {
    const msg = ev.data;
    switch (msg.message) {
        case msg_to_worker_remote.create: game = new PongRemote(msg.data);
            // console.log("create new Pong instance");
            break;
        case msg_to_worker_remote.init: game?.initGameObjects(msg.data.gameSettings);
            // console.log("create new Pong instance");
            break;
        case msg_to_worker_remote.start: game?.startGame()
            // console.log("msg start game");
            break;
        case msg_to_worker_remote.quit:
            // console.log("msg quit game");
            break;
        case msg_to_worker_remote.terminate:
            // console.log("msg terminate game");
            break;
        case msg_to_worker_remote.pause:
            // console.log("msg pause game");
            break;
        case msg_to_worker_remote.continue:
            // console.log("msg continue game");
            break;
        case msg_to_worker_remote.resize: game?.setCanvasSizes(msg.data);
            // console.log("msg set canvas sizes");
            break;
        case msg_to_worker_remote.changeColor: game?.changeColor(msg.data);
            // console.log("msg change color");
            break;
        case msg_to_worker_remote.update_pos: game?.updateGameObjects(msg.data.state);
            // console.log("msg change color");
            break;
        
    }
};

