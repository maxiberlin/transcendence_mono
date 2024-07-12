/* eslint-disable no-console */
/// <reference path="../../types/game_types_new.d.ts"/>

export default class DrawObj {
    /**
     * @param {OffscreenCanvasRenderingContext2D} ctx
     * @param {PongGameplayTypes.GameObjData} initial
     */
    constructor(ctx, initial) {
        this.#x = initial.x;
        this.#y = initial.y;
        this.w = initial.w;
        this.w_half = initial.w / 2.0;
        this.h = initial.h;
        this.h_half = initial.h / 2.0;
        this.left = initial.x;
        this.right = initial.x + initial.w;
        this.top = initial.y;
        this.bottom = initial.y + initial.h;
        this.boundBottom = initial.bound_bottom;
        this.boundTop = initial.bound_top;
        this.boundRight = initial.bound_right;
        this.boundLeft = initial.bound_left;
        this.speedX = initial.speed_x;
        this.speedY = initial.speed_y;
        this.dx = initial.dx;
        this.dy = initial.dy;
        this.canvasWidth = 1;
        this.canvasHeight = 1;
        this.color = '#000';
        this.ctx = ctx;
    }

    #x;
    #y;
    get x_center() { return this.x + this.w_half; }
    get y_center() { return this.y + this.h_half; }
    get x() { return this.#x; }
    set x(value) {
        this.#x = value;
        this.left = value;
        this.right = value + this.w;
    }
    get y() { return this.#y; }
    set y(value) {
        this.#y = value;
        this.top = value;
        this.bottom = value + this.h;
    }

    setCanvasSizes(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }

    setColor(color) {
        this.color = color;
    }

    lerp = (a, b, alpha) => a + alpha * (b - a);
    
    lerp2 = (start, end, time) => start * (1 - time) + end * time;
    /**
     * @param {PongGameplayTypes.GameObjPositionData} lastUpdate 
     * @param {PongGameplayTypes.GameObjPositionData} nextUpdate
     * @param {number} elapsedSinceUpdate
     */
    interpolate(lastUpdate, nextUpdate, elapsedSinceUpdate) {
        this.x = this.lerp2(lastUpdate.x, nextUpdate.x, elapsedSinceUpdate);
        this.dx = lastUpdate.dx
        this.y = this.lerp2(lastUpdate.y, nextUpdate.y, elapsedSinceUpdate);
        this.dy = lastUpdate.dy
    }

    draw() {
        this.ctx.fillStyle = this.color;
        this.ctx.fillRect(
            this.x * this.canvasWidth,
            this.y * this.canvasHeight,
            this.w * this.canvasWidth,
            this.h * this.canvasHeight,
        );
    }

    /**
     * 
     * @param {DrawObj} obj 
     * @returns
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