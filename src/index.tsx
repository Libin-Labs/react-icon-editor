import { useState, type CSSProperties } from 'react';
import { createShape, iconToSvg, validateIcon, type IconShape, type IconValue } from './engine.js';

export * from './engine.js';

export interface IconEditorProps {
  value: IconValue;
  onChange: (value: IconValue) => void;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

export function IconEditor({
  value,
  onChange,
  disabled = false,
  className = '',
  style,
  'aria-label': label = 'Icon editor',
}: IconEditorProps) {
  const [selectedId, setSelectedId] = useState(value.shapes[0]?.id ?? '');
  const selected = value.shapes.find((shape) => shape.id === selectedId) ?? value.shapes[0];
  const errors = validateIcon(value);
  const updateShape = (patch: Record<string, string | number>) => {
    onChange({
      ...value,
      shapes: value.shapes.map((shape) =>
        shape.id === selected?.id ? ({ ...shape, ...patch } as IconShape) : shape,
      ),
    });
  };
  const numberField = (
    name: string,
    number: number,
    set: (n: number) => void,
    min = -10000,
    max = 10000,
  ) => (
    <label key={name}>
      {name}
      <input
        type="number"
        step="0.1"
        min={min}
        max={max}
        value={number}
        onChange={(event) => {
          if (Number.isFinite(event.target.valueAsNumber)) set(event.target.valueAsNumber);
        }}
      />
    </label>
  );
  const keys =
    selected?.kind === 'rect'
      ? ['x', 'y', 'width', 'height', 'rx']
      : selected?.kind === 'circle'
        ? ['cx', 'cy', 'r']
        : ['x1', 'y1', 'x2', 'y2'];
  return (
    <section className={`lpi-editor ${className}`} style={style} aria-label={label}>
      <fieldset disabled={disabled}>
        <legend>Icon settings</legend>
        <label>
          Title
          <input
            value={value.title}
            maxLength={500}
            onChange={(event) => onChange({ ...value, title: event.target.value })}
          />
        </label>
        {(['x', 'y', 'width', 'height'] as const).map((key) =>
          numberField(
            `ViewBox ${key}`,
            value.viewBox[key],
            (n) => onChange({ ...value, viewBox: { ...value.viewBox, [key]: n } }),
            key === 'width' || key === 'height' ? 0.1 : -10000,
          ),
        )}
      </fieldset>
      <svg
        className="lpi-preview"
        viewBox={`${value.viewBox.x} ${value.viewBox.y} ${value.viewBox.width} ${value.viewBox.height}`}
        role="img"
        aria-label={value.title || 'Icon preview'}
      >
        {errors.length === 0 &&
          value.shapes.map((shape) => {
            const paint = {
              fill: shape.fill,
              stroke: shape.stroke,
              strokeWidth: shape.strokeWidth,
            };
            if (shape.kind === 'rect')
              return (
                <rect
                  key={shape.id}
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                  rx={shape.rx}
                  {...paint}
                />
              );
            if (shape.kind === 'circle')
              return <circle key={shape.id} cx={shape.cx} cy={shape.cy} r={shape.r} {...paint} />;
            return (
              <line
                key={shape.id}
                x1={shape.x1}
                y1={shape.y1}
                x2={shape.x2}
                y2={shape.y2}
                {...paint}
              />
            );
          })}
      </svg>
      <fieldset disabled={disabled}>
        <legend>Shapes (back to front)</legend>
        <label>
          Selected shape
          <select
            value={selected?.id ?? ''}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {value.shapes.map((shape) => (
              <option key={shape.id} value={shape.id}>
                {shape.id} ({shape.kind})
              </option>
            ))}
          </select>
        </label>
        {(['rect', 'circle', 'line'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            disabled={value.shapes.length >= 100}
            onClick={() => {
              let n = 1;
              while (value.shapes.some((shape) => shape.id === `shape-${n}`)) n++;
              const shape = createShape(kind, `shape-${n}`);
              onChange({ ...value, shapes: [...value.shapes, shape] });
              setSelectedId(shape.id);
            }}
          >
            Add {kind}
          </button>
        ))}
        {selected && (
          <>
            {keys.map((key) =>
              numberField(
                key,
                (selected as unknown as Record<string, number>)[key],
                (n) => updateShape({ [key]: n }),
                ['width', 'height', 'r', 'rx'].includes(key) ? 0 : -10000,
              ),
            )}
            <label>
              Fill
              <input
                value={selected.fill}
                onChange={(event) => updateShape({ fill: event.target.value })}
              />
            </label>
            <label>
              Stroke
              <input
                value={selected.stroke}
                onChange={(event) => updateShape({ stroke: event.target.value })}
              />
            </label>
            {numberField(
              'Stroke width',
              selected.strokeWidth,
              (n) => updateShape({ strokeWidth: n }),
              0,
              1000,
            )}
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  shapes: value.shapes.filter((shape) => shape.id !== selected.id),
                })
              }
            >
              Remove shape
            </button>
            <button
              type="button"
              disabled={value.shapes[0]?.id === selected.id}
              onClick={() => {
                const shapes = [...value.shapes];
                const index = shapes.findIndex((shape) => shape.id === selected.id);
                [shapes[index - 1], shapes[index]] = [shapes[index], shapes[index - 1]];
                onChange({ ...value, shapes });
              }}
            >
              Move backward
            </button>
          </>
        )}
      </fieldset>
      {errors.length > 0 && <p role="alert">{errors.join(' ')}</p>}
      <label>
        SVG export
        <textarea readOnly rows={6} value={errors.length ? '' : iconToSvg(value)} />
      </label>
    </section>
  );
}
