import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { IconEditor, createIcon, createShape, iconToSvg, validateIcon } from '../dist/esm/index.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { createRoot } = await import('react-dom/client');
after(() => dom.window.close());

test('three original supported primitives export explicit attributes only', () => {
  const value = createIcon();
  value.shapes.push(createShape('circle', 'b'), createShape('line', 'c'));
  value.shapes[0].onclick = 'alert(1)';
  value.shapes[0].href = 'javascript:alert(1)';
  const svg = iconToSvg(value);
  assert.match(svg, /<rect/);
  assert.match(svg, /<circle/);
  assert.match(svg, /<line/);
  assert.doesNotMatch(svg, /onclick|javascript|href/);
  assert.equal(createIcon().shapes.length, 1);
});

test('title is escaped; unsafe paint, geometry, duplicate ids and unknown shapes fail', () => {
  const value = createIcon();
  value.title = `</title><script a="'">&\u0000\uFFFF\uD800\u{1F600}`;
  const svg = iconToSvg(value);
  assert.match(svg, /&lt;\/title&gt;&lt;script/);
  assert.match(svg, /&quot;&apos;/);
  assert.doesNotMatch(svg, /<script|\u0000|\uFFFF|\uD800/);
  assert.ok(svg.includes('\u{1F600}'));
  const parsed = new dom.window.DOMParser().parseFromString(svg, 'image/svg+xml');
  assert.equal(parsed.querySelector('parsererror'), null);
  for (const patch of [
    { fill: 'url(https://example.com)' },
    { stroke: 'red" onload="x' },
    { r: -1, kind: 'circle' },
    { x: Infinity },
    { kind: 'path' },
    { strokeWidth: -1 },
  ]) {
    const invalid = createIcon();
    Object.assign(invalid.shapes[0], patch);
    assert.throws(() => iconToSvg(invalid), RangeError);
  }
  assert.throws(() => createShape('path', 'id'), RangeError);
  assert.throws(() => createShape('rect', ''), RangeError);
  const duplicate = createIcon();
  duplicate.shapes.push({ ...duplicate.shapes[0] });
  assert.ok(validateIcon(duplicate).length);
  assert.throws(
    () => iconToSvg({ ...createIcon(), viewBox: { x: 0, y: 0, width: 0, height: 24 } }),
    RangeError,
  );
  assert.throws(
    () => iconToSvg({ ...createIcon(), viewBox: { width: 24, height: 24 } }),
    RangeError,
  );
});

test('controlled shape creation, geometry edits, removal and lifecycle', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  let value = createIcon();
  const render = () =>
    root.render(
      React.createElement(IconEditor, {
        value,
        onChange: (next) => {
          value = next;
          render();
        },
      }),
    );
  await act(() => render());
  const button = (text) =>
    [...host.querySelectorAll('button')].find((node) => node.textContent === text);
  await act(() => button('Add circle').click());
  assert.equal(value.shapes[1].kind, 'circle');
  const radius = [...host.querySelectorAll('label')]
    .find((node) => node.firstChild.textContent === 'r')
    .querySelector('input');
  await act(() => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(
      radius,
      '5',
    );
    radius.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  assert.equal(value.shapes[1].r, 5);
  await act(() => button('Remove shape').click());
  assert.equal(value.shapes.length, 1);
  await act(() => root.unmount());
  assert.equal(host.childElementCount, 0);
  host.remove();
});
