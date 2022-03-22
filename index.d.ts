/**
 * A webcomponent that wraps a 2D HTML canvas element, making it zoomable and pannable.
 * The default tag name is "canvas2d-zoom".
 * Usage: add a tag <canvas2d-zoom> to your HTML, import this module in Javascript and call CanvasZoom.register() once.
 * Drawing on the canvas should work like for ordinary 2D canvas, i.e. (in typescript, for javascript remove types)
 * <code>
 *      CanvasZoom.register();
 *      const canvas: CanvasZoom = document.querySelector("canvas2d-zoom");
 *      const ctx: CanvasRenderingContext2D = canvas.getContext("2d");
 *      ctx.beginPath();
 *      ...
 * </code>
 */
export declare class Canvas2dZoom extends HTMLElement {
    /**
     * Call once to register the new tag type "<canvas2d-zoom></canvas2d-zoom>"
     * @param tag
     */
    static register(tag?: string): void;
    static tag(): string | undefined;
    get debug(): boolean;
    set debug(debug: boolean);
    get width(): number;
    set width(width: number);
    get height(): number;
    set height(height: number);
    get zoom(): boolean;
    set zoom(zoom: boolean);
    get pan(): boolean;
    set pan(pan: boolean);
    get maxZoom(): number | undefined;
    set maxZoom(max: number | undefined);
    get minZoom(): number | undefined;
    set minZoom(min: number | undefined);
    get zoomFactor(): number;
    /**
     * The zoom factor determines how fast the zoom effect is, larger values lead to faster zoom.
     * factor must be positive, and usually is greater than 1. Default value: 2.
     */
    set zoomFactor(factor: number);
    get overlapX(): number;
    get overlapY(): number;
    /**
     * Indicates that upon zoom or pan operations a region beyond the horizontal vertical borders
     * of the canvas needs to be cleared (for positive values), resp. a certain area within
     * the visible range shall not be cleared (for negative values). Default: 0.
     */
    set overlapX(pixels: number);
    /**
     * Indicates that upon zoom or pan operations a region beyond the visible vertical borders
     * of the canvas needs to be cleared (for positive values), resp. a certain area within
     * the visible range shall not be cleared (for negative values). Default: 0.
     */
    set overlapY(pixels: number);
    /**
     * Returns an object that provides methods and properties for drawing and manipulating images and graphics on a 
     * 2D canvas element in a document. A context object includes information about colors, line widths, fonts, and 
     * other graphic parameters that can be drawn on a canvas.
     * (from HTMLCanvasElement)
     * @param type 
     * @param options 
     */
    getContext(type: "2d", options?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D;
    /**
     * The wrapped canvas element. Usually this should not be used directly;
     * all drawings via canvas().getContext("2d") will disappear on zoom and/or pan.
     */
    canvas(): HTMLCanvasElement;
    /**
     * Reset zoom to its initial value.
     */
    resetZoomPan(): void;
    /**
     * Zoom the canvas
     * @param scale a number > 0; to zoom in, provide a value > 1 (2 is a good example), to zoom out provide a value < 1 (e.g. 0.5)
     * @param center center/focus coordinates; typical x range: [0, canvas width/px], typical y range: [0, canvas height/px].
     *      If not provided, the canvas center is used as zoom center
     */
    applyZoom(scale: number, center?: DOMPointInit): void;
    /**
     * Move/pan/translate the canvas.
     * @param x
     * @param y
     */
    applyTranslation(x: number, y: number): void;
}
