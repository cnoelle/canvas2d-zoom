# canvas2d-zoom

This package provides a webcomponent `<canvas2d-zoom>` that can be used like a 2D canvas element. Its purpose is to automatically add pan and zoom behaviour to the canvas. It is in an early phase of development and likely has some rough edges.

## Content

* [Usage](#usage)
* [Configuration](#configuration)
* [Interactions](#interactions)
* [How it works](#how-it-works)
* [Development](#development)
* [License](#license)

## Usage

HTML example:

```html
<!DOCTYPE html>
<html lang="en">
<head></head>
<body>
    <canvas2d-zoom width="640" height="480" min-zoom="0.25" max-zoom="8"></canvas2d-zoom>
    <script type="module">
        import { Canvas2dZoom } from "canvas2d-zoom"; // TODO unpkg link?
        Canvas2dZoom.register();
        const canvas = document.querySelector("canvas2d-zoom");
        const ctx = canvas.getContext("2d");
        ctx.beginPath();
        ctx.arc(200, 100, 15, 0, 2 * Math.PI);
        ctx.stroke();
    </script>
</body>
```

Typescript example:

```javascript
import { Canvas2dZoom } from "canvas2d-zoom";
Canvas2dZoom.register();
const canvas: Canvas2dZoom = document.querySelector("canvas2d-zoom");
const ctx: CanvasRenderingContext2D = canvas.getContext("2d");
ctx.beginPath();
ctx.arc(200, 100, 15, 0, 2 * Math.PI);
ctx.stroke();
```

## Configuration

All `canvas` attributes are supported, such as `width` and `height`. Furthermore,

* **zoom**: A boolean value, can be used to disable zoom behaviour. Default value: `"true"`
* **pan**: A boolean value, can be used to disable pan behaviour. Default value: `"true"`
* **max-zoom** (property: **maxZoom**): A positive number, typically > 1, representing the maximum scale value. Example: 8. Default value: `undefined` 
* **min-zoom** (property: **minZoom**): A positive number, typically <= 1, the minimum scale value. Example: 0.125. Default value: `undefined` 
* **zoom-factor** (property: **zoomFactor**): A number > 1 that determines the zoom velocity. Default value: 2. 


**Example**
```html
<canvas2d-zoom width="640" height="480" pan="false" zoom="true" max-zoom="8" min-zoom="0.125"></canvas2d-zoom>
```

## Interactions

Currently only mouse and keyboard interactions are supported (no mobile gestures)

**Zoom**
* Mouse wheel
* *Ctrl* + '+' (zoom in) or *Ctrl* + '-' (zoom out) (requires focus on canvas, e.g. by clicking the canvas once)

**Pan**
* Mouse drag
* *Ctrl* + keyboard arrow buttons  (requires focus on canvas, e.g. by clicking the canvas once)

## How it works

The element remembers all calls to the [CanvasRenderingContext2D](https://developer.mozilla.org/de/docs/Web/API/CanvasRenderingContext2D) methods relevant to drawing, such `ctx.beginPath()`, `ctx.rect()` or `ctx.stroke()`. When the user pans or zooms (via mouse or keyboard interactions), the canvas is cleared, a transformation appropriate for the zoom and pan state is set, and the canvas is redrawn.

## Development

* Prerequisites: NodeJS/npm (a current version)
* Install dependencies: `npm install`
* Run: a sample HTML page is included in the repository, see [index.html](./index.html). Start the dev webserver with `npm run start`, then open the browser at http://localhost:8080.
* Tests: not yet

## License

MIT

