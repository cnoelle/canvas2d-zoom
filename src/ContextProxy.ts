import { ZoomPan } from "./canvas2d-zoom.js";
import { MinimumSizeUtils } from "./minSize.js";

export class ContextProxy implements ProxyHandler<CanvasRenderingContext2D> {

    // zoom related
    #maxZoom: number|undefined = undefined;
    #minZoom: number|undefined = undefined;
    #zoomFactor: number = 2;
    
    #clearXBorder: number = 0;
    #clearYBorder: number = 0;

    // minimum size settings
    #rectMinWidth: number|undefined;
    #rectMinHeight: number|undefined;
    #circleMinRadius: number|undefined;

    // drawing operations
    readonly #pipe: Array<CallObject> = [];

    constructor(private readonly _eventDispatcher: HTMLElement) {}

    get(target: CanvasRenderingContext2D, p: PropertyKey): any {
        const result = (target as any)[p];
        if (typeof result !== "function")
            return result;
        if (typeof p === "string" && p.startsWith("get"))
            return result.bind(target);
        const pipe: Array<CallObject> = this.#pipe;
        const proxy = this;
        function _internalFunc() {
            let a: IArguments;
            pipe.push({target: target, key: p, arguments:  arguments, type: "method"});
            return proxy.applyFunction(result.bind(target), p, arguments);
        }
        return _internalFunc;
    }

    set(target: CanvasRenderingContext2D, p: PropertyKey, value: any): any {
        this.#pipe.push({target: target, key: p, type: "property", value: value});
        return (target as any)[p] = value; 
    }

    private applyPipe(trafo?: DOMMatrix) {
        for (const action of this.#pipe) {
            const target: CanvasRenderingContext2D = action.target;
            const prop: PropertyKey = action.key;
            if (action.type === "method") {
                const args: IArguments = action.arguments;
                // setTransform is special because it does not apply a transformation to the current one, but rather resets it completely
                if (trafo && prop === "setTransform") { 
                    const domMatrix: DOMMatrix2DInit = args.length === 1 ? args[0] as DOMMatrix2DInit : 
                        { a: args[0], b: args[1], c: args[2], d: args[3], e: args[4], f: args[5] }
                    const newArg: DOMMatrix = trafo.multiply(domMatrix);
                    target[prop](newArg);
                } else if (trafo && prop === "resetTransform") {
                    target.setTransform(trafo);
                } else {
                    this.applyFunction((target as any)[prop].bind(target), prop, args, trafo);
                }
            } else {
                (target as any)[prop] = action.value;
            }
        }
    }

    resetZoom() {
        if (this.#pipe.length === 0) // FIXME problematic, since this may be relevant to custom drawn elements
            return;
        const ctx: CanvasRenderingContext2D = this.#pipe[0].target;
        ctx.restore();
        const oldTrafo: DOMMatrix = ctx.getTransform();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.save();
        const newTrafo: DOMMatrix = ctx.getTransform();
        ctx.canvas.width = ctx.canvas.width;
        ctx.clearRect(-this.#clearXBorder, -this.#clearYBorder, ctx.canvas.width + this.#clearXBorder, ctx.canvas.height + this.#clearYBorder);
        this.applyPipe();
        this._dispatch(ctx, oldTrafo, newTrafo, true, true);
    }

    // FIXME is this efficient? Can we do better?
    private _clear(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(-this.#clearXBorder, -this.#clearYBorder, ctx.canvas.width + this.#clearXBorder, ctx.canvas.height + this.#clearYBorder);
        ctx.restore();
    }

    clear(options?: {dispatch?: boolean}) {
        if (this.#pipe.length === 0)
            return;
        const ctx: CanvasRenderingContext2D = this.#pipe[0].target;
        this.#pipe.splice(0, this.#pipe.length);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(-this.#clearXBorder, -this.#clearYBorder, ctx.canvas.width + this.#clearXBorder, ctx.canvas.height + this.#clearYBorder);
        this._eventDispatcher.dispatchEvent(new Event("clear"));
        if (options?.dispatch)
            this._dispatch(ctx, ctx.getTransform(), ctx.getTransform(), true, true); // ?
    }

    private _dispatch(ctx: CanvasRenderingContext2D, oldTransform: DOMMatrix, newTransform: DOMMatrix, zoom: boolean, pan: boolean) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // could make sense to set this to cancelable and prevent the zoom operation from happening in this case....
        this._eventDispatcher.dispatchEvent(new CustomEvent<ZoomPan>("zoom", { 
            bubbles: true, 
            composed: true, 
            cancelable: false, 
            detail: {
                zoom: zoom,
                pan: pan,
                previousTransformation: oldTransform,
                newTransformation: newTransform,
                context: ctx
            }})
        ); 
        ctx.restore();
    }

    zoom(relativeScale: number, center: DOMPointInit) {
        if (this.#pipe.length === 0)
            return;
        const ctx: CanvasRenderingContext2D = this.#pipe[0].target;
        ctx.restore();
        const currentTransform: DOMMatrix = ctx.getTransform();
        if (currentTransform.a * relativeScale > this.#maxZoom || currentTransform.a * relativeScale < this.#minZoom) {
            ctx.save();
            return;
        }
        const domMatrix: DOMMatrix = currentTransform.inverse();
        const translationVector: DOMPoint = domMatrix.transformPoint(center);
        this._clear(ctx);
        ctx.translate(translationVector.x, translationVector.y);
        ctx.scale(relativeScale, relativeScale);
        ctx.translate(-translationVector.x, -translationVector.y);
        ctx.save();
        const trafo: DOMMatrix = ctx.getTransform();
        this.applyPipe(trafo);
        this._dispatch(ctx, currentTransform, trafo, true, false);

    }

    translate(x: number, y: number) {
        if (this.#pipe.length === 0)
            return;
        const ctx: CanvasRenderingContext2D = this.#pipe[0].target;
        ctx.restore();
        const oldTransform: DOMMatrix = ctx.getTransform();
        this._clear(ctx);
        ctx.translate(x, y);
        ctx.save();
        const trafo: DOMMatrix = ctx.getTransform();
        this.applyPipe(trafo);
        this._dispatch(ctx, oldTransform, trafo, false, true);
    }

    wheel(event: WheelEvent) {
        // TODO take into account deltaY magnitude
        const relativeScale: number = event.deltaY < 0 ? this.#zoomFactor : 1/this.#zoomFactor;
        this.zoom(relativeScale, {x: event.offsetX, y: event.offsetY});
    }

    setMaxZoom(zoom: number|undefined) {
        this.#maxZoom = zoom > 0 ? zoom : undefined;
        //if (this.#scale > this.#maxZoom) // TODO
    }

    setMinZoom(zoom: number|undefined) {
        this.#minZoom = zoom > 0 ? zoom : undefined;
        //if (this.#scale < this.#minZoom) // TODO
    }

    getMaxZoom(): number|undefined {
        return this.#maxZoom;
    }

    getMinZoom(): number|undefined {
        return this.#minZoom;
    }

    setZoomFactor(factor: number) {
        if (!(factor > 0) || !isFinite(factor))
            throw new Error("Invalid zoom factor " + factor);
        this.#zoomFactor = factor;
    }

    getZoomFactor(): number {
        return this.#zoomFactor;
    }

    setOverlap(x: number|undefined, y: number|undefined) {
        if (isFinite(x))
            this.#clearXBorder = x;
        if (isFinite(y))
            this.#clearYBorder = y;
    }

    getOverlap(): [number, number] {
        return [this.#clearXBorder, this.#clearYBorder];
    }

    setRectMinWidth(width: number|undefined) {
        this.#rectMinWidth = width;
    }

    getRectMinWidth(): number|undefined {
        return this.#rectMinWidth;
    }

    setRectMinHeight(height: number|undefined) {
        this.#rectMinHeight = height;
    }

    getRectMinHeight(): number|undefined {
        return this.#rectMinHeight;
    }

    setCircleMinRadius(radius: number|undefined) {
        this.#circleMinRadius = radius;
    }

    getCircleMinRadius(): number|undefined {
        return this.#circleMinRadius;
    }

    pipe() {
        return this.#pipe;
    }

    redraw() {
        if (this.#pipe.length === 0)
            return;
        const ctx: CanvasRenderingContext2D = this.#pipe[0].target;
        ctx.restore();
        const currentTransform: DOMMatrix = ctx.getTransform();
        this.applyPipe(currentTransform);
        ctx.save();
        this._dispatch(ctx, currentTransform, currentTransform, false, false);
    }

    private applyFunction(fun: any, key: PropertyKey, args: Iterable<any>, trafo?: DOMMatrix): any {
        if (key === "arc" && this.#circleMinRadius) {
            // @ts-ignore
            args = MinimumSizeUtils.arc(this.#circleMinRadius, args, trafo);
        }
         // @ts-ignore
        else if (["rect", "fillRect", "strokeRect"].indexOf(key) >= 0 && (this.#rectMinHeight || this.#rectMinWidth)) {
            // @ts-ignore
            args = MinimumSizeUtils.rect(this.#rectMinWidth, this.#rectMinHeight, args, trafo);
        }
        return fun(...args);
    }

}

type CallObject = {
    target: CanvasRenderingContext2D;
    key: PropertyKey;
} & (
    { 
        type: "method";
        arguments: IArguments;
    }
   | 
    { 
        type: "property";
        value: any;
    }
)

