export class MinimumSizeUtils {

    // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/rect
    public static rect(minWidth: number|undefined, minHeight: number|undefined, 
                args: ArrayLike<any>, trafo?: DOMMatrix): ArrayLike<any> {
        const widthFactor: number = trafo?.a || 1;
        const heightFactor: number = trafo?.d || 1;
        const width: number = args[2];
        const transformedWidth: number = width * widthFactor;
        const height: number = args[3];
        const transformedHeight: number = height * heightFactor;
        if (transformedWidth >= minWidth && transformedHeight >= minHeight)
            return args;
        const newArgs: Array<any> = Array.from(args);
        if (transformedWidth < minWidth) {
            newArgs[2] = width / widthFactor;
        }
        if (transformedHeight < minHeight) {
            newArgs[3] = height / heightFactor;
        }
        return newArgs;
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/arc
    public static arc(minRadius: number, args: ArrayLike<any>, trafo?: DOMMatrix): ArrayLike<any> {
        const radius: number = args[2];
        const factor: number = (trafo?.a || 1);
        const transformedRadius: number = factor * radius;
        if (transformedRadius >= minRadius)
            return args;
        const newArgs: Array<any> = Array.from(args);
        newArgs[2] = minRadius / factor;
        return newArgs;
    }

}