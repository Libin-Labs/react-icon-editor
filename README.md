# @lp-labs/react-icon-editor

An original controlled icon editor for rectangles, circles and lines. SVG
rendering and export use explicit allowlisted primitives, never arbitrary SVG
HTML. React 18.2 or 19 is the only runtime peer; there are no runtime dependencies.

## Use

```sh
npm install @lp-labs/react-icon-editor react react-dom
```

```tsx
import { useState } from "react";
import {
  IconEditor,
  createIcon,
  iconToSvg,
  validateIcon,
} from "@lp-labs/react-icon-editor";
import "@lp-labs/react-icon-editor/styles.css";

export default function App() {
  const [value, setValue] = useState(createIcon);
  return (
    <>
      <IconEditor value={value} onChange={setValue} />
      <pre>{validateIcon(value).length ? "Correct the fields" : iconToSvg(value)}</pre>
    </>
  );
}
```

Use within a React application whose bundler accepts CSS imports. ESM named
imports and CommonJS `require` expose the same API. CSS is a separate subpath:
`@lp-labs/react-icon-editor/styles.css`. Imports do not access the DOM.

## Component and complete types

`IconEditor(props: IconEditorProps)` requires `value: IconValue` and
`onChange(next: IconValue): void`. Save the complete next value; input objects
are not mutated. Optional props: `disabled?: boolean = false`,
`className?: string = ""`, `style?: React.CSSProperties`, and
`"aria-label"?: string = "Icon editor"`.

Exported schemas:

```ts
interface ShapePaint {
  id: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
}
type IconShape = ShapePaint & (
  | { kind: "rect"; x: number; y: number; width: number; height: number; rx: number }
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number }
);
interface IconValue {
  title: string;
  viewBox: { x: number; y: number; width: number; height: number };
  shapes: IconShape[];
}
```

`IconEditorProps` is also exported. Every listed schema field is required.
`id` is a unique 1-64-character string used internally for selection, not an
exported SVG attribute. There may be 0-100 shapes. Geometry must be finite and
within +/-10000; width, height, rx and r cannot be negative. ViewBox dimensions
must be positive and <= 10000, and origins within +/-10000. Stroke width is
0-1000. Fill and stroke accept `"none"` or 3/4/6/8-digit hex colors. Title is at
most 500 characters.

## All runtime exports

* `IconEditor`: the component above.
* `createIcon(): IconValue`: returns fresh data: title `"Icon"`, viewBox
  `{ x: 0, y: 0, width: 24, height: 24 }`, one default rect with id `"shape-1"`.
* `createShape(kind: IconShape["kind"], id: string): IconShape`: returns a
  default shape. Paint is fill `"#3859c7"`, stroke `"#17213a"`, strokeWidth 1.
  Rect: x/y 4, width/height 16, rx 0. Circle: cx/cy 12, r 8.
  Line: x1/y1 4, x2/y2 20, fill `"none"`.
  Throws `RangeError` for unsupported kind or empty/overlong id. Uniqueness is
  checked when validating the complete icon.
* `validateIcon(value: IconValue): string[]`: returns constraint errors, or `[]`.
  Requires the structural schema above, not arbitrary unknown JSON.
* `iconToSvg(value: IconValue): string`: validates, then returns a standalone
  SVG string with namespace, viewBox, `role="img"`, escaped title and primitives
  in array order. Throws `RangeError` on validation failure.

These are all runtime exports; there is no default export or custom error class.

## Editing and safe export contract

Choose a shape, edit its geometry and paints, add/remove primitives, or Move
backward to change stacking order. The array runs back to front. New shapes use
the default 24-unit geometry even in a different viewBox. Every numeric finite
edit is emitted, including out-of-range intermediate values; the editor reports
errors and withholds preview primitives/export until valid. Fill/stroke fields
allow typing partial hex strings without silently replacing input.

SVG export never includes unknown fields, event handlers, arbitrary paths,
links, scripts, images, style strings, URL paints, filters or raw markup.
XML-sensitive title characters are escaped; XML 1.0-disallowed characters,
including lone surrogates, are stripped (valid Unicode pairs are preserved).
IDs are not serialized. `iconToSvg` only returns text;
the editor shows it in a read-only textarea and does not inject it as HTML.
There is no SVG string import, pen tool, arbitrary path editor, drag geometry,
transform editor, font support, PNG conversion or full SVG compatibility.

## Customization and accessibility

The `.lpi-editor` root scopes all styles. Override `--lpi-accent` or pass root
`className`/`style`. Native labeled fields, fieldset legends, selection controls
and visible focus outlines support keyboard editing; errors use `role="alert"`.
The preview has an image role and uses the icon title as its accessible name.
An exported SVG embeds a title; consumers remain responsible for contextual
labels or marking decorative images appropriately. No production certification
is claimed.

[SVG](https://developer.mozilla.org/en-US/docs/Web/SVG) |

## License

[MIT](./LICENSE).

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
