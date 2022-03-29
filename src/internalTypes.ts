export interface Point {
    x: number;
    y: number;
}

export interface MouseEventListener {

    moved: (vector: Point) => void;
    selected: (topLeft: Point, bottomRight: Point, panMode: boolean) => void;
    reset: () => void;
    zoomed: (inOrOut: boolean, center: DOMPointInit) => void;

}

export type DoubleClickMode = "reset"|"zoom"|null;

