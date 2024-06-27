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

    /**
     * @param {PongGameplayTypes.GameObjPositionData} update
     * @param {number} timediff
     */
    updataPositions(update, timediff) {
        this.x = update.x;
        this.y = update.y;
        this.dx = update.dx;
        this.dy = update.dy;
        this.update(timediff);
    }

    /**
     * @param {number | undefined} elapsedTimeSec
     */
    // eslint-disable-next-line no-unused-vars, class-methods-use-this
    update(elapsedTimeSec) {}

    draw(elapsedTimeSec) {
        if (elapsedTimeSec) this.update(elapsedTimeSec);
        this.ctx.fillStyle = this.color;
        this.ctx.fillRect(
            this.x * this.canvasWidth,
            this.y * this.canvasHeight,
            this.w * this.canvasWidth,
            this.h * this.canvasHeight,
        );
    }

    /**
     * @param {DrawObj} obj
     * @returns {number}
     */
    collision(obj) {
        let diffL = 0;
        let diffR = 0;
        let diffT = 0;
        let diffB = 0;

        // console.log('collision: this: ', this);
        // console.log('collision: obj: ', obj);

        const t = this.bottom > obj.top && this.bottom < obj.bottom;
        if (t) diffT = this.bottom - obj.top;
        const b = this.top < obj.bottom && this.top > obj.top;
        if (b) diffB = obj.bottom - this.top;
        const l = this.left < obj.right && this.left > obj.left;
        if (l) diffL = obj.right - this.left;
        const r = this.right > obj.left && this.right < obj.right;
        if (r) diffR = this.right - obj.left;

        if (diffT > 0 && diffR > 0)
            return diffT < diffR ? DrawObj.COLL_TOP : DrawObj.COLL_RIGHT;
        if (diffT > 0 && diffL > 0)
            return diffT < diffL ? DrawObj.COLL_TOP : DrawObj.COLL_LEFT;
        if (diffB > 0 && diffR > 0)
            return diffB < diffR ? DrawObj.COLL_BOTTOM : DrawObj.COLL_RIGHT;
        if (diffB > 0 && diffL > 0)
            return diffB < diffL ? DrawObj.COLL_BOTTOM : DrawObj.COLL_LEFT;
        // if (diffT > 0 && diffR > 0)
        //     return (diffT < diffR ? 1 : 2);
        // if (diffT > 0 && diffL > 0)
        //     return (diffT < diffL ? 1 : 4);
        // if (diffB > 0 && diffR > 0)
        //     return (diffB < diffR ? 3 : 2);
        // if (diffB > 0 && diffL > 0)
        //     return (diffB < diffL ? 3 : 4);
        return 0;
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

        // console.log(`this.dx: ${this.dx}`);
        // console.log(`this.dy: ${this.dy}`);
        // console.log(`this.speedX: ${this.speedX}`);
        // console.log(`this.speedY: ${this.speedY}`);
        // console.log(`obj.dx: ${obj.dx}`);
        // console.log(`obj.dy: ${obj.dy}`);
        // console.log(`obj.speedX: ${obj.speedX}`);
        // console.log(`obj.speedY: ${obj.speedY}`);
        console.log(`relVeloX: ${relVeloX}`);
        console.log(`relVeloY: ${relVeloY}`);
        // console.log(`this.dy * this.speedY: ${this.dy * this.speedY}`);
        // console.log(`obj.dy * obj.speed_y: ${obj.dy * obj.speedY}`);
        // console.log(`this.dy * this.speedY - obj.dy * obj.speed_y: ${this.dy * this.speedY - obj.dy * obj.speedY}`);

        if (relVeloX !== 0) {
            console.log('check collision X');
            console.log(`this.right: ${this.right}`);
            console.log(`obj.right: ${obj.right}`);
            console.log(`this.left: ${this.left}`);
            console.log(`obj.left: ${obj.left}`);
            const reciRelVeloX = 1 / Math.abs(relVeloX);
            console.log(`reciRelVeloX: ${reciRelVeloX}`);
            // console.log(`obj diff x: ${Math.abs(this.right - obj.left)}`);
            // if ( relVeloX > 0 && this.right > obj.left && this.right < obj.right ) {
            if ( relVeloX > 0 && this.right > obj.left && this.right < obj.right ) {
                diffTimeX = Math.abs(this.right - obj.left) * reciRelVeloX;
                collisionX = DrawObj.COLL_RIGHT;
                console.log('COLL_RIGHT');
            // } else if ( relVeloX < 0 && this.left < obj.right && this.left > obj.left ) {
            } else if ( relVeloX < 0 && this.left < obj.right && this.left > obj.left ) {
                diffTimeX = Math.abs(obj.right - this.left) * reciRelVeloX;
                collisionX = DrawObj.COLL_LEFT;
                console.log('COLL_LEFT');
            }
        }
        
        if (relVeloY !== 0) {
            console.log('check collision Y');
            console.log(`this.top: ${this.top}`);
            console.log(`obj.top: ${obj.top}`);
            console.log(`this.bottom: ${this.bottom}`);
            console.log(`obj.bottom: ${obj.bottom}`);
            const reciRelVeloY = 1 / Math.abs(relVeloY);
            console.log(`reciRelVeloY: ${reciRelVeloY}`);
            console.log(`obj diff: ${Math.abs(obj.bottom - this.top)}`);
            // if ( relVeloY > 0 && this.bottom > obj.top && this.bottom < obj.bottom ) {
            if ( relVeloY > 0 && this.bottom > obj.top && this.bottom < obj.bottom ) {
                diffTimeY = Math.abs(this.bottom - obj.top) * reciRelVeloY;
                collisionY = DrawObj.COLL_BOTTOM;
                console.log('COLL_BOTTOM');
                // if (Math.abs(this.bottom - obj.top) * reciRelVeloY < diffTime) {
                //     collisionY = DrawObj.COLL_BOTTOM;
                //     console.log('COLL_BOTTOM');
                // }
            // } else if ( relVeloY < 0 && this.top < obj.bottom && this.top > obj.top ) {
            } else if ( relVeloY < 0 && this.top < obj.bottom && this.top > obj.top ) {
                diffTimeY = Math.abs(obj.bottom - this.top) * reciRelVeloY;
                collisionY = DrawObj.COLL_TOP;
                console.log('COLL_TOP');
                // if (Math.abs(obj.bottom - this.top) * reciRelVeloY < diffTime) {
                //     collisionY = DrawObj.COLL_TOP;
                //     console.log('COLL_TOP');
                // }
            }
        }
        if (isFinite(diffTimeX) && isFinite(diffTimeY)) {
            return (diffTimeX < diffTimeY ? collisionX : collisionY);
        }
        return DrawObj.COLL_NONE;
        // return collision;
    }

    static COLL_NONE = 0;

    static COLL_TOP = 1;

    static COLL_RIGHT = 2;

    static COLL_BOTTOM = 3;

    static COLL_LEFT = 4;
}
