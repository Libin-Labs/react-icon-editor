export interface ShapePaint {
  id: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export type IconShape = ShapePaint &
  (
    | { kind: 'rect'; x: number; y: number; width: number; height: number; rx: number }
    | { kind: 'circle'; cx: number; cy: number; r: number }
    | { kind: 'line'; x1: number; y1: number; x2: number; y2: number }
  );

export interface IconValue {
  title: string;
  viewBox: { x: number; y: number; width: number; height: number };
  shapes: IconShape[];
}

export function createShape(kind: IconShape['kind'], id: string): IconShape {
  const paint = { id, fill: '#3859c7', stroke: '#17213a', strokeWidth: 1 };
  if (typeof id !== 'string' || !id || id.length > 64)
    throw new RangeError('Shape id must contain 1-64 characters.');
  if (kind === 'rect') return { ...paint, kind, x: 4, y: 4, width: 16, height: 16, rx: 0 };
  if (kind === 'circle') return { ...paint, kind, cx: 12, cy: 12, r: 8 };
  if (kind === 'line') return { ...paint, fill: 'none', kind, x1: 4, y1: 4, x2: 20, y2: 20 };
  throw new RangeError('Only rect, circle, and line primitives are supported.');
}

export function createIcon(): IconValue {
  return {
    title: 'Icon',
    viewBox: { x: 0, y: 0, width: 24, height: 24 },
    shapes: [createShape('rect', 'shape-1')],
  };
}

function isPaint(value: string): boolean {
  return value === 'none' || /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value);
}

export function validateIcon(value: IconValue): string[] {
  const errors: string[] = [];
  if (typeof value.title !== 'string' || value.title.length > 500)
    errors.push('Title must be a string of at most 500 characters.');
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    const number = value.viewBox[key];
    if (
      !Number.isFinite(number) ||
      Math.abs(number) > 10000 ||
      ((key === 'width' || key === 'height') && number <= 0)
    )
      errors.push('ViewBox coordinates must be finite within +/-10000 and dimensions positive.');
  }
  if (value.shapes.length > 100) errors.push('At most 100 shapes are supported.');
  const ids = new Set<string>();
  for (const shape of value.shapes) {
    if (typeof shape.id !== 'string' || !shape.id || shape.id.length > 64 || ids.has(shape.id))
      errors.push('Shape ids must be unique strings of 1-64 characters.');
    ids.add(shape.id);
    if (!isPaint(shape.fill) || !isPaint(shape.stroke))
      errors.push('Paint must be hex RGB/RGBA or none; URLs and markup are not supported.');
    if (!Number.isFinite(shape.strokeWidth) || shape.strokeWidth < 0 || shape.strokeWidth > 1000)
      errors.push('Stroke width must be 0-1000.');
    const keys =
      shape.kind === 'rect'
        ? ['x', 'y', 'width', 'height', 'rx']
        : shape.kind === 'circle'
          ? ['cx', 'cy', 'r']
          : shape.kind === 'line'
            ? ['x1', 'y1', 'x2', 'y2']
            : [];
    if (!keys.length) errors.push('Only rect, circle, and line primitives are supported.');
    for (const key of keys) {
      const number = (shape as unknown as Record<string, number>)[key];
      if (
        !Number.isFinite(number) ||
        Math.abs(number) > 10000 ||
        (['width', 'height', 'rx', 'r'].includes(key) && number < 0)
      )
        errors.push(`${key} is out of bounds.`);
    }
  }
  return errors;
}

function escapeXml(text: string): string {
  const validText = Array.from(text)
    .filter((character) => {
      const code = character.codePointAt(0)!;
      return (
        code === 0x9 ||
        code === 0xa ||
        code === 0xd ||
        (code >= 0x20 && code <= 0xd7ff) ||
        (code >= 0xe000 && code <= 0xfffd) ||
        (code >= 0x10000 && code <= 0x10ffff)
      );
    })
    .join('');
  return validText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function iconToSvg(value: IconValue): string {
  const errors = validateIcon(value);
  if (errors.length) throw new RangeError(errors.join(' '));
  const { x, y, width, height } = value.viewBox;
  const shapes = value.shapes.map((shape) => {
    const paint = `fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}"`;
    if (shape.kind === 'rect')
      return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" rx="${shape.rx}" ${paint}/>`;
    if (shape.kind === 'circle')
      return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" ${paint}/>`;
    return `<line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" ${paint}/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${width} ${height}" role="img"><title>${escapeXml(value.title)}</title>${shapes.join('')}</svg>`;
}
