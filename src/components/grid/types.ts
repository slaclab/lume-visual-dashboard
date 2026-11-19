import type { Edge } from './layout';

export type DragData =
  { kind: 'move'; itemId: string } | { kind: 'resize'; itemId: string; edge: Edge };

export type Point = { x: number; y: number };

export type Box = { left: number; right: number; top: number; bottom: number };

/** Screen measurements taken when a resize starts, plus how far the pointer has moved since. */
export type ResizeState = {
  id: string;
  edge: Edge;
  widget: DOMRect;
  grid: DOMRect;
  delta: Point;
};
