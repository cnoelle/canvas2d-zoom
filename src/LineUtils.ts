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
    BOTTOM_LEFT = "bottom-left",
    LEFT = "left",
    RIGHT = "right"    
};

class AxesMgmt {

    private static readonly _DEFAULT_AXIS: SingleAxisConfig = {
        offsetBoundary: -1,
        ticks: {
            length: 8,
            numberTicks: 6,
            width: 2
        },
        lineConfig: {
            arrows: {
                end: {length: 15, angle: Math.PI/6, filled: false }
            }
        }
    };

    private static readonly _DEFAULT_LABEL_CONFIG_X: Partial<LabelConfig> = {
        position: LabelPosition.BOTTOM_CENTER,
        lineOffsetFactor: 2.5
    }

    private static readonly _DEFAULT_LABEL_CONFIG_Y: Partial<LabelConfig> = {
        position: LabelPosition.TOP_CENTER,
        lineOffsetFactor: 2.5
    }

    readonly #x: boolean;
    readonly #y: boolean;
    readonly #xConfig: SingleAxisConfig;
    readonly #yConfig: SingleAxisConfig;

    constructor(_config: Partial<AxesConfig>) {
        this.#x = _config?.x !== false;
        this.#y = _config?.y !== false;
        const merge = (config: boolean|Partial<SingleAxisConfig>, defaultConfig: SingleAxisConfig, xOrY: boolean): SingleAxisConfig => {
            const hasStartArrow: boolean = typeof config === "object" && config.lineConfig?.arrows?.start && !config.lineConfig?.arrows?.end;
            const result: SingleAxisConfig = AxesMgmt._merge(typeof config === "object" ? config : undefined, defaultConfig);
            if (result.lineConfig.label?.text)
                AxesMgmt._merge(result.lineConfig.label, xOrY ? AxesMgmt._DEFAULT_LABEL_CONFIG_X : AxesMgmt._DEFAULT_LABEL_CONFIG_Y);
            if (hasStartArrow)
                delete result.lineConfig.arrows.end;
            return result;
        };
        this.#xConfig = merge(_config?.x, AxesMgmt._DEFAULT_AXIS, true);
        this.#yConfig = merge(_config?.y, AxesMgmt._DEFAULT_AXIS, false);
    }

    draw(state: ZoomPan, width: number, height: number) {
        const ctx: CanvasRenderingContext2D = state.context;
        let xOffset: number = this.#yConfig.offsetBoundary;
        if (xOffset < 0)
            xOffset = Math.min(Math.round(width/10), 50);
        let yOffset: number = this.#xConfig.offsetBoundary;
        if (yOffset < 0)
            yOffset = Math.min(Math.round(height/10), 50);
        if (this.#x) {
            const c: SingleAxisConfig = this.#xConfig;
            // @ts-ignore
            LineUtils._drawLine(ctx, 0, height - yOffset, width, height - yOffset, c.lineConfig);
            // @ts-ignore
            if (c.ticks && (c.ticks.values || c.ticks.valueRange)) {
                const config: TicksConfig = c.ticks as TicksConfig;
                const ticks: Array<Tick> = AxesMgmt._getTickPositions(0, height - yOffset, width, height - yOffset, config, xOffset, 
                        -state.newTransformation.e / width, state.newTransformation.a); // FIXME width - offsetX? // FIXME -?
                for (const tick of ticks) {
                    const lineConfig: Partial<LineConfig> = {};
                    if (tick.label) {
                        lineConfig.label = { // TODO set stroke color, width etc
                            text: tick.label,
                            position: LabelPosition.LEFT
                        };
                    }
                    // @ts-ignore
                    LineUtils._drawLine(ctx, tick.x, tick.y+ config.length, tick.x, tick.y, lineConfig); // FIXME take into account rotation!
                }
            }
        }
        if (this.#y) {
            const c: SingleAxisConfig = this.#yConfig;

            // @ts-ignore
            LineUtils._drawLine(ctx, xOffset, height, xOffset, 0, c.lineConfig);
            // @ts-ignore
            if (c.ticks && (c.ticks.values || c.ticks.valueRange)) {
                const config: TicksConfig = c.ticks as TicksConfig;
                const ticks: Array<Tick> = AxesMgmt._getTickPositions(0, xOffset, height, xOffset, config, yOffset, 
                        -state.newTransformation.f / height, state.newTransformation.d); // FIXME hieght - offsetY? // FIXME -?
                for (const tick of ticks) {
                    const lineConfig: Partial<LineConfig> = {};
                    if (tick.label) {
                        lineConfig.label = { // TODO set stroke color, width etc
                            text: tick.label,
                            position: LabelPosition.LEFT
                        };
                    }
                    // @ts-ignore
                    LineUtils._drawLine(ctx, tick.y - config.length, tick.x, tick.y, tick.x, lineConfig); // FIXME take into account rotation!
                }
            }
        }
    }

    // TODO validate algo
    private static _getTicks(valueRange: [number, number], numTicks: number): [Array<number>, number] {
        const length: number = Math.abs(valueRange[1] - valueRange[0]);
        const l: number = length/(numTicks-1);
        const tenBase: number = Math.round(Math.log(l) / Math.log(10)); // log with base 10 of l
        let proposedDistance: number = Math.pow(10, tenBase);
        if (Math.floor(length / proposedDistance) < Math.max(numTicks - 2, 3))
            proposedDistance = proposedDistance / 2;
        else if (Math.ceil(length / proposedDistance) > numTicks + 2)
            proposedDistance = proposedDistance * 2;
        const startFactor: number = Math.floor((valueRange[0] + Number.EPSILON) / proposedDistance);
        let start: number = startFactor * proposedDistance;
        while (start < valueRange[0]) {
            start += proposedDistance;
        }
        const ticks: Array<number> = [];
        while (start < valueRange[1]) {
            ticks.push(start);
            start += proposedDistance;
        }
        const requiredPrecision = Math.max(1, Math.round(Math.log(Math.abs(valueRange[1])) / Math.log(10) - tenBase));
        return [ticks, requiredPrecision];
    }

    private static _getTickPositions(x0: number, y0: number, x1: number, y1: number, config: TicksConfig, offset: number, 
                pan: number, zoom: number): Array<Tick> {
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
        if (!(config as any).valueRange) { // in this case we keep the tick positions fixed FIXME no move static positions as well?
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
        let valueRange: [number, number] = (config as any).valueRange;
        if (pan !== 0 || zoom !== 1)
            valueRange = valueRange.map(value => zoom * value + pan) as [number, number];
        const [ticks, precision]: [Array<number>, number] = AxesMgmt._getTicks(valueRange, (config as any).numberTicks);
        return ticks.map(tick0 => {
            const fraction: number = (tick0 - valueRange[0]) / (valueRange[1] - valueRange[0]);
            const tick: Tick = {
                x: xStart + fraction * x,
                y: yStart + fraction * y,
                label: tick0.toPrecision(precision)
            };
            return tick;
        });

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
    lineOffsetFactor?: number;
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

    private static _getLabelPosition(length: number, angle: number, config: LabelConfig, ctx: CanvasRenderingContext2D): [number, number] {
        const pos: LabelPosition = config.position || LabelPosition.BOTTOM_CENTER;
        const size: number = 1.5 * (config.size || 10) * (config.lineOffsetFactor || 1);
        const textWidth: number = ctx.measureText(config.text).width;
        switch (pos) {
        case LabelPosition.BOTTOM_CENTER:
            return [length/2 - textWidth/2 * Math.cos(angle), size];
        case LabelPosition.BOTTOM_RIGHT:
            return [length - textWidth * Math.cos(angle), size];
        case LabelPosition.BOTTOM_LEFT:
            return [size, size];
        case LabelPosition.TOP_CENTER:
            return [length/2 - textWidth / 2 * Math.cos(angle), -size + textWidth * Math.sin(angle)];
        case LabelPosition.TOP_RIGHT:
            return [length - textWidth * Math.cos(angle), - size + textWidth * Math.sin(angle)];
        case LabelPosition.TOP_LEFT:
            return [size,  -size + textWidth * Math.sin(angle)];
        case LabelPosition.LEFT:
            return [-size - textWidth * Math.cos(angle) , textWidth/2 * Math.sin(angle)];
        case LabelPosition.RIGHT:
            return [length + size, textWidth/2 * Math.sin(angle)];
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
            const position: [number, number] = LineUtils._getLabelPosition(length, angle, config.label, ctx);
            const rotated: boolean = config.label.rotated;
            ctx.translate(position[0], position[1]); // ?
            
            if (!rotated && angle !== 0)
                ctx.rotate(-angle); // FIXME this is probably not correct... need to rotate around label position probably?
            ctx.strokeStyle = "black";
            ctx.strokeText(config.label.text, 0, 0); // ok?
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