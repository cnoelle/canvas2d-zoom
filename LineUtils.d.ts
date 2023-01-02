import { Canvas2dZoom } from ".";
export declare enum LabelPosition {
    TOP_CENTER = "top-center",
    TOP_RIGHT = "top-right",
    TOP_LEFT = "top-left",
    BOTTOM_CENTER = "bottom-center",
    BOTTOM_RIGHT = "bottom-right",
    BOTTOM_LEFT = "bottom-left",
    LEFT = "left",
    RIGHT = "right"
}
export interface ArrowConfig {
    length: number;
    angle: number;
    filled: boolean;
}
export interface LabelConfig {
    text: string;
    size?: number;
    position?: LabelPosition;
    lineOffsetFactor?: number;
    /**
     * Default: false. If set to true, the label will be rotated with the same angle as the axis against a horizontal line
     * If a number is provided, the label will be rotated by that angle, in radians
     */
    rotated?: boolean|number;
    font?: FontConfig;
    /**
     * See strokeStyle: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/strokeStyle
     */
    style?: string;
}
export interface LineConfig {
    arrows: {
        start?: ArrowConfig;
        end?: ArrowConfig;
    };
    label: LabelConfig;
    /**
     * See strokeStyle: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/strokeStyle
     */
    style: string;
}
export interface TicksConfig {
    length: number;
    width: number;
    /**
     * See strokeStyle: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/strokeStyle
     */
    style?: string;
    font?: FontConfig;
    grid?: boolean;
    /** rotate labels by some angle, in radians */
    labelRotation?: number;
}
export declare type TicksValuesConfig = TicksConfig & ({
    valueRange: [number, number];
    numberTicks: number;
} | {
    values: Array<string>;
});
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
export declare type FontConfig = FontConfigDetails | string;
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
    x: boolean|(Partial<SingleAxisConfig>&{position?: "bottom"|"top"});
    y: boolean|(Partial<SingleAxisConfig>&{position?: "left"|"right"});
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
export declare class LineUtils {
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
    static drawLine(canvas: Canvas2dZoom, x0: number, y0: number, x1: number, y1: number, config?: Partial<LineConfig>): { close: () => void };
    /**
     * Add one or two coordinate axes to the canvas, consisting of static lines with optional arrow heads and labels, plus
     * ticks that adapt to the zoom and pan state.
     * @param canvas
     * @param config
     */
    static drawAxes(canvas: Canvas2dZoom, config?: Partial<AxesConfig>): { close: () => void };
}
