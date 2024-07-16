import DrawObj from './DrawObj.js';


/** @param {(once: boolean, elapsedTimeS: number, currUnixTimeStampMs: number, prevUnixTimeStampMs: number, prevRaw: number, sinceWorkerTimeStamp: number) => void} callback */
export const useFrame = (callback) => {
    if (typeof callback !== 'function') throw new Error('invalid callback');
    let prevTimeStamp;
    let prevRaw;
    let currFrame;
    let timeOrigin = performance.timeOrigin;
    let once = false;
    let stopped = true;

    const syncTime = (syncTimeUnixMs) => {
        if (syncTimeUnixMs) {
            timeOrigin = syncTimeUnixMs - performance.now();
            if (prevTimeStamp)
                timeOrigin + prevRaw;
        }
    };

    /** @param {number} sinceWorkerTimeStamp */
    const renderFunc = (sinceWorkerTimeStamp) => {
        const unixTimeStamp = timeOrigin + sinceWorkerTimeStamp;
        if (prevTimeStamp === undefined) {
            prevTimeStamp = unixTimeStamp;
            prevRaw = sinceWorkerTimeStamp;
        }
        const elapsedTimeMs = sinceWorkerTimeStamp - prevRaw;
        const elapsed = elapsedTimeMs / 1000;
        callback(once, elapsed, unixTimeStamp, elapsedTimeMs, prevRaw, sinceWorkerTimeStamp);
        prevRaw = sinceWorkerTimeStamp;
        prevTimeStamp = unixTimeStamp;
        if (!stopped && !once) {
            currFrame = requestAnimationFrame(renderFunc);
        } else {
            currFrame = undefined;
            prevTimeStamp = undefined;
            once = false;
        }
    };
    /** @param {number} [startTime] */
    const startRender = (startTime) => {
        if (currFrame && !once) return;
        if (startTime) syncTime(startTime);
        stopped = false;
        currFrame = requestAnimationFrame(renderFunc);
    };
    const stopRender = () => {
        if (currFrame) {
            cancelAnimationFrame(currFrame);
            currFrame = undefined;
            prevTimeStamp = undefined;
            stopped = true;
        }
    };

    const resetTime = () => {
        prevTimeStamp = undefined;
    };

    const getCurrentServerTime = () => {
        return timeOrigin + performance.now();
    }

    const renderAtMostOnce = () => {
        if (!currFrame) {
            once = true;
            currFrame = requestAnimationFrame(renderFunc);
        } 
    };

    return {
        syncTime,
        startRender,
        stopRender,
        resetTime,
        renderAtMostOnce,
        getCurrentServerTime
    };
};

/**
 * @param {number} time
 * @returns {(newTime: number) => number}
 */
// eslint-disable-next-line no-unused-vars
function useFps(time) {
    let currTime = time ?? performance.now();
    let fpsCount = 0;
    let currFps = 0;
    return (newTime) => {
        fpsCount += 1000;
        const diff = newTime - currTime;
        if (diff > 1000) {
            currFps = Math.floor(fpsCount / diff);
            currTime = newTime;
            fpsCount = 0;
        }
        return currFps;
    };
}

/**
 * @param {number} userId
 * @param {APITypes.GameScheduleItem} gameSchedule
 * @param {DrawObj} paddleLeft
 * @param {DrawObj} paddleRight
 * @param {boolean} remote
 */
export const usePaddleSide = (userId, gameSchedule, paddleLeft, paddleRight, remote) => {
    const side = !remote ? "local"
                : userId === gameSchedule.player_one.id ? "left"
                : userId === gameSchedule.player_two.id ? "right"
                : null;
}

const useInterpolation = () => {

}

/**
 * @param {DrawObj} paddle
 */
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