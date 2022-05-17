/**
 * A webcomponent that wraps a 2D HTML canvas element, making it zoomable and pannable.
 * The default tag name is "canvas2d-zoom".
 * Usage: add a tag <canvas2d-zoom> to your HTML, import this module in Javascript and call Canvas2dZoom.register() once.
 * Drawing on the canvas should work like for ordinary 2D canvas, i.e. (in typescript, for javascript remove types)
 * <code>
 *      Canvas2dZoom.register();
 *      const canvas: Canvas2dZoom = document.querySelector("canvas2d-zoom");
 *      const ctx: CanvasRenderingContext2D = canvas.getContext("2d");
 *      ctx.beginPath();
 *      ...
 * </code>
 */
export declare class Canvas2dZoom extends HTMLElement {
    /**
     * Call once to register the new tag type "<canvas2d-zoom></canvas2d-zoom>"
     * @param tag may be used to register a different tag name. 
     */
    static register(tag?: string): void;
    /**
     * Retrieve the registered tag type for this element type, or undefined if not registered yet.
     */
    static tag(): string | undefined;
    /**
     * Gets or sets the debug property. If set to true, some debug methods will be available on the HTMLElement. Default: false.
     */
    debug: boolean;
    /**
     * Gets or sets the height of a canvas element on a document.
     */
    height: number;
    /**
     * Gets or sets the width of a canvas element on a document.
     */
    width: number;
    /**
     * Controls whether the user can zoom in and out on the canvas. Default: true.
     */
    zoom: boolean;
    /**
     * Controls whether the user can pan/move the canvas. Default: true.
     */
    pan: boolean;
    /**
     * Controls the maximum zoom level of the canvas. A number > 1. Default: undefined
     */
    maxZoom: number | undefined;
    /**
     * Controls the minimum zoom level of the canvas. A number < 1. Default: undefined
     */
    minZoom: number | undefined;
    /**
     * The zoom factor determines how fast the zoom effect is, larger values lead to faster zoom.
     * A positive number, usually greater than 1. Default value: 2.
     */
    zoomFactor: number;
    /**
     * Indicates that upon zoom or pan operations a region beyond the horizontal vertical borders
     * of the canvas needs to be cleared (for positive values), resp. a certain area within
     * the visible range shall not be cleared (for negative values). Default: 0.
     */
    overlapX: number;
    /**
     * Indicates that upon zoom or pan operations a region beyond the visible vertical borders
     * of the canvas needs to be cleared (for positive values), resp. a certain area within
     * the visible range shall not be cleared (for negative values). Default: 0.
     */
    overlapY: number;
    /**
     * Define action on double click of the user.
     * "reset": reset zoom and pan
     * "zoom": zoom in, or out if ctrl key is pressed at the same time
     * null (default): no action
     */
    doubleClickMode: "reset"|"zoom"|null;

    /**
     * Set a minimum width for rectangles; when zooming out and the limit is hit,
     * the rectangle width will not shrink any further.
     */
    rectMinWidth: number|undefined;

    /**
     * Set a minimum height for rectangles; when zooming out and the limit is hit,
     * the rectangle height will not shrink any further.
     */
    rectMinHeight: number|undefined;

    /**
     * Set a minimum radius for circles/arcs; when zooming out and the limit is hit,
     * the radius will not shrink any further.
     */
    circleMinRadius: number|undefined;

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
     * Returns the wrapped canvas element.
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
     * @param x number of horizontal pixels
     * @param y number of vertical pixels
     */
    applyTranslation(x: number, y: number): void;

    /**
     * Use this method for drawing elements with custom scaling and pan behaviour, or completely static elements.
     * The listener will be called once with the current state and then on every state change.
     * @param listener 
     */
    drawCustom(listener: (stateChange: ZoomPan, width: number, height: number) => void): void
}

/**
 * For use in the drawCustom method. 
 * 
 * The element also dispatches events of type CustomEvent<ZoomPan>. Access the ZoomPan object 
 * via the *detail* property of an event:
 * <code>
 *     canvas2dZoomElement.addEventListener("zoom", event => console.log(event.detail));
 * </code>
 */
export declare interface ZoomPan {
    zoom: boolean;
    pan: boolean;
    newTransformation: DOMMatrix;
    previousTransformation: DOMMatrix;
    /**
     * Use this context for adding one-off elements to the canvas. Elements drawn via this 
     * context will disappear after the next zoom or pan operation, they need to be redrawn 
     * in every callback. This can be used for custom scaling/pan behaviour.
     */
    context: CanvasRenderingContext2D;
}