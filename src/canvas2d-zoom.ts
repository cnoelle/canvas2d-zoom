import { ContextProxy } from "./ContextProxy.js";
import { MouseEventHandler } from "./MouseEventHandler.js";
import { MouseEventListener, Point } from "./internalTypes.js";

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
export class Canvas2dZoom extends HTMLElement {

    private static DEFAULT_TAG: string = "canvas2d-zoom";
    private static _tag: string|undefined;

    static get observedAttributes() {
        return ["debug", "width", "height", "zoom", "pan", "max-zoom", "min-zoom", "zoom-factor"]; 
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
        this.#proxy = new ContextProxy();
        this.#zoomListener = this.#proxy.wheel.bind(this.#proxy);
        this.#canvas.addEventListener("wheel", this.#noopZoomListener);
        const keyListener = (event: KeyboardEvent) => {
            const isZoom: boolean = event.key === "+" || event.key === "-";
            const isTranslation: boolean = event.key.startsWith("Arrow");
            if (event.ctrlKey && ((isZoom && this.#zoom) || (isTranslation && this.#pan))) {
                event.preventDefault();
                if (isZoom) {
                    const factor: number = this.#proxy.getZoomFactor();
                    this.applyZoom(event.key === "+" ? factor : 1/factor, this.#lastFocusPoint);
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
            }
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

    set debug(debug: boolean) {
        this.setAttribute("debug", debug + "");
    }

    get width(): number {
        return this.#canvas.width;
    }

    set width(width: number) {
        this.setAttribute("width", width + "");
    }

    get height(): number {
        return this.#canvas.height;
    }

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

    set pan(pan: boolean) {
        this.setAttribute("pan", pan + "");
    }

    get maxZoom(): number|undefined {
        return this.#proxy.getMaxZoom();
    }

    set maxZoom(max: number|undefined) {
        if (isFinite(max))
            this.setAttribute("max-zoom", max + "");
        else
            this.removeAttribute("max-zoom");
    }

    get minZoom(): number|undefined {
        return this.#proxy.getMinZoom();
    }

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
     * factor must be positive, and usually is greater than 1. Default value: 2.
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

    // ============= End Properties ===============

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

    getContext(type: "2d", options?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D {
        if (type !== "2d")
            throw new Error("This canvas only supports 2d mode, invalid context id " + type);
        return new Proxy(this.#canvas.getContext("2d", options), this.#proxy);
    }

    /**
     * The wrapped canvas element. Usually this should not be used directly; 
     * all drawings via canvas().getContext("2d") will disappear on zoom and/or pan.
     */
    canvas(): HTMLCanvasElement {
        return this.#canvas;
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

}
