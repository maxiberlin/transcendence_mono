import DrawObj from './DrawObj';
import GameCourt from './GameCourt';
import PongBall from './Ball';
import PongPaddle from './Paddle';
import { pushMessageToMainThread } from './utils';
import { ballDefault, courtDefault, paddleLeftDefault, paddleRightDefault } from './localInitial';


/** @param {DrawObj} paddle */
export const useMouseTouchHandler = (paddle) => {

    /** @type {number | null} */
    let ident = null;
    /** @type {ToWorkerGameMessageTypes.GameTouchRect | null} */
    let lastTouch = null;

    /** @param {ToWorkerGameMessageTypes.GameTouchRect} touchRect  */
    const checkOverlap = (touchRect) => paddle.left < touchRect.right && paddle.right > touchRect.left
                                                && paddle.top < touchRect.bottom && paddle.bottom > touchRect.top;

    /** @param {ToWorkerGameMessageTypes.GameTouchRect} [touchRect] @returns {boolean} */
    const handleTouchStart = (touchRect) => {
        if (touchRect == undefined) throw new Error("handleTouchStart: touchRect is undefined!!");
        if (paddle && checkOverlap(touchRect)) {
            ident = touchRect.ident;
            lastTouch = touchRect;
            return true;
        } 
        return false;
    }

    /** @param {ToWorkerGameMessageTypes.GameTouchRect} [touchRect] @returns {number | null} */
    const handleTouchMove = (touchRect) => {
        if (!touchRect == undefined) throw new Error("handleTouchMove: touchRect is undefined!!");
        if (touchRect && paddle && lastTouch && touchRect.ident === ident) {
            const pos = paddle.y + (touchRect.y - lastTouch.y);
            lastTouch = touchRect;
            return (pos);
        }
        return (null);
    }

    /** @param {number} [identifier] */
    const handleTouchEnd = (identifier) => {
        if (identifier == undefined) throw new Error("handleTouchEnd: identifier is undefined!!");
        if (identifier === ident) {
            ident = null;
            lastTouch = null;
        }
    }

    return {
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd
    }
}

export class PongObjManager {
    /**
     * @param {OffscreenCanvas} offscreencanvas 
     * @param {number} [userId] 
     */
    constructor(offscreencanvas, userId) {
        this.canvas = offscreencanvas;
        const c = this.canvas.getContext('2d');
        if (c === null) throw new Error('could not get canvas context');
        this.ctx = c;
        this.ballData = ballDefault;
        this.court = new GameCourt(courtDefault);
        this.ball = new PongBall(ballDefault, true);
        this.paddleLeft = new PongPaddle(paddleLeftDefault);
        this.paddleRight = new PongPaddle(paddleRightDefault);
        this.width = this.ctx.canvas.width;
        this.height = this.ctx.canvas.height;
        this.#setObjectSizes(this.width, this.height);
        this.maxScore = 10;
        this.scoreBreak = false;
        this.remote = false;
        this.playerOneId = -1;
        this.playerTwoId = -1;
        this.userId = userId;
        /** @type {PongGameplayTypes.PongGameSides} */
        this.side = "left";
        this.ballTimeout = 1000;
    }

    /**
     * @param {PongGameplayTypes.GameObjData} courtData 
     * @param {PongGameplayTypes.GameObjData} ballData 
     * @param {PongGameplayTypes.GameObjData} paddleLeftData 
     * @param {PongGameplayTypes.GameObjData} paddleRightData 
     */
    recreateGameObjects(courtData, ballData, paddleLeftData, paddleRightData) {
        this.court = new GameCourt(courtData);
        this.ball = new PongBall(ballData, !this.remote);
        this.paddleLeft = new PongPaddle(paddleLeftData);
        this.paddleRight = new PongPaddle(paddleRightData);
        this.#setObjectSizes(this.width, this.height);
    }

    /**
     * @param {number} maxScore 
     * @param {number} ballTimeout
     * @param {boolean} remote
     * @param {number} [playe_one_id]
     * @param {number} [player_two_id] 
     * 
     */
    setSettings(maxScore, ballTimeout, remote, playe_one_id, player_two_id) {
        this.maxScore = maxScore;
        this.scoreBreak = false;
        this.remote = remote;
        if (remote && (playe_one_id == undefined || player_two_id == undefined || this.userId == undefined))
            throw new Error("Invalid user Ids for a remote play");
        this.playerOneId = playe_one_id ?? -1;
        this.playerTwoId = player_two_id ?? -1;
        /** @type {PongGameplayTypes.PongGameSides} */
        this.side = playe_one_id === this.userId ? "left" : player_two_id === this.userId ? "right" : "left";
        this.ballTimeout = ballTimeout;
    }
    /**
     * @param {string} backgroundColor 
     * @param {string} objectColor 
     */
    changeColor(backgroundColor, objectColor) {
        this.court.setColor(backgroundColor, objectColor);
        this.paddleLeft.setColor(objectColor);
        this.paddleRight.setColor(objectColor);
        this.ball.setColor(objectColor);
    }
    #setObjectSizes(width, height) {
        this.court.setCanvasSizes(width, height)
        this.paddleLeft.setCanvasSizes(width, height)
        this.paddleRight.setCanvasSizes(width, height)
        this.ball.setCanvasSizes(width, height)
    }

    /** @param {ToWorkerGameMessageTypes.Resize} d */
    setCanvasSizes(d) {
        this.width = d.width;
        this.height = d.height;
        this.ctx.canvas.width = Math.floor(d.width * d.dpr);
        this.ctx.canvas.height = Math.floor(d.height * d.dpr);
        this.ctx.scale(d.dpr, d.dpr);
        this.#setObjectSizes(d.width, d.height);
    }
    /** @param {PongGameplayTypes.PongGameSides} side @returns {FromWorkerGameMessageTypes.PlayerScored} */
    #getScoredMessage = (side) => ({
        message: "from-worker-player-scored", 
        player_one_id: this.playerOneId, player_two_id: this.playerTwoId,
        player_one_score: this.court.scoreL, player_two_score: this.court.scoreR,
        who_scored_id: side === "left" ? this.playerOneId : this.playerTwoId, side
    })
    /** @param {PongGameplayTypes.GameEndReason} reason @param {PongGameplayTypes.PongGameSides} side @returns {FromWorkerGameMessageTypes.GameEnd} */
    #getGameDoneMessage = (side, reason) => ({
        message: "from-worker-game-done", winner_side: side, loser_side: side === "left" ? "right" : "left",
        winner_id: side === "left" ? this.playerOneId : this.playerTwoId, loser_id: side === "left" ? this.playerTwoId : this.playerOneId,
        player_one_id: this.playerOneId, player_two_id: this.playerTwoId,
        player_one_score: this.court.scoreL, player_two_score: this.court.scoreR, reason
    })
    /**
     * @param {PongGameplayTypes.PongGameSides | number} actionSide
     * @param {"local-set-score-check-win-message-main" | "remote-set-score-message-main" | "remote-game-end-message-main-winner-side"} mode
     * @param {PongGameplayTypes.GameEndReason} [data]
     * @returns 
     */
    makeAction(actionSide, mode, data) {
        let end = false;
        /** @type {PongGameplayTypes.PongGameSides | "none"} */
        let side;
        if (typeof actionSide === "number") side = this.playerOneId === actionSide ? "left" : this.playerTwoId === actionSide ? "right" : "none";
        else side = actionSide;
        if (mode !== "remote-game-end-message-main-winner-side") {
            if (side === "left") {
                this.court.scoreL++;
                if (this.court.scoreL === this.maxScore) end = true
            } else if (side === "right") {
                this.court.scoreR++;
                if (this.court.scoreR === this.maxScore) end = true
            } else {
                throw new Error("PongObjsManager: makeAction: invalid side");
            }
            pushMessageToMainThread(this.#getScoredMessage(side))
            
            // console.log('timeout for: ', data);
            if (!end) {
                this.scoreBreak = true;
                setTimeout(() => {
                    // console.log('timeout done old ball: ', this.ball);
                    this.ball = new PongBall(this.ballData, !this.remote);
                    // console.log('new ball created: ', this.ball);
                    this.ball.setCanvasSizes(this.width, this.height);
                    // console.log(`this.width: ${this.width} this.height: ${this.height}`);
                    this.scoreBreak = false;
                    // console.log('reset scorebreak now noot');
                }, this.ballTimeout);
            }
        }
        if (side === "none")
            throw new Error("PongObjsManager: makeAction: invalid side");
        if (typeof data === "string" && mode === "remote-game-end-message-main-winner-side")
            pushMessageToMainThread(this.#getGameDoneMessage(side, data))
        else if (end && mode === "local-set-score-check-win-message-main") 
            pushMessageToMainThread(this.#getGameDoneMessage(side, "reguar"))

        
    }

    draw() {
        this.court.draw(this.ctx);
        this.paddleLeft.draw(this.ctx);
        this.paddleRight.draw(this.ctx);
        this.ball.draw(this.ctx);
    }
}

