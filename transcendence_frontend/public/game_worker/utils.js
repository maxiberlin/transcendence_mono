

    // const renderFunc = (sinceWorkerTimeStamp) => {
    //     const unixTimeStamp = sinceWorkerTimeStamp + performance.timeOrigin + unixServerStartTimeMsDiff;
    //     if (prevTimeStamp === undefined) prevTimeStamp = unixTimeStamp;
    //     const elapsed = (unixTimeStamp - prevTimeStamp) / 1000;
    //     prevTimeStamp = unixTimeStamp;
    //     const shouldRenderNextFrame = callback(once, elapsed, unixTimeStamp, prevTimeStamp);
    //     if (shouldRenderNextFrame && !once) {
    //         currFrame = requestAnimationFrame(renderFunc);
    //     } else {
    //         currFrame = undefined;
    //         prevTimeStamp = undefined;
    //     }
    // };

    const useServerTime = () => {
        let serverTimeMs = performance.timeOrigin;
        let serverTimeDiffMs = 0;
        const syncTime = (timestampMs) => {
            performance.timeOrigin
        };
    
        const timeOriginMs = () => {
    
        };
    
        const serverNowMs = () => {
    
        };
    }
    // console.log(`current client Time since Worker: ${curr}`);
    // console.log(`current client Time since Unix: ${curr_unix}`);
    // console.log(`server Game Start Time Unix: ${syncTimeUnixMs}`);
    // console.log(`client - Server timediff on start: ${curr_unix - syncTimeUnixMs}`);
    // // console.log('unixServerStartTimeMsDiff: ', unixServerStartTimeMsDiff);
    
    /** @param {(once: boolean, elapsedTimeS: number, currUnixTimeStampMs: number, prevUnixTimeStampMs: number, prevRaw: number, sinceWorkerTimeStamp: number) => void} callback */
    export const useFrame = (callback) => {
        if (typeof callback !== 'function') throw new Error('invalid callback');
        let prevTimeStamp;
        let prevRaw;
        let currFrame;
    
        // let serverGameStartTimeMs = 0;
        // let unixServerStartTimeMsDiff = 0;
    
        let timeOrigin = performance.timeOrigin;
    
        let once = false;
        let stopped = true;
    
        const syncTime = (syncTimeUnixMs) => {
            if (syncTimeUnixMs) {
                timeOrigin = syncTimeUnixMs - performance.now();
                // const curr = performance.now();
                // const curr_unix = curr + performance.timeOrigin;
                // serverGameStartTimeMs = syncTimeUnixMs;
                // unixServerStartTimeMsDiff = curr_unix - syncTimeUnixMs;
    
                
                if (prevTimeStamp)
                    timeOrigin + prevRaw;
                    // prevTimeStamp = performance.timeOrigin + prevRaw + unixServerStartTimeMsDiff;
            }
        };
    
        /** @param {number} sinceWorkerTimeStamp */
        const renderFunc = (sinceWorkerTimeStamp) => {
            // const unixTimeStamp =( performance.timeOrigin + sinceWorkerTimeStamp) - unixServerStartTimeMsDiff;
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
            if (currFrame) return;
            if (startTime) syncTime(startTime);
            stopped = false;
            currFrame = requestAnimationFrame(renderFunc);
        };
        const stopRender = () => {
            if (currFrame) {
                // console.log('stopRender!: has current Frame');
                cancelAnimationFrame(currFrame);
                currFrame = undefined;
                prevTimeStamp = undefined;
                stopped = true;
    
            } else {
                // console.log('stopRender: no current Frame');
            }
        };
    
        const resetTime = () => {
            prevTimeStamp = undefined;
        };
    
        const getCurrentServerTime = () => {
            // return (performance.timeOrigin + performance.now()) - unixServerStartTimeMsDiff;
            return timeOrigin + performance.now();
        }
    
        const renderAtMostOnce = () => {
            // console.log('render once!');
            if (!currFrame) {
                once = true;
                // console.log('render once no current Frame!');
                currFrame = requestAnimationFrame(renderFunc);
            } else {
                // console.log('NO render once has current Frame!');
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
    