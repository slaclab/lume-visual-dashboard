import { describe, expect, it } from 'vitest';
import {
  addItem,
  clampResize,
  type GridItem,
  type GridItems,
  insertLine,
  isLineEmpty,
  moveTo,
  removeLine,
  resizeTo,
} from './layout';

const item = (id: string, row: number, col: number, rowSpan = 1, colSpan = 1): GridItem => ({
  id,
  row,
  col,
  rowSpan,
  colSpan,
});

const layout = (...items: GridItem[]): GridItems => Object.fromEntries(items.map((i) => [i.id, i]));

describe('resizeTo', () => {
  const a = item('a', 1, 1);

  it('extends each side toward the pointer', () => {
    expect(resizeTo(a, 'e', { row: 1, col: 3 })).toEqual(item('a', 1, 1, 1, 3));
    expect(resizeTo(a, 'w', { row: 1, col: 0 })).toEqual(item('a', 1, 0, 1, 2));
    expect(resizeTo(a, 'n', { row: 0, col: 1 })).toEqual(item('a', 0, 1, 2, 1));
    expect(resizeTo(a, 's', { row: 2, col: 1 })).toEqual(item('a', 1, 1, 2, 1));
  });

  it('moves both axes for corners', () => {
    expect(resizeTo(a, 'se', { row: 2, col: 2 })).toEqual(item('a', 1, 1, 2, 2));
    expect(resizeTo(a, 'nw', { row: 0, col: 0 })).toEqual(item('a', 0, 0, 2, 2));
  });

  it('shrinks but never below one cell', () => {
    const wide = item('a', 0, 0, 2, 3);
    expect(resizeTo(wide, 'e', { row: 0, col: 1 })).toEqual(item('a', 0, 0, 2, 2));
    expect(resizeTo(wide, 'w', { row: 0, col: 2 })).toEqual(item('a', 0, 2, 2, 1));
    expect(resizeTo(wide, 'e', { row: 0, col: -5 })).toEqual(item('a', 0, 0, 2, 1));
  });
});

describe('clampResize', () => {
  it('grows into free cells', () => {
    const a = item('a', 0, 0);
    const items = layout(a);
    expect(clampResize(items, a, item('a', 0, 0, 1, 2), 2, 2)).toEqual(item('a', 0, 0, 1, 2));
  });

  it('stops at the last free cell before another item', () => {
    const a = item('a', 0, 0);
    const items = layout(a, item('b', 0, 2));
    expect(clampResize(items, a, item('a', 0, 0, 1, 4), 1, 4)).toEqual(item('a', 0, 0, 1, 2));
  });

  it('stops at the grid boundary', () => {
    const a = item('a', 1, 1);
    expect(clampResize(layout(a), a, item('a', 0, 0, 4, 4), 3, 3)).toEqual(item('a', 0, 0, 3, 3));
  });

  it('keeps the free axis of a corner drag when the other is blocked', () => {
    const a = item('a', 0, 0);
    const items = layout(a, item('b', 0, 1));
    expect(clampResize(items, a, item('a', 0, 0, 2, 2), 2, 2)).toEqual(item('a', 0, 0, 2, 1));
  });
});

describe('moveTo', () => {
  it('moves to a free spot', () => {
    const items = layout(item('a', 0, 0, 1, 2));
    expect(moveTo(items, 'a', { row: 1, col: 0 }, 2, 2).a).toEqual(item('a', 1, 0, 1, 2));
  });

  it('swaps with a same-size occupant', () => {
    const items = layout(item('a', 0, 0, 1, 2), item('b', 1, 0, 1, 2));
    const next = moveTo(items, 'a', { row: 1, col: 0 }, 2, 2);
    expect(next.a).toEqual(item('a', 1, 0, 1, 2));
    expect(next.b).toEqual(item('b', 0, 0, 1, 2));
  });

  it('leaves the layout unchanged when the occupant has a different size', () => {
    const items = layout(item('a', 0, 0, 1, 2), item('b', 1, 0));
    expect(moveTo(items, 'a', { row: 1, col: 0 }, 2, 2)).toBe(items);
  });

  it('leaves the layout unchanged when the item would leave the grid', () => {
    const items = layout(item('a', 0, 0, 1, 2));
    expect(moveTo(items, 'a', { row: 0, col: 1 }, 2, 2)).toBe(items);
  });
});

describe('addItem', () => {
  it('only adds into an uncovered cell', () => {
    const items = layout(item('a', 0, 0, 1, 2));
    expect(addItem(items, 'b', { row: 0, col: 1 })).toBe(items);
    expect(addItem(items, 'b', { row: 1, col: 1 }).b).toEqual(item('b', 1, 1));
  });
});

describe('insertLine / removeLine', () => {
  const items = layout(item('a', 0, 0, 2, 1), item('b', 1, 1));

  it('shifts items when adding on the top or left', () => {
    expect(insertLine(items, 'top')).toEqual(layout(item('a', 1, 0, 2, 1), item('b', 2, 1)));
    expect(insertLine(items, 'left')).toEqual(layout(item('a', 0, 1, 2, 1), item('b', 1, 2)));
  });

  it('leaves items in place when adding on the bottom or right', () => {
    expect(insertLine(items, 'bottom')).toBe(items);
    expect(insertLine(items, 'right')).toBe(items);
  });

  it('undoes an insert', () => {
    expect(removeLine(insertLine(items, 'top'), 'top')).toEqual(items);
    expect(removeLine(insertLine(items, 'left'), 'left')).toEqual(items);
  });
});

describe('isLineEmpty', () => {
  // 3x3 grid; 'a' spans the left column's top two rows
  const items = layout(item('a', 0, 0, 2, 1));

  it('treats any part of a spanning item as covering the line', () => {
    expect(isLineEmpty(items, 'top', 3, 3)).toBe(false);
    expect(isLineEmpty(items, 'left', 3, 3)).toBe(false);
  });

  it('is true when nothing touches the edge line', () => {
    expect(isLineEmpty(items, 'bottom', 3, 3)).toBe(true);
    expect(isLineEmpty(items, 'right', 3, 3)).toBe(true);
  });
});
