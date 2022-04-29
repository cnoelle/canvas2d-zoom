import { Canvas2dZoom, ZoomPan } from "./canvas2d-zoom.js";

class AxesMgmt {

    private static readonly _DEFAULT_AXIS: SingleAxisConfig = {
        offsetBoundary: -1,
        tickLength: 5, // TODO
        arrowStart: null,
        arrowEnd: {length: 15, angle: Math.PI/6, filled: false }
    };

    readonly #x: boolean;
    readonly #y: boolean;
    readonly #xConfig: SingleAxisConfig;
    readonly #yConfig: SingleAxisConfig;

    constructor(_config: AxesConfig) {
        this.#x = _config?.x !== false;
        this.#y = _config?.y !== false;
        if (typeof _config?.x === "object") {
            const xConfig: SingleAxisConfig = _config.x as SingleAxisConfig;
            this.#xConfig = {...AxesMgmt._DEFAULT_AXIS, ...xConfig }; // TODO nested props
        } else {
            this.#xConfig = AxesMgmt._DEFAULT_AXIS;
        }
        if (typeof _config?.y === "object") {
            const yConfig: SingleAxisConfig = _config.y as SingleAxisConfig;
            this.#yConfig = {...AxesMgmt._DEFAULT_AXIS, ...yConfig }; // TODO nested props
        } else {
            this.#yConfig = AxesMgmt._DEFAULT_AXIS;
        }
    }

    // TODO move to separate utilities (LinesUtils? also offering drawAxes?)
    private static _drawLine(ctx: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number, arrowStart: ArrowConfig|null, arrowEnd: ArrowConfig|null) {
        const x: number = x1-x0;
        const y: number = y1-y0;
        ctx.save();
        ctx.translate(x0, y0);
        const angle: number = Math.atan2(y, x);
        const length: number = Math.sqrt(x*x + y*y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(length, 0);
        if (arrowStart) {
            const arrowX: number = arrowStart.length * Math.cos(arrowStart.angle);
            const arrowY: number = arrowStart.length * Math.sin(arrowStart.angle);
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(0, 0);
            ctx.lineTo(arrowX, -arrowY);
            if (arrowStart.filled) {
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.stroke();
            }
        }
        if (arrowEnd) {
            const arrowX: number = arrowEnd.length * Math.cos(arrowEnd.angle);
            const arrowY: number = arrowEnd.length * Math.sin(arrowEnd.angle);
            ctx.moveTo(length - arrowX, arrowY);
            ctx.lineTo(length, 0);
            ctx.lineTo(length - arrowX, -arrowY);
            if (arrowEnd.filled) {
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    draw(state: ZoomPan, width: number, height: number) {
        const ctx: CanvasRenderingContext2D = state.context;
        ctx.strokeStyle = "black"; // TODO configurable
        if (this.#x) {
            ctx.beginPath();
            let yOffset: number = this.#xConfig.offsetBoundary;
            if (yOffset < 0)
                yOffset =  Math.min(Math.round(height/10), 20);
            AxesMgmt._drawLine(ctx, 0, width, height - yOffset, height - yOffset, this.#xConfig.arrowStart, this.#xConfig.arrowEnd);
        }
        if (this.#y) {
            ctx.beginPath();
            let xOffset: number = this.#yConfig.offsetBoundary;
            if (xOffset < 0)
                xOffset =  Math.min(Math.round(width/10), 20);
            AxesMgmt._drawLine(ctx, xOffset, xOffset, height, 0, this.#xConfig.arrowStart, this.#xConfig.arrowEnd);
        }
    }

}

// TODO style
interface ArrowConfig {
    length: number;
    angle: number;
    filled: boolean;
}

export interface SingleAxisConfig {
    offsetBoundary: number;
    tickLength: number;
    arrowStart: ArrowConfig|null;
    arrowEnd: ArrowConfig|null;
}

export interface AxesConfig {
    x?: boolean|Partial<SingleAxisConfig>;
    y?: boolean|Partial<SingleAxisConfig>;
}

/**
 * This is a utility function to add one or two coordinate axes to the 
 * canvas, which typically need to transform differently from plotted data.
 * @param canvas 
 * @param config 
 */
export function drawAxes(canvas: Canvas2dZoom, config?: AxesConfig) {
    const axes: AxesMgmt = new AxesMgmt(config || {}); 
    canvas.drawCustom(axes.draw.bind(axes));
}

