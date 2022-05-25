import { Canvas2dZoom, ZoomPan } from "./canvas2d-zoom.js";

/* TODO (excerpt)
 *   - option to define whether to draw axes at the beginning (before other actions) or at the end
        ~~ alternatively, respect original order => likely more difficult to implement
 *   - adapt ticks label font size to string length; maybe even rotate y-label if it becomes too long
 */
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
        offsetDrawn: false,
        ticks: {
            length: 8,
            numberTicks: 6,
            width: 2
        },
        lineConfig: {
            arrows: {
                /*end: {length: 15, angle: Math.PI/6, filled: false } */
            }
        }
    };

    private static readonly _DEFAULT_LABEL_CONFIG_X: Partial<LabelConfig> = {
        position: LabelPosition.BOTTOM_CENTER,
        lineOffsetFactor: 3.5
    };

    private static readonly _DEFAULT_LABEL_CONFIG_Y: Partial<LabelConfig> = {
        position: LabelPosition.TOP_CENTER,
        lineOffsetFactor: 3.5
    };

    private static readonly _GRID_CONFIG: Partial<LineConfig> = {
        style: "lightgrey" //?
    };

    private static readonly _LOG_10: number = Math.log(10);

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
        this.#xConfig = this.#x ? merge(_config?.x, AxesMgmt._DEFAULT_AXIS, true) : AxesMgmt._DEFAULT_AXIS;
        this.#yConfig = this.#y ? merge(_config?.y, AxesMgmt._DEFAULT_AXIS, false) : AxesMgmt._DEFAULT_AXIS;
        const setLabelAndTicksFonts = (config: boolean|Partial<SingleAxisConfig>, derivedSettings: SingleAxisConfig) => {
            let labelFont: FontConfig|undefined = _config.font, ticksFont: FontConfig|undefined = _config.font;
            let labelStyle: string|undefined = _config.style, axisStyle: string|undefined = _config.style, ticksStyle: string|undefined = _config.style;
            let grid: boolean = _config.grid || false;
            let keepOffset: boolean|undefined = _config.keepOffsetContent;
            if (typeof config === "object") {
                labelFont = config.lineConfig?.label?.font || config.font || labelFont;
                ticksFont = config.ticks?.font || config.font || ticksFont;
                axisStyle = config.lineConfig?.style || config.style || axisStyle;
                labelStyle = config.lineConfig?.label?.style || axisStyle;
                ticksStyle = config.ticks?.style || config.style || ticksStyle;
                grid = config.ticks?.grid !== undefined ? config.ticks.grid : grid;
                keepOffset = config.keepOffsetContent !== undefined ? config.keepOffsetContent : keepOffset;
            }
            if (axisStyle)
                derivedSettings.lineConfig.style = axisStyle;
            if (derivedSettings.lineConfig?.label) {
                if (labelFont)
                    derivedSettings.lineConfig.label.font = labelFont;
                if (labelStyle)
                    derivedSettings.lineConfig.label.style = labelStyle;
            }
            if (derivedSettings.ticks) {
                if (ticksFont)
                    derivedSettings.ticks.font = ticksFont;
                if (ticksStyle)
                    derivedSettings.ticks.style = ticksStyle;
                if (grid)
                    derivedSettings.ticks.grid = grid;
            }
            if (keepOffset !== undefined)
                derivedSettings.keepOffsetContent = keepOffset;
        };
        if (this.#x)
            setLabelAndTicksFonts(_config?.x, this.#xConfig);
        if (this.#y)
            setLabelAndTicksFonts(_config?.y, this.#yConfig);
    }

    draw(state: ZoomPan, width: number, height: number) {
        const ctx: CanvasRenderingContext2D = state.context;
        // FIXME use ctx.translate for xOffset, yOffset? Optional? => if drawn before other stuff this could even be helpful for positioning other elements
        let xOffset: number = this.#yConfig.offsetBoundary;
        if (xOffset < 0)
            xOffset = Math.min(Math.round(width/10), 50);
        let yOffset: number = this.#xConfig.offsetBoundary;
        if (yOffset < 0)
            yOffset = Math.min(Math.round(height/10), 50);
        if (this.#x) {
            const c: SingleAxisConfig = this.#xConfig;
            if (!c.keepOffsetContent) {
                // draw a white rectangle
                ctx.fillStyle = "white";
                ctx.fillRect(0, height-yOffset, width, height);
            }
            // @ts-ignore
            LineUtils._drawLine(ctx, c.offsetDrawn ? 0 : xOffset, height - yOffset, width, height - yOffset, c.lineConfig);
            // @ts-ignore
            if (c.ticks && (c.ticks.values || c.ticks.valueRange)) {
                const config: TicksConfig = c.ticks as TicksConfig;
                const tickEndX: number = c.lineConfig?.arrows?.end ? width - xOffset : width;
                const ticks: Array<Tick> = AxesMgmt._getTickPositions(xOffset, height - yOffset, tickEndX, height - yOffset, config, state.newTransformation);
                for (const tick of ticks) {
                    const lineConfig: Partial<LineConfig> = {};
                    if (tick.label) {
                        lineConfig.label = { // TODO set stroke color, width etc
                            text: tick.label,
                            position: LabelPosition.LEFT
                        };
                        if (config.font)
                            lineConfig.label.font = config.font;
                        if (config.style) {
                            lineConfig.label.style = config.style;
                            lineConfig.style = config.style;
                        }
                    }
                    // @ts-ignore
                    LineUtils._drawLine(ctx, tick.x, tick.y + config.length, tick.x, tick.y, lineConfig);
                    if (config.grid) {
                        // @ts-ignore
                        LineUtils._drawLine(ctx, tick.x, tick.y, tick.x, 0, AxesMgmt._GRID_CONFIG);
                    }
                }
            }
        }
        if (this.#y) {
            const c: SingleAxisConfig = this.#yConfig;
            if (!c.keepOffsetContent) {
                // draw a white rectangle
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, xOffset, height);
            }
            // @ts-ignore
            LineUtils._drawLine(ctx, xOffset, c.offsetDrawn ? height : height - yOffset, xOffset, 0, c.lineConfig);
            // @ts-ignore
            if (c.ticks && (c.ticks.values || c.ticks.valueRange)) {
                const config: TicksConfig = c.ticks as TicksConfig;
                const tickEndY: number = c.lineConfig?.arrows?.end ? yOffset : 0;
                const ticks: Array<Tick> = AxesMgmt._getTickPositions(xOffset, height - yOffset, xOffset, tickEndY, config, state.newTransformation);
                for (const tick of ticks) {
                    const lineConfig: Partial<LineConfig> = {};
                    if (tick.label) {
                        lineConfig.label = { // TODO set stroke color, width etc
                            text: tick.label,
                            position: LabelPosition.LEFT
                        };
                        if (config.font)
                            lineConfig.label.font = config.font;
                        if (config.style) {
                            lineConfig.label.style = config.style;
                            lineConfig.style = config.style;
                        }
                    }
                    // @ts-ignore
                    LineUtils._drawLine(ctx, tick.x-config.length, tick.y, tick.x, tick.y, lineConfig);
                    if (config.grid) {
                        // @ts-ignore
                        LineUtils._drawLine(ctx, tick.x, tick.y, width, tick.y, AxesMgmt._GRID_CONFIG);
                    }
                }
            }
        }
    }

    private static _getTicks(valueRange: [number, number], numTicks: number): [Array<number>, number] {
        const length: number = Math.abs(valueRange[1] - valueRange[0]);
        const l: number = length/(numTicks-1);
        const tenBase: number = Math.round(Math.log(l) / AxesMgmt._LOG_10); // log with base 10 of l
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
        const decimals = proposedDistance >= 1 ? 0 : -Math.floor(Math.log(proposedDistance)/AxesMgmt._LOG_10);
        return [ticks, decimals];
    }

    // coordinates: line ticks will be attached to
    private static _getTickPositions(xStart: number, yStart: number, xEnd: number, yEnd: number, config: TicksConfig, currentTransform: DOMMatrixReadOnly): Array<Tick> {
        // @ts-ignore
        const num: number = Math.round(config.values?.length || config.numberTicks);
        const x: number = xEnd-xStart;
        const y: number = yEnd-yStart;
        const lengthSquared: number = x*x + y*y;
        if (!(lengthSquared > 0) || !(num > 1))
            return [];
        if (!(config as any).valueRange) { // in this case we keep the tick positions fixed FIXME move static positions as well?
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
        if (!currentTransform.isIdentity) {
            const inverse: DOMMatrixReadOnly = currentTransform.inverse();
            const originalStart: DOMPoint = inverse.transformPoint({x: xStart, y: yStart});
            const originalEnd: DOMPoint = inverse.transformPoint({x: xEnd, y: yEnd});
            // project new point to axis vector and determine the distance from the the start
            const delta = (p: DOMPoint): DOMPointInit => {return {x: p.x - xStart, y: p.y - yStart};};
            const getValue = (p: DOMPointInit) => (p.y * y + p.x * x) / lengthSquared * (valueRange[1] - valueRange[0]) + valueRange[0];
            valueRange = [getValue(delta(originalStart)), getValue(delta(originalEnd))];
        }
        const [ticks, decimals]: [Array<number>, number] = AxesMgmt._getTicks(valueRange, (config as any).numberTicks);
        return ticks.map(tick0 => {
            const fraction: number = (tick0 - valueRange[0]) / (valueRange[1] - valueRange[0]);
            const tick: Tick = {
                x: xStart + fraction * x,
                y: yStart + fraction * y,
                label: tick0.toFixed(decimals)
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
    size?: number; // TODO specify
    position?: LabelPosition;
    lineOffsetFactor?: number;
    rotated?: boolean; // default: false
    font?: FontConfig;
    /**
     * See strokeStyle: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/strokeStyle
     */
    style?: string;
}

// TODO stroke width?
export interface LineConfig {
    arrows: {
        start?: boolean|ArrowConfig;
        end?: boolean|ArrowConfig
    };
    label: LabelConfig;
    /**
     * See strokeStyle: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/strokeStyle
     */
    style: string;
}

// TODO opacity?
export interface TicksConfig {
    length: number;
    width: number;
    /**
     * See strokeStyle: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/strokeStyle
     */
    style?: string;
    font?: FontConfig;
    // TODO option to define grid style
    grid?: boolean;
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



/**
 * See https://developer.mozilla.org/en-US/docs/Web/CSS/font
 */
export interface FontConfigDetails {
    size: string;
    family: string;
    style?: string;
    weight?: string;
    stretch?: string;
}

export type FontConfig = FontConfigDetails | string;

export interface SingleAxisConfig {
    offsetBoundary: number;
    offsetDrawn: boolean;
    ticks: Partial<TicksValuesConfig>;
    lineConfig: Partial<LineConfig>;
    font?: FontConfig;
    /**
     * See strokeStyle: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/strokeStyle
     */
    style?: string;
    keepOffsetContent?: boolean;
}

export interface AxesConfig {
    x: boolean|Partial<SingleAxisConfig>;
    y: boolean|Partial<SingleAxisConfig>;
    font?: FontConfig;
    /**
     * See strokeStyle: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/strokeStyle
     */
    style?: string;
    grid?: boolean;
    /**
     * Default: false
     */
    keepOffsetContent?: boolean;
}

interface Tick {
    x: number;
    y: number;
    //width: number; // same for all
    //length: number;
    label?: string; // TODO labelPosition
}

export class LineUtils {

    // FontConfig properties
    private static readonly _FONT_PROPERTIES: Array<keyof FontConfigDetails> = ["style", "weight", "stretch", "size", "family"];
    private static readonly _DEFAULT_ARROW_CONFIG: ArrowConfig = {length: 15, angle: Math.PI/6, filled: false};

    private static _getLabelPosition(length: number, angle: number, config: LabelConfig, ctx: CanvasRenderingContext2D): [number, number] {
        const pos: LabelPosition = config.position || LabelPosition.BOTTOM_CENTER;
        const size: number = 1.2 * (config.size || 10) * (config.lineOffsetFactor || 1);
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
            return [-size / 2 * (1 - Math.sin(angle)) - textWidth * Math.cos(angle) , textWidth/2 * Math.sin(angle) + size/4 * Math.cos(angle) ];
        case LabelPosition.RIGHT:
            return [length + size, textWidth/2 * Math.sin(angle)];
        }
    }

    private static _toFontString(font: FontConfig): string {
        if (!font || typeof font === "string")
            return font as string;
        let result: string = "";
        let fresh: boolean = true;
        for (const key of LineUtils._FONT_PROPERTIES) {
            let value: string = font[key];
            if (value) {
                if (!fresh)
                    result += " ";
                else
                    fresh = false;
                result += value;
            }
        }
        return result;
    }

    private static _drawLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, config?: Partial<LineConfig>) {
        const x: number = x1-x0;
        const y: number = y1-y0;
        ctx.save();
        ctx.translate(x0, y0);
        const angle: number = Math.atan2(y, x);
        const length: number = Math.sqrt(x*x + y*y);
        ctx.rotate(angle);
        ctx.strokeStyle = config?.style || "black";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(length, 0);
        ctx.stroke();
        const arrowStart: ArrowConfig|false = config?.arrows?.start === true ? LineUtils._DEFAULT_ARROW_CONFIG : config?.arrows?.start;
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
        const arrowEnd: ArrowConfig|false = config?.arrows?.end === true ? LineUtils._DEFAULT_ARROW_CONFIG : config?.arrows?.end;
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
            ctx.fillStyle = config.label.style || "black";
            if (config.label.font)
                ctx.font = LineUtils._toFontString(config.label.font);
            const position: [number, number] = LineUtils._getLabelPosition(length, angle, config.label, ctx);
            const rotated: boolean = config.label.rotated;
            ctx.translate(position[0], position[1]);
            if (!rotated && angle !== 0)
                ctx.rotate(-angle);
            ctx.fillText(config.label.text, 0, 0);
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
    public static drawLine(canvas: Canvas2dZoom, x0: number, y0: number, x1: number, y1: number, config?: Partial<LineConfig>): { close: () => void } {
        const listener = (state: ZoomPan) => LineUtils._drawLine(state.context, x0, y0, x1, y1, config);
        canvas.drawCustom(listener);
        return { close: () => canvas.stopDrawCustom(listener) };
    }

    /**
     * Add one or two coordinate axes to the canvas, consisting of static lines with optional arrow heads and labels, plus
     * ticks that adapt to the zoom and pan state.
     * @param canvas 
     * @param config 
     */
    public static drawAxes(canvas: Canvas2dZoom, config?: Partial<AxesConfig>): { close: () => void } {
        const axes: AxesMgmt = new AxesMgmt(config || {});
        const listener = axes.draw.bind(axes);
        canvas.drawCustom(listener);
        return { close: () => canvas.stopDrawCustom(listener) };
    }

}