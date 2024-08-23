/* eslint-disable no-console */

export default class DrawObj {
    /**
     * @param {PongGameplayTypes.GameObjData} initial
     */
    constructor(initial) {
        // console.log('init draw: ', initial);
        // /** @type {number} */ this.sx = initial.x;
        // /** @type {number} */ this.sy = initial.y;
        // /** @type {number} */ this.sw = initial.w;
        // /** @type {number} */ this.sh = initial.h;
        /** @type {number} */ this.#x = initial.x;
        /** @type {number} */ this.#y = initial.y;
        /** @type {number} */ this.w = initial.w;
        /** @type {number} */ this.w_half = initial.w / 2.0;
        /** @type {number} */ this.h = initial.h;
        /** @type {number} */ this.h_half = initial.h / 2.0;
        /** @type {number} */ this.left = initial.x;
        /** @type {number} */ this.right = initial.x + initial.w;
        /** @type {number} */ this.top = initial.y;
        /** @type {number} */ this.bottom = initial.y + initial.h;
        /** @type {number} */ this.boundBottom = initial.bound_bottom;
        /** @type {number} */ this.boundTop = initial.bound_top;
        /** @type {number} */ this.boundRight = initial.bound_right;
        /** @type {number} */ this.boundLeft = initial.bound_left;
        /** @type {number} */ this.speedX = initial.speed_x;
        /** @type {number} */ this.speedY = initial.speed_y;
        /** @type {number} */ this.dx = initial.dx;
        /** @type {number} */ this.dy = initial.dy;
        /** @type {number} */ this.canvasWidth = 1;
        /** @type {number} */ this.canvasHeight = 1;
        /** @type {string} */ this.color = '#000';
        
    }

    #x;
    #y;
    get x_center() { return this.x + this.w_half; }
    get y_center() { return this.y + this.h_half; }
    get x() { return this.#x; }
    set x(value) {
        this.#x = value;
        // this.sx = value * this.canvasWidth;
        this.left = value;
        this.right = value + this.w;
    }
    get y() { return this.#y; }
    set y(value) {
        this.#y = value;
        // this.sy = value * this.canvasHeight;
        this.top = value;
        this.bottom = value + this.h;
    }

    /**
     * @param {number} width 
     * @param {number} height 
     */
    setCanvasSizes(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        // this.sx = this.x * width;
        // this.sy = this.y * height;
        // this.sw = this.w * width;
        // this.sh = this.h * height;
    }

    /**
     * @param {string} color 
     */
    setColor(color) {
        this.color = color;
    }

    /**
     * @param {number} a 
     * @param {number} b 
     * @param {number} alpha 
     * @returns {number}
     */
    lerp = (a, b, alpha) => a + alpha * (b - a);
    
    /**
     * @param {number} start
     * @param {number} end
     * @param {number} time
     * @returns {number}
     */
    lerp2 = (start, end, time) => start * (1 - time) + end * time;

    /**
     * @param {PongGameplayTypes.GameObjPositionData | PongServerTypes.GameObjPosBinary} lastUpdate 
     * @param {PongGameplayTypes.GameObjPositionData | PongServerTypes.GameObjPosBinary} nextUpdate
     * @param {boolean} updateX
     * @param {boolean} setDYX
     * @param {number} elapsedSinceUpdate
     */
    interpolate(lastUpdate, nextUpdate, elapsedSinceUpdate, updateX, setDYX) {
        if (updateX === true) {
            this.x = this.lerp2(lastUpdate.x, nextUpdate.x, elapsedSinceUpdate);
        }
        this.y = this.lerp2(lastUpdate.y, nextUpdate.y, elapsedSinceUpdate);
        if (setDYX) {
            this.dx = lastUpdate.dx;
            this.dy = lastUpdate.dy;
        }
        // this.dx = 'dx' in lastUpdate ? lastUpdate.dx : this.dx;
        // this.dy = 'dy' in lastUpdate ? lastUpdate.dy : this.dy;
    }

    /** @param {OffscreenCanvasRenderingContext2D} ctx */
    draw(ctx) {
        ctx.fillStyle = this.color;
        // ctx.fillRect(
        //     this.sx,
        //     this.sy,
        //     this.sw,
        //     this.sh,
        // );
        ctx.fillRect(
            this.x * this.canvasWidth,
            this.y * this.canvasHeight,
            this.w * this.canvasWidth,
            this.h * this.canvasHeight,
        );
    }

    /**
     * @param {DrawObj} obj 
     */
    coll_ision(obj) {
        let diffTimeX = Infinity;
        let diffTimeY = Infinity;
        let collisionX = DrawObj.COLL_NONE;
        let collisionY = DrawObj.COLL_NONE;

        const relVeloX = this.dx * this.speedX - obj.dx * obj.speedX;
        const relVeloY = this.dy * this.speedY - obj.dy * obj.speedY;

        if (relVeloX !== 0) {
            const reciRelVeloX = 1 / Math.abs(relVeloX);
            if ( relVeloX > 0 && this.right > obj.left && this.left < obj.right ) {
                diffTimeX = Math.abs(this.right - obj.left) * reciRelVeloX;
                collisionX = DrawObj.COLL_RIGHT;
            } else if ( relVeloX < 0 && this.left < obj.right && this.right > obj.left ) {
                diffTimeX = Math.abs(obj.right - this.left) * reciRelVeloX;
                collisionX = DrawObj.COLL_LEFT;
            }
        }
        
        if (relVeloY !== 0) {
            const reciRelVeloY = 1 / Math.abs(relVeloY);
            if ( relVeloY > 0 && this.bottom > obj.top && this.top < obj.bottom) {
                diffTimeY = Math.abs(this.bottom - obj.top) * reciRelVeloY;
                collisionY = DrawObj.COLL_BOTTOM;
            } else if ( relVeloY < 0 && this.top < obj.bottom && this.bottom > obj.top) {
                diffTimeY = Math.abs(obj.bottom - this.top) * reciRelVeloY;
                collisionY = DrawObj.COLL_TOP;
            }
        }
        if (isFinite(diffTimeX) && isFinite(diffTimeY)) {
            return (diffTimeX < diffTimeY ? [collisionX, diffTimeX] : [collisionY, diffTimeY]);
        }
        return [DrawObj.COLL_NONE, Infinity];
    }

    static COLL_NONE = 0;
    static COLL_TOP = 1;
    static COLL_RIGHT = 2;
    static COLL_BOTTOM = 3;
    static COLL_LEFT = 4;
}
