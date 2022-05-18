import { Canvas2dZoom, ZoomPan } from "./canvas2d-zoom.js";

// TODO proper label positions
// TODO ticks
// TODO styles (lines, labels, axes, arrows, ...)
// TODO generate types

export enum LabelPosition {
    TOP_CENTER = "top-center",
    TOP_RIGHT = "top-right",
    TOP_LEFT = "top-left",
    BOTTOM_CENTER = "bottom-center",
    BOTTOM_RIGHT = "bottom-right",
    BOTTOM_LEFT = "bottom-left"
};

class AxesMgmt {

    private static readonly _DEFAULT_AXIS: SingleAxisConfig = {
        offsetBoundary: -1,
        ticks: {
            length: 10,
            numberTicks: 6,
            width: 2
        },
        lineConfig: {
            arrows: {
                end: {length: 15, angle: Math.PI/6, filled: false }
            }
        }
    };

    private static readonly _DEFAULT_LABEL_CONFIG: Partial<LabelConfig> = {
        position: LabelPosition.BOTTOM_CENTER,
    }

    readonly #x: boolean;
    readonly #y: boolean;
    readonly #xConfig: SingleAxisConfig;
    readonly #yConfig: SingleAxisConfig;

    constructor(_config: Partial<AxesConfig>) {
        this.#x = _config?.x !== false;
        this.#y = _config?.y !== false;
        const merge = (config: boolean|Partial<SingleAxisConfig>, defaultConfig: SingleAxisConfig): SingleAxisConfig => {
            const hasStartArrow: boolean = typeof config === "object" && config.lineConfig?.arrows?.start && !config.lineConfig?.arrows?.end;
            const result: SingleAxisConfig = AxesMgmt._merge(typeof config === "object" ? config : undefined, defaultConfig);
            if (result.lineConfig.label?.text)
                AxesMgmt._merge(result.lineConfig.label, AxesMgmt._DEFAULT_LABEL_CONFIG);
            if (hasStartArrow)
                delete result.lineConfig.arrows.end;
            return result;
        };
        this.#xConfig = merge(_config?.x, AxesMgmt._DEFAULT_AXIS);
        this.#yConfig = merge(_config?.y, AxesMgmt._DEFAULT_AXIS);
    }

    draw(state: ZoomPan, width: number, height: number) {
        const ctx: CanvasRenderingContext2D = state.context;
        let xOffset: number = this.#yConfig.offsetBoundary;
        if (xOffset < 0)
            xOffset =  Math.min(Math.round(width/10), 25);
        let yOffset: number = this.#xConfig.offsetBoundary;
        if (yOffset < 0)
            yOffset =  Math.min(Math.round(height/10), 25);
        if (this.#x) {
            const c: SingleAxisConfig = this.#xConfig;
            
            // @ts-ignore
            LineUtils._drawLine(ctx, 0, height - yOffset, width, height - yOffset, c.lineConfig);
            if (c.ticks) {
                const config: TicksConfig = c.ticks as TicksConfig;
                const ticks: Array<Tick> = AxesMgmt._getTickPositions(0, height - yOffset, width, height - yOffset, config, xOffset);
                for (const tick of ticks) {
                    const lineConfig: Partial<LineConfig> = {};
                    if (tick.label) {
                        lineConfig.label = { // TODO set stroke color, width etc
                            text: tick.label,
                            position: LabelPosition.BOTTOM_RIGHT // FIXME
                        };
                    }
                    // @ts-ignore
                    LineUtils._drawLine(ctx, tick.x, tick.y, tick.x, tick.y + config.length, lineConfig); // FIXME take into account rotation!
                }
            }
        }
        if (this.#y) {
            const c: SingleAxisConfig = this.#yConfig;

            // @ts-ignore
            LineUtils._drawLine(ctx, xOffset, height, xOffset, 0, c.lineConfig);
        }
    }

    private static _getTickPositions(x0: number, y0: number, x1: number, y1: number, config: TicksConfig, offset: number): Array<Tick> {
        // @ts-ignore
        const num: number = Math.round(config.values?.length || config.numberTicks);
        const angle: number = Math.atan2(y0-y1, x1-x0);
        const cos = Math.cos(angle) * offset;
        const sin = Math.sin(angle) * offset;
        const xStart: number = x0 + cos;
        const xEnd: number = x1 - cos;
        const yStart: number = y0 - sin;
        const yEnd: number = y1 + sin;
        const x: number = xEnd-xStart;
        const y: number = yEnd-yStart;
        const length: number = Math.sqrt(x*x + y*y);
        if (!(length > 0) || !(num > 1))
            return [];
        if (!(config as any).valueRange) { // in this case we keep the tick positions fixed
            const fracX: number = x / (num - 1);
            const fracY: number = y / (num - 1);
            const ticks: Array<Tick> = [];
            for (let idx=0; idx < num; idx++) {
                const tick: Tick = {
                    x: xStart + idx * fracX,
                    y: yStart + idx * fracY,
                };
                if ((config as any).values)
                    tick.label = (config as any).values[idx];
                ticks.push(tick);
            }
            return ticks;
        }
        throw new Error("Not implemented");

    }

    // mutating deep merge of defaultObj into obj
    private static _merge<T extends Record<string, any>|Array<any>>(obj: Partial<T>|undefined, defaultObj: T): T {
        if (!obj)
            return AxesMgmt._merge(Array.isArray(defaultObj) ? [] as any : {}, defaultObj);
        Object.keys(defaultObj).forEach((key: string)  => { 
            const value: any = (obj as any)[key];
            const defaultValue: any = (defaultObj as any)[key];
            if (value === undefined || value === null || (value === true && typeof defaultValue === "object")) {
                if (defaultValue !== null && typeof defaultValue === "object")
                    (obj as any)[key] = AxesMgmt._merge(Array.isArray(defaultValue) ? [] as any : {}, defaultValue);
                else
                    (obj as any)[key] = defaultValue;
            }
            else if (typeof value === "object")
                AxesMgmt._merge(value, defaultValue);
        });
        return obj as T;
    }

}

// TODO style
export interface ArrowConfig {
    length: number;
    angle: number;
    filled: boolean;
}

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

export interface TicksConfig {
    length: number;
    width: number;
    /**
     * Default: same as line(?)
     */
    color: string;
    
}

// FIXME even for string values a zooming effect may be desirable!
export type TicksValuesConfig = 
    TicksConfig & 
        ({ 
            valueRange: [number, number];
            numberTicks: number; 
        } 
    | 
        { values: Array<string> });

export interface SingleAxisConfig {
    offsetBoundary: number;
    ticks: boolean|Partial<TicksValuesConfig>;
    lineConfig: Partial<LineConfig>;
}

export interface AxesConfig {
    x: boolean|Partial<SingleAxisConfig>;
    y: boolean|Partial<SingleAxisConfig>;
}

interface Tick {
    x: number;
    y: number;
    //width: number; // same for all
    //length: number;
    label?: string; // TODO labelPosition
}

export class LineUtils {

    // FIXME this is entirely wrong... we must not rely on absolute coords, instead always reference (0,0) as (x0,y0) and (deltaX, deltaY) as (x1,y1)
    private static _getLabelPosition(x0: number, y0: number, x1: number, y1: number, config: LabelConfig): [number, number] {
        const pos: LabelPosition = config.position || LabelPosition.BOTTOM_CENTER;
        const size: number = config.size || 10; // TODO
        const textWidth: number = config.text.length * size / 2; // TODO
        const deltaY: number = y1 - y0;
        const deltaX: number = x1 - x0;
        const isVertical: boolean = Math.abs(deltaY) > Math.abs(deltaX);
        switch (pos) {
        case LabelPosition.BOTTOM_CENTER:
            return isVertical ? [deltaX/2 - 2 * textWidth, deltaY / 2] :
                [deltaX/2 - textWidth / 2, deltaY/2 + 1.5 * size];
        case LabelPosition.BOTTOM_RIGHT:
            return isVertical ? [- 2 * textWidth, - 1.5 * size] : // TODO check
                [ - textWidth, deltaY + 1.5 * size];
        case LabelPosition.BOTTOM_LEFT:
            return isVertical ? [deltaX - 2 * textWidth, deltaY + 1.5 * size] : // TODO check
                [0, 1.5 * size];
        case LabelPosition.TOP_CENTER:
            return isVertical ? [deltaX/2 + 1.5*size, deltaY / 2] : // TODO check
                [deltaX/2 - textWidth / 2, deltaY/2 - 1.5 * size];
        case LabelPosition.TOP_RIGHT:
            return isVertical ? [1.5 *size, - 1.5 * size] :// TODO check
                [deltaX - textWidth, deltaY - 1.5 * size];
        case LabelPosition.TOP_LEFT:
            return isVertical ? [deltaX + 1.5 *size, deltaY + 1.5 * size] :// TODO check
                [0,  - 1.5 * size];
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
        ctx.strokeStyle = "black"; // TODO configurable
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(length, 0);
        ctx.stroke();
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
            ctx.strokeStyle = "black";
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