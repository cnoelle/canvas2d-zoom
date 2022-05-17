import { Canvas2dZoom, ZoomPan } from "./canvas2d-zoom.js";

// TODO proper label positions
// TODO ticks
// TODO styles (lines, labels, axes, arrows, ...)
// TODO generate and distribute types

class AxesMgmt {

    private static readonly _DEFAULT_AXIS: SingleAxisConfig = {
        offsetBoundary: -1,
        tickLength: 5, // TODO
        lineConfig: {
            arrows: {
                end: {length: 15, angle: Math.PI/6, filled: false }
            }
        }
    };

    readonly #x: boolean;
    readonly #y: boolean;
    readonly #xConfig: SingleAxisConfig;
    readonly #yConfig: SingleAxisConfig;

    constructor(_config: Partial<AxesConfig>) {
        this.#x = _config?.x !== false;
        this.#y = _config?.y !== false;
        if (typeof _config?.x === "object") {
            const xConfig: SingleAxisConfig = _config.x as SingleAxisConfig;
            this.#xConfig = {...AxesMgmt._DEFAULT_AXIS, ...xConfig }; // TODO nested props
            if (!this.#xConfig.lineConfig.arrows)
                this.#xConfig.lineConfig.arrows = AxesMgmt._DEFAULT_AXIS.lineConfig.arrows; 
        } else {
            this.#xConfig = AxesMgmt._DEFAULT_AXIS;
        }
        if (typeof _config?.y === "object") {
            const yConfig: SingleAxisConfig = _config.y as SingleAxisConfig;
            this.#yConfig = {...AxesMgmt._DEFAULT_AXIS, ...yConfig }; // TODO nested props
            if (!this.#yConfig.lineConfig.arrows)
                this.#yConfig.lineConfig.arrows = AxesMgmt._DEFAULT_AXIS.lineConfig.arrows; 
        } else {
            this.#yConfig = AxesMgmt._DEFAULT_AXIS;
        }
    }

    draw(state: ZoomPan, width: number, height: number) {
        const ctx: CanvasRenderingContext2D = state.context;
        ctx.strokeStyle = "black"; // TODO configurable
        if (this.#x) {
            ctx.beginPath();
            let yOffset: number = this.#xConfig.offsetBoundary;
            if (yOffset < 0)
                yOffset =  Math.min(Math.round(height/10), 20);
            // @ts-ignore
            LineUtils._drawLine(ctx, 0, height - yOffset, width, height - yOffset, this.#xConfig?.lineConfig);
        }
        if (this.#y) {
            ctx.beginPath();
            let xOffset: number = this.#yConfig.offsetBoundary;
            if (xOffset < 0)
                xOffset =  Math.min(Math.round(width/10), 20);
            // @ts-ignore
            LineUtils._drawLine(ctx, xOffset, height, xOffset, 0, this.#yConfig?.lineConfig);
        }
    }

}

// TODO style
export interface ArrowConfig {
    length: number;
    angle: number;
    filled: boolean;
}

export enum LabelPosition {
    TOP_CENTER = "top-center",
    TOP_RIGHT = "top-right",
    TOP_LEFT = "top-left",
    BOTTOM_CENTER = "bottom-center",
    BOTTOM_RIGHT = "bottom-right",
    BOTTOM_LEFT = "bottom-left"
};

export interface LabelConfig {
    text: string;
    font?: string;
    size?: number; // TODO specify
    position?: LabelPosition;
    rotated?: boolean; // default: false
}

// TODO style etc
export interface LineConfig {
    arrows: {
        start?: ArrowConfig;
        end?: ArrowConfig
    }
    label: LabelConfig;
}

export interface SingleAxisConfig {
    offsetBoundary: number;
    tickLength: number;
    lineConfig: Partial<LineConfig>;
}

export interface AxesConfig {
    x: boolean|Partial<SingleAxisConfig>;
    y: boolean|Partial<SingleAxisConfig>;
}

export class LineUtils {

    private static _getLabelPosition(x0: number, y0: number, x1: number, y1: number, config: LabelConfig): [number, number] {
        const pos: LabelPosition = config.position || LabelPosition.BOTTOM_CENTER;
        const size: number = config.size || 10; // TODO
        const textWidth: number = config.text.length * size / 2; // TODO
        const deltaY: number = y1 - y0;
        const deltaX: number = x1 - x0;
        const isVertical: boolean = Math.abs(deltaY) > Math.abs(deltaX);
        switch (pos) {
        case LabelPosition.BOTTOM_CENTER:
            return isVertical ? [Math.max(0, deltaX/2 - 2 * textWidth), deltaY / 2] :
                [deltaX/2 - textWidth / 2, deltaY/2 + 1.5 * size];
        case LabelPosition.BOTTOM_RIGHT:
            return isVertical ? [Math.max(0, x0 - 2 * textWidth), y0 - 1.5 * size] : // TODO check
                [x1 - textWidth, y1 + 1.5 * size];
        case LabelPosition.BOTTOM_LEFT:
            return isVertical ? [Math.max(0, x1 - 2 * textWidth), y1 + 1.5 * size] : // TODO check
                [x0, y0 + 1.5 * size];
        case LabelPosition.TOP_CENTER:
            return isVertical ? [Math.max(0, deltaX/2 + 1.5*size), deltaY / 2] : // TODO check
                [deltaX/2 - textWidth / 2, deltaY/2 - 1.5 * size];
        case LabelPosition.TOP_RIGHT:
            return isVertical ? [x0 + 1.5 *size, y0 - 1.5 * size] :// TODO check
                [x1 - textWidth, y1 - 1.5 * size];
        case LabelPosition.TOP_LEFT:
            return isVertical ? [x1 + 1.5 *size, y1 + 1.5 * size] :// TODO check
                [x0, y0 - 1.5 * size];
        }
    }

    private static _drawLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, config?: Partial<LineConfig>) {
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
        const arrowStart = config?.arrows?.start;
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
        const arrowEnd = config?.arrows?.end;
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
        if (config?.label?.text) {
            ctx.beginPath();
            const position: [number, number] = LineUtils._getLabelPosition(x0, y0, x1, y1, config.label);
            const rotated: boolean = config.label.rotated;
            //ctx.translate(position[0], position[1]); // ?
            if (!rotated && angle !== 0)
                ctx.rotate(-angle); // FIXME this is probably not correct... need to rotate around label position probably?
            ctx.strokeText(config.label.text, position[0], position[1]); // ok?
        }
        ctx.restore();
    }

    /**
     * Draw a static line that does not zoom or pan
     * @param canvas 
     * @param x0 
     * @param y0 
     * @param x1 
     * @param y1 
     * @param arrowEnd 
     * @param arrowStart 
     */
    public static drawLine(canvas: Canvas2dZoom, x0: number, y0: number, x1: number, y1: number, config?: Partial<LineConfig>) {
        canvas.drawCustom((state: ZoomPan) => LineUtils._drawLine(state.context, x0, y0, x1, y1, config));
    }

    /**
     * Add one or two coordinate axes to the canvas, consisting of static lines with arrow heads and labels, plus
     * ticks that adapt to the zoom and pan state.
     * @param canvas 
     * @param config 
     */
    public static drawAxes(canvas: Canvas2dZoom, config?: Partial<AxesConfig>) {
        const axes: AxesMgmt = new AxesMgmt(config || {}); 
        canvas.drawCustom(axes.draw.bind(axes));
    }

}