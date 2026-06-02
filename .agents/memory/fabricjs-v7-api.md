---
name: Fabric.js v7 API differences
description: Breaking API changes in fabric.js v7 that differ from v5/v6 docs and LLM training data
---

## PencilBrush must be explicitly instantiated

In v7, `canvas.freeDrawingBrush` is `undefined` after `new Canvas(...)`. You must create and assign it:

```ts
const PencilBrushClass = fabricModule.PencilBrush as unknown as new (c: FC) => { color: string; width: number };
canvas.freeDrawingBrush = new PencilBrushClass(canvas);
canvas.freeDrawingBrush.color = '#E2E8F0';
canvas.freeDrawingBrush.width = 3;
```

**Why:** v7 removed the implicit default brush on canvas creation.

**How to apply:** Anywhere a Fabric canvas is created and `isDrawingMode` will be used.

## setWidth / setHeight removed → setDimensions

`canvas.setWidth(w)` and `canvas.setHeight(h)` no longer exist. Use:

```ts
canvas.setDimensions({ width: w, height: h });
```

**Why:** v7 unified dimension-setting into a single method.

**How to apply:** ResizeObserver callbacks, any dynamic canvas resizing.

## loadFromJSON is async (Promise, no callback)

```ts
await canvas.loadFromJSON(json); // NOT canvas.loadFromJSON(json, callback)
```

**Why:** v7 fully async-ified the serialization APIs.
