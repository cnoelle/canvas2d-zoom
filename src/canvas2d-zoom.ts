import { ContextProxy } from "./ContextProxy.js";
import { MouseEventHandler } from "./MouseEventHandler.js";
import { MouseEventListener, Point, DoubleClickMode } from "./internalTypes.js";

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
export class Canvas2dZoom extends HTMLElement {

    private static DEFAULT_TAG: string = "canvas2d-zoom";
    private static _tag: string|undefined;

    static get observedAttributes() {
        return ["debug", "width", "height", "zoom", "pan", "max-zoom", "min-zoom", "zoom-factor", "double-click-mode"]; 
    }

    /**
     * Call once to register the new tag type "<canvas2d-zoom></canvas2d-zoom>"
     * @param tag 
     */
    static register(tag?: string) {
        tag = tag || Canvas2dZoom.DEFAULT_TAG;
        if (tag !== Canvas2dZoom._tag) {
            customElements.define(tag, Canvas2dZoom);
            Canvas2dZoom._tag = tag;
        }
    }

    /**
     * Retrieve the registered tag type for this element type, or undefined if not registered yet.
     */
    static tag(): string|undefined {
        return Canvas2dZoom._tag;
    }

    readonly #canvas: HTMLCanvasElement;
    readonly #proxy: ContextProxy;
    readonly #zoomListener: any;
    readonly #noopZoomListener = (event: Event) => event.preventDefault();
    readonly #mouseListener: MouseEventListener;
    readonly #mouseHandler: MouseEventHandler;
    readonly #keyEventListener: any;
 
    #zoom: boolean = true;
    #lastFocusPoint: Point|null = null;
    #pan: boolean = true;

    constructor() {
        super();
        this.#canvas = document.createElement("canvas");
        this.#proxy = new ContextProxy(this);
        this.#zoomListener = this.#proxy.wheel.bind(this.#proxy);
        this.#canvas.addEventListener("wheel", this.#noopZoomListener);
        const keyListener = (event: KeyboardEvent) => {
            const isZoom: boolean = event.key === "+" || event.key === "-";
            const isZoomReset: boolean = event.key === "Enter";
            const isTranslation: boolean = event.key.startsWith("Arrow");
            if (event.ctrlKey && (((isZoom || isZoomReset) && this.#zoom) || (isTranslation && this.#pan))) {
                event.preventDefault();
                if (isZoom) {
                    const factor: number = this.#proxy.getZoomFactor();
                    this.applyZoom(event.key === "+" ? factor : 1/factor, this.#lastFocusPoint);
                } else if (isZoomReset) {
                    this.resetZoomPan();
                } else if (isTranslation) {
                    // TODO configurable translation step?
                    const vector: Point = event.key === "ArrowUp" ? {x: 0, y: 10} :
                        event.key === "ArrowDown" ? {x: 0, y: -10} :
                        event.key === "ArrowLeft" ? {x: 10, y: 0} :
                        event.key === "ArrowRight" ? {x: -10, y: 0}  : {x:0, y:0};
                    this.applyTranslation(vector.x, vector.y);
                }
            }
        };
        this.#keyEventListener = keyListener.bind(this);
        this.addEventListener("focus", () => document.addEventListener("keydown", this.#keyEventListener));
        this.addEventListener("blur", () => {
            document.removeEventListener("keydown", this.#keyEventListener);
            this.#lastFocusPoint = null;
        });

        this.#canvas.addEventListener("wheel", this.#zoomListener);
        this.#mouseListener = {
            moved: (vector: Point) => {
                if (this.#pan) {
                    const trafo: DOMMatrix = this.#canvas.getContext("2d").getTransform();
                    this.applyTranslation(vector.x/trafo.a, vector.y/trafo.d);
                }
            },
            selected: (topLeft: Point, bottomRight: Point, panMode: boolean) => {
                const diffx: number = Math.abs(topLeft.x - bottomRight.x);
                const diffy: number = Math.abs(topLeft.y - bottomRight.y);
                const midx: number = (topLeft.x + bottomRight.x)/2;
                const midy: number = (topLeft.y + bottomRight.y)/2;
                this.#lastFocusPoint = {x: midx, y: midy};
                if (!this.#zoom || panMode || (diffx < 5 && diffy < 5))
                    return;
                const fracx: number = diffx / this.#canvas.width;
                const fracy: number = diffy / this.#canvas.height;
                const frac: number = Math.max(fracx, fracy);
                if (frac >= 1)
                    return;
                this.applyZoom(1/frac, { x: midx, y: midy });
            },
            reset: () => this.resetZoomPan(),
            zoomed: (inOrOut: boolean, center: DOMPointInit) => this.applyZoom(inOrOut ? 2 : 0.5, center)

        };
        const style: HTMLStyleElement = document.createElement("style");
        style.textContent = ":host { position: relative; display: block; }";
        const shadow: ShadowRoot = this.attachShadow({mode: "open"});
        shadow.appendChild(style);
        shadow.appendChild(this.#canvas);
        this.#mouseHandler = new MouseEventHandler(shadow, this, this.#mouseListener);
    }

    // =============== Properties ===============
    //  They are all reflected by attributes

    get debug(): boolean {
        return this.getAttribute("debug")?.toLowerCase() === "true";
    }

    /**
     * Gets or sets the debug property. If set to true, some debug methods will be available on the HTMLElement. Default: false.
     */
    set debug(debug: boolean) {
        this.setAttribute("debug", debug + "");
    }

    get width(): number {
        return this.#canvas.width;
    }
    /**
     * Gets or sets the width of a canvas element on a document.
     */
    set width(width: number) {
        this.setAttribute("width", width + "");
    }

    get height(): number {
        return this.#canvas.height;
    }

    /**
     * Gets or sets the height of a canvas element on a document.
     */
    set height(height: number) {
        this.setAttribute("height", height + "");
    }

    private _setZoomInternal(zoom: boolean) {
        if (zoom === this.#zoom)
            return;
        this.#zoom = zoom;
        if (zoom)
            this.#canvas.addEventListener("wheel", this.#zoomListener);
        else
            this.#canvas.removeEventListener("wheel", this.#zoomListener);
    }

    get zoom(): boolean {
        return this.#zoom;
    }
    /**
     * Controls whether the user can zoom in and out on the canvas. Default: true.
     */
    set zoom(zoom: boolean) {
        this.setAttribute("zoom", zoom + "");
    }
    
    private _setPanInternal(pan: boolean) {
        if (pan === this.#pan)
            return;
        this.#pan = pan;
    }

    get pan(): boolean {
        return this.#pan;
    }
    /**
     * Controls whether the user can pan/move the canvas. Default: true.
     */
    set pan(pan: boolean) {
        this.setAttribute("pan", pan + "");
    }

    get maxZoom(): number|undefined {
        return this.#proxy.getMaxZoom();
    }
    /**
     * Controls the maximum zoom level of the canvas. A number > 1. Default: undefined
     */
    set maxZoom(max: number|undefined) {
        if (isFinite(max))
            this.setAttribute("max-zoom", max + "");
        else
            this.removeAttribute("max-zoom");
    }

    get minZoom(): number|undefined {
        return this.#proxy.getMinZoom();
    }
    /**
     * Controls the minimum zoom level of the canvas. A number < 1. Default: undefined
     */
    set minZoom(min: number|undefined) {
        if (isFinite(min))
            this.setAttribute("min-zoom", min + "");
        else
            this.removeAttribute("min-zoom");
        //this.#proxy.setMinZoom(min);
    }

    get zoomFactor(): number {
        return this.#proxy.getZoomFactor();
    }

    /**
     * The zoom factor determines how fast the zoom effect is, larger values lead to faster zoom.
     * A positive number, usually greater than 1. Default value: 2.
     */
    set zoomFactor(factor: number) {
        this.setAttribute("zoom-factor", factor + "");
    }

    get overlapX(): number {
        return this.#proxy.getOverlap()[0];
    }

    get overlapY(): number {
        return this.#proxy.getOverlap()[1];
    }

    /**
     * Indicates that upon zoom or pan operations a region beyond the horizontal vertical borders
     * of the canvas needs to be cleared (for positive values), resp. a certain area within
     * the visible range shall not be cleared (for negative values). Default: 0.
     */
    set overlapX(pixels: number) {
        this.setAttribute("overlap-x", pixels+ "");
    }

    /**
     * Indicates that upon zoom or pan operations a region beyond the visible vertical borders
     * of the canvas needs to be cleared (for positive values), resp. a certain area within
     * the visible range shall not be cleared (for negative values). Default: 0.
     */
    set overlapY(pixels: number) {
        this.setAttribute("overlap-y", pixels+ "");
    }

    get doubleClickMode(): "reset"|"zoom"|null {
        return this.#mouseHandler.getDoubleClickMode();
    }

    /**
     * Define action on double click of the user.
     * "reset" => reset zoom and pan
     * "zoom"  => zoom in (or out if ctrl key is pressed at the same time)
     * null (default) => no action
     */
    set doubleClickMode(mode: "reset"|"zoom"|null) {
        if (!mode)
            this.removeAttribute("double-click-mode");
        else
            this.setAttribute("double-click-mode", mode);
    }

    // ============= Internal methods ===============

    connectedCallback() {
        if (!this.hasAttribute("tabindex"))
            this.setAttribute("tabindex", "0"); // make the element focusable; attributes must not be set in constructor
        this.#canvas.getContext("2d").save();
    }

    disconnectedCallback() {
        this.#canvas.getContext("2d").restore();
    }

    async attributeChangedCallback(name: string, oldValue: string|null, newValue: string|null) {
        const attr: string = name.toLowerCase();
        switch (attr) {
            case "zoom":
                this._setZoomInternal(newValue?.toLowerCase() !== "false");
                break;
            case "pan":
                this._setPanInternal(newValue?.toLowerCase() !== "false");
                break;
            case "max-zoom":
                const maxZoom: number = parseFloat(newValue);
                this.#proxy.setMaxZoom(maxZoom);
                break;
            case "min-zoom":
                //this.minZoom = parseFloat(newValue);
                const minZoom: number = parseFloat(newValue);
                this.#proxy.setMinZoom(minZoom);
                break;
            case "zoom-factor":
                const factor: number = parseFloat(newValue);
                if (factor > 0 && isFinite(factor))
                    this.#proxy.setZoomFactor(factor);
                break;
            case "double-click-mode":
                const dcm: string = newValue?.toLowerCase();
                const dcmValue: DoubleClickMode = dcm === "reset" || dcm === "zoom" ? dcm : null;
                this.#mouseHandler.setDoubleClickMode(dcmValue);
                break;
            case "debug":
                const debug: boolean = newValue?.toLowerCase() === "true";
                if (debug) {
                    (this as any).pipe = this.#proxy.pipe.bind(this.#proxy);
                    (this as any).redraw = this.#proxy.redraw.bind(this.#proxy);
                } else {
                    delete (this as any).pipe;
                    delete (this as any).redraw;
                }
                break;
            case "overlap-x":
            case "overlap-y":
                const overlap: number = parseFloat(newValue);
                if (!isFinite(overlap))
                    throw new Error("Invalid attribute " + attr + ": " + newValue);
                this.#proxy.setOverlap(attr === "overlap-x" ? overlap : undefined, attr === "overlap-y" ? overlap : undefined);
            case "width":
            case "height":
                // fallthrough
            default:
                this.#canvas.setAttribute(name, newValue);
        }
    }

    // ============= API ===============
    
    /**
     * Returns an object that provides methods and properties for drawing and manipulating images and graphics on a 
     * 2D canvas element in a document. A context object includes information about colors, line widths, fonts, and 
     * other graphic parameters that can be drawn on a canvas.
     * (from HTMLCanvasElement)
     * @param type 
     * @param options 
     */
    getContext(type: "2d", options?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D {
        if (type !== "2d")
            throw new Error("This canvas only supports 2d mode, invalid context id " + type);
        return new Proxy(this.#canvas.getContext("2d", options), this.#proxy);
    }

    /**
     * Returns the wrapped canvas element.
     */
    canvas(): HTMLCanvasElement {
        const c2d: Canvas2dZoom = this;
        return new Proxy(this.#canvas, {
            get(target: HTMLCanvasElement, p: PropertyKey): any {
                if (p === "getContext")
                    return c2d.getContext.bind(c2d);
                const result: any = (target as any)[p];
                return typeof result === "function" ? result.bind(target) : result;
            }
        });
    }

    /**
     * Reset zoom to its initial value.
     */
    resetZoomPan() {
        this.#proxy.resetZoom();
    }

    /**
     * Zoom the canvas
     * @param scale a number > 0; to zoom in, provide a value > 1 (2 is a good example), to zoom out provide a value < 1 (e.g. 0.5)
     * @param center center/focus coordinates; typical x range: [0, canvas width/px], typical y range: [0, canvas height/px].
     *      If not provided, the canvas center is used as zoom center
     */
    applyZoom(scale: number, center?: DOMPointInit) {
        if (!center)
            center = {x: this.#canvas.width/2, y: this.#canvas.height / 2};
        this.#proxy.zoom(scale, center);
    } 

    /**
     * Move/pan/translate the canvas.
     * @param x 
     * @param y 
     */
    applyTranslation(x: number, y: number) {
        this.#proxy.translate(x, y);
    }

    /**
     * Use this method for drawing elements with custom scaling and pan behaviour, or completely static elements.
     * The listener will be called once with the current state and then on every state change.
     * @param listener 
     */
    drawCustom(listener: (stateChange: ZoomPan, width: number, height: number) => void): void {
        const ctx: CanvasRenderingContext2D = this.#canvas.getContext("2d");
        listener({
            context: ctx,
            newTransformation: ctx.getTransform(),
            previousTransformation: ctx.getTransform(),
            zoom: false,
            pan: false
        }, this.#canvas.width, this.#canvas.height);
        this.addEventListener("zoom", (event: CustomEvent<ZoomPan>) => listener(event.detail, 
                (event.currentTarget as Canvas2dZoom).#canvas.width, (event.currentTarget as Canvas2dZoom).#canvas.height));
    }

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
export interface ZoomPan {
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
