export interface Point {
    x: number;
    y: number;
}

export interface MouseEventListener {

    moved: (vector: Point) => void;
    selected: (topLeft: Point, bottomRight: Point, panMode: boolean) => void;

}
