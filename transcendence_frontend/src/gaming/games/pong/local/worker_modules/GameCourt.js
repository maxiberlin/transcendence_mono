import { DrawObj } from './DrawObj.js';



export class GameCourt extends DrawObj {
    // constructor(x, y, w, h, borderW, borderH, initialScale_x, initialScale_y) {
    /**
     * @param {number} borderSize
     * @param {DrawObj} [parent]
     */
    constructor(borderSize, parent) {
        const bW = borderSize;
        const bH = borderSize*2.0;
        super(0, bH, 1, 1 - 2*bH, parent);

        this.scoreL = 0;
        this.scoreR = 0;
        this.#border = new DrawObj(0, 0, bW, bH);
    }
    #border;
    #textHeight = 70;

    setScale(newWidth, newHeight) {
        super.setScale(newWidth, newHeight);
        this.#border.setScale(newWidth, newHeight);
    }
    draw(ctx, colorWhite, colorBlack) {

        ctx.fillStyle = colorWhite;
        ctx.fillRect(this.x_start, this.y_start, this.w, this.h);
        ctx.strokeStyle = colorBlack;
        ctx.lineWidth = this.#border.w;
        ctx.beginPath();
        ctx.setLineDash([this.#border.h, this.#border.h]);
        ctx.moveTo(this.x_center, this.y_start+this.#border.h/2.0);
        ctx.lineTo(this.x_center, this.y_end);
        ctx.stroke();
        
        ctx.fillStyle = colorBlack;
        ctx.font = this.#textHeight + "px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(this.scoreL, this.x_center - this.#border.h, this.#border.h  + this.#textHeight);
        ctx.textAlign = "left";
        ctx.fillText(this.scoreR, this.x_center + this.#border.h, this.#border.h + this.#textHeight);

    }
};

// class GameCourt extends DrawObj {
//     constructor(x, y, w, h, borderW, borderH, initialScale_x, initialScale_y) {
//         super(x, y, w, h, initialScale_x, initialScale_y);

//         this.scoreL = 0;
//         this.scoreR = 0;
//         this.#borderW = borderW;
//         this.#borderH = borderH;
//         this.#textSize = borderH;
//         this.#textSizeUnscaled = this.#textSize / initialScale_y;
//         this.#borderWunscaled = borderW / initialScale_x;
//         this.#borderHunscaled = borderH / initialScale_y;
//     }
//     #borderW;
//     #borderH;
//     #borderX;
//     #borderY;
//     #textSize;
//     #textSizeUnscaled;
//     #borderWunscaled;
//     #borderHunscaled;

//     setScale(newW, newH) {
//         super.setScale();
//         this.#borderW = this.#borderWunscaled * newW;
//         this.#borderH = this.#borderHunscaled * newH;
//         this.#textSize = this.#textSizeUnscaled * newH;
//     }
//     draw(ctx, colorWhite, colorBlack) {

//         ctx.fillStyle = colorWhite;
//         ctx.fillRect(this.x_start, this.y_start, this.w, this.h);
//         ctx.strokeStyle = colorBlack;
//         ctx.lineWidth = this.#borderW;
//         ctx.beginPath();
//         ctx.setLineDash([this.#borderH, this.#borderH]);
//         ctx.moveTo(this.x_center, this.y_start);
//         ctx.lineTo(this.x_center, this.y_end);
//         ctx.stroke();
        
//         ctx.fillStyle = colorBlack;
//         ctx.font = this.#textSize + "px sans-serif";
//         ctx.textAlign = "right";
//         ctx.fillText(this.scoreL, this.x_center - this.#borderH);
    
//     }
// };