

export class DrawObj {
    /**
     * 
     * @param {number} x 
     * @param {number} y
     * @param {number} w
     * @param {number} h 
     * @param {DrawObj} [parent] 
     */
    constructor(x, y, w, h, parent) {
        this.unscaled = {x, y, w, h};

      
        this.x_start = 0;
        this.y_start = 0;
        this.w = 0;
        this.w_half = 0;
        this.h = 0;
        this.h_half = 0;
        /** @type {DrawObj | undefined} */
        this.parent = parent;
        this.dx = 0;
        this.dy = 0;
        // this.lastScale = {x:initialScale_x, y:initialScale_y}
    }
    unscaled;
    // lastScale = {}
    get x_center()     { return this.x_start + this.w_half }
    get y_center()     { return this.y_start + this.h_half }
    get x_end()        { return this.x_start + this.w }
    get y_end()        { return this.y_start + this.h }
    get offsetTop()    { return this.parent ? this.y_start - this.parent.y_start : 0 }
    get offsetBottom() { return this.parent ? this.parent.y_end - this.y_end : 0 }
    get offsetLeft()   { return this.parent ? this.x_start - this.parent.x_start : 0 }
    get offsetRight()  { return this.parent ? this.parent.x_end - this.x_end : 0 }
    printt() {
        console.log(this.x_start);
        console.log(this.y_start);
        console.log(this.w);
        console.log(this.h);
        console.log(this.w_half);
        console.log(this.h_half);
    }
    setScale(scaleX, scaleY) {
     

        this.x_start = (this.unscaled.x * scaleX);
        this.y_start = (this.unscaled.y * scaleY);
        this.w = (this.unscaled.w * scaleX);
        this.w_half = (this.w / 2.0);
        this.h = (this.unscaled.h * scaleY);
        this.h_half = (this.h / 2.0);
        // this.lastScale = {x: scaleX, y:scaleY};
    }


    /** @param {DrawObj} obj  */
    collision(obj) {
        let diffL = 0, diffR = 0, diffT = 0, diffB = 0;
        const t = this.y_end   > obj.y_start && this.y_end   < obj.y_end;
        if (t) diffT = this.y_end - obj.y_start;
        const b = this.y_start < obj.y_end   && this.y_start > obj.y_start;
        if (b) diffB = obj.y_end - this.y_start;
        const l = this.x_start < obj.x_end   && this.x_start > obj.x_start;
        if (l) diffL = obj.x_end - this.x_start;
        const r = this.x_end > obj.x_start   && this.x_end < obj.x_end;
        if (r) diffR = this.x_end - obj.x_start;


        if (diffT > 0 && diffR > 0)
            return (diffT < diffR ? DrawObj.COLLISION_TOP : DrawObj.COLLISION_RIGHT);
        if (diffT > 0 && diffL > 0)
            return (diffT < diffL ? DrawObj.COLLISION_TOP : DrawObj.COLLISION_LEFT);
        if (diffB > 0 && diffR > 0)
            return (diffB < diffR ? DrawObj.COLLISION_BOTTOM : DrawObj.COLLISION_RIGHT);
        if (diffB > 0 && diffL > 0)
            return (diffB < diffL ? DrawObj.COLLISION_BOTTOM : DrawObj.COLLISION_LEFT);
        // if (diffT > 0 && diffR > 0)
        //     return (diffT < diffR ? 1 : 2);
        // if (diffT > 0 && diffL > 0)
        //     return (diffT < diffL ? 1 : 4);
        // if (diffB > 0 && diffR > 0)
        //     return (diffB < diffR ? 3 : 2);
        // if (diffB > 0 && diffL > 0)
        //     return (diffB < diffL ? 3 : 4);
        return (0);
    }

    static COLLISION_NONE = 0;
    static COLLISION_TOP = 1;
    static COLLISION_RIGHT = 2;
    static COLLISION_BOTTOM = 3;
    static COLLISION_LEFT = 4;

}
