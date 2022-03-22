import { Point, MouseEventListener } from "./internalTypes.js";

/**
 * Supports two modes: zoom/pan
 *   - with ctrl key at mousedown: zoom (report selected)
 *   - else pan (report move)
 */
// TODO pinch zoom etc https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures
export class MouseEventHandler {

    readonly #mouseLeaveListener: any;
    readonly #mouseUpListener: any;
    readonly #mouseMoveListener: any;
    // draw a dashed box when zooming with Ctrl + mouse
    #box: HTMLDivElement|null = null;
    // state 
    #panMode: boolean = false;
    #downAnchor: Point|null = null;
    #lastSeen: Point|null = null;

    private _removeMouseListeners() {
        this.element.removeEventListener("pointermove", this.#mouseMoveListener);
        this.element.removeEventListener("pointerleave", this.#mouseLeaveListener);
        this.element.removeEventListener("pointerup", this.#mouseUpListener);
        this.#box?.remove();
        this.#downAnchor = null;
        this.#lastSeen = null;
        this.#box = null;
    }

    readonly #mouseLeave = (event: MouseEvent) => {
        this._removeMouseListeners();
    };
    readonly #mouseUp = (event: MouseEvent) => {
        // FIXME topLeft and bottomRight may be interchanged
        this.listener.selected(this.#downAnchor, {x: event.offsetX, y: event.offsetY}, this.#panMode); 
        this._removeMouseListeners();
    };
    readonly #mouseMove = (event: MouseEvent) => {
        const vector: Point = {x: event.offsetX - this.#lastSeen.x, y: event.offsetY - this.#lastSeen.y};
        const lastSeen = {x: event.offsetX, y: event.offsetY};
        if (this.#panMode)
            this.listener.moved(vector);
        else {
            const width: number = Math.abs(lastSeen.x - this.#downAnchor.x);
            const height: number = Math.abs(lastSeen.y - this.#downAnchor.y);
            const hasExtension: boolean = width > 10 || height > 10;
            let box: HTMLDivElement = this.#box;
            if (hasExtension) {
                if (!box) {
                    box = document.createElement("div");
                    box.style.position = "absolute";
                    box.style.border = "1px dashed black";
                    box.style.zIndex = "10";
                    this.shadowRoot.appendChild(box);
                    this.#box = box;
                }
                box.style.top = Math.min(lastSeen.y, this.#downAnchor.y) + "px";
                box.style.left = Math.min(lastSeen.x, this.#downAnchor.x) + "px"; 
                box.style.width = width + "px";
                box.style.height = height + "px";
             } else if (box) {
                box.remove();
                this.#box = null;
            }

        }
        this.#lastSeen = lastSeen;
    };

    // TODO handle double click as zoom event?
    readonly #mouseDown = (event: MouseEvent) => {
        this.#downAnchor = {x: event.offsetX, y: event.offsetY};
        this.#lastSeen = this.#downAnchor;
        this.#panMode = !event.ctrlKey;
        this.element.addEventListener("pointermove", this.#mouseMoveListener);
        this.element.addEventListener("pointerup", this.#mouseUpListener);
        this.element.addEventListener("pointerleave", this.#mouseLeaveListener);
        this.element.addEventListener("pointercancel", this.#mouseUpListener);
    };

    constructor(
            private readonly shadowRoot: ShadowRoot,
            private readonly element: HTMLElement, 
            private readonly listener: MouseEventListener
        ) {
        this.#mouseLeaveListener = this.#mouseLeave.bind(this);
        this.#mouseUpListener = this.#mouseUp.bind(this);
        this.#mouseMoveListener = this.#mouseMove.bind(this);
        element.addEventListener("pointerdown", this.#mouseDown.bind(this));
    }


}
