import { ChevronRight } from '@carbon/icons-react';
import { Feedback } from '@dnd-kit/dom';
import { DragDropProvider, useDraggable, useDroppable } from '@dnd-kit/react';
import { useRef, useState } from 'react';
import {
  addItem,
  type Cell,
  clampResize,
  EDGES,
  type Edge,
  type GridItem,
  type GridItems,
  inBounds,
  itemAt,
  moveTo,
  resizeTo,
  sameRect,
} from './grid/layout';

type DragData = { kind: 'move'; itemId: string } | { kind: 'resize'; itemId: string; edge: Edge };

const GRID_GAP = 16;

// Resize handles reach halfway into the gap, so neighbouring widgets' handles never overlap
const HANDLE_OUTSET = GRID_GAP / 2;
const HANDLE_SIZE = 16 + HANDLE_OUTSET;
const CORNER_SIZE = 32;
// Edge strips start where the corner squares end
const STRIP_INSET = CORNER_SIZE - HANDLE_OUTSET;

const EDGE_STYLES: Record<Edge, React.CSSProperties> = {
  n: {
    top: -HANDLE_OUTSET,
    left: STRIP_INSET,
    right: STRIP_INSET,
    height: HANDLE_SIZE,
    cursor: 'ns-resize',
  },
  s: {
    bottom: -HANDLE_OUTSET,
    left: STRIP_INSET,
    right: STRIP_INSET,
    height: HANDLE_SIZE,
    cursor: 'ns-resize',
  },
  e: {
    right: -HANDLE_OUTSET,
    top: STRIP_INSET,
    bottom: STRIP_INSET,
    width: HANDLE_SIZE,
    cursor: 'ew-resize',
  },
  w: {
    left: -HANDLE_OUTSET,
    top: STRIP_INSET,
    bottom: STRIP_INSET,
    width: HANDLE_SIZE,
    cursor: 'ew-resize',
  },
  ne: {
    top: -HANDLE_OUTSET,
    right: -HANDLE_OUTSET,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    cursor: 'nesw-resize',
  },
  nw: {
    top: -HANDLE_OUTSET,
    left: -HANDLE_OUTSET,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    cursor: 'nwse-resize',
  },
  se: {
    bottom: -HANDLE_OUTSET,
    right: -HANDLE_OUTSET,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    cursor: 'nwse-resize',
  },
  sw: {
    bottom: -HANDLE_OUTSET,
    left: -HANDLE_OUTSET,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    cursor: 'nesw-resize',
  },
};

const gridArea = ({ row, col, rowSpan, colSpan }: GridItem): React.CSSProperties => ({
  gridRow: `${row + 1} / span ${rowSpan}`,
  gridColumn: `${col + 1} / span ${colSpan}`,
});

const MIN_WIDGET_SIZE = 60;

type ResizeState = {
  id: string;
  edge: Edge;
  widget: DOMRect;
  grid: DOMRect;
  delta: { x: number; y: number };
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Screen rect of the widget while resizing: dragged sides follow the pointer, within limits. */
function resizedRect({ edge, widget, grid, delta }: ResizeState) {
  let { left, right, top, bottom } = widget;
  if (edge.includes('e')) {
    right += clamp(delta.x, MIN_WIDGET_SIZE - widget.width, grid.right - widget.right);
  }
  if (edge.includes('w')) {
    left += clamp(delta.x, grid.left - widget.left, widget.width - MIN_WIDGET_SIZE);
  }
  if (edge.includes('s')) {
    bottom += clamp(delta.y, MIN_WIDGET_SIZE - widget.height, grid.bottom - widget.bottom);
  }
  if (edge.includes('n')) {
    top += clamp(delta.y, grid.top - widget.top, widget.height - MIN_WIDGET_SIZE);
  }
  return { left, right, top, bottom };
}

/**
 * The widget keeps its original grid area while resizing; margins move its sides to
 * `resizedRect` (a stretched grid item grows with negative margins and shrinks with positive ones).
 */
function followPointer(state: ResizeState): React.CSSProperties {
  const { widget } = state;
  const rect = resizedRect(state);
  return {
    opacity: 0.5,
    marginLeft: rect.left - widget.left,
    marginRight: widget.right - rect.right,
    marginTop: rect.top - widget.top,
    marginBottom: widget.bottom - rect.bottom,
  };
}

type ResizeHandleProps = {
  itemId: string;
  edge: Edge;
  isResizing: boolean;
};

// Rotation of a right-pointing chevron so it points out of each side/corner
const CHEVRON_ROTATION: Record<Edge, number> = {
  e: 0,
  se: 45,
  s: 90,
  sw: 135,
  w: 180,
  nw: 225,
  n: 270,
  ne: 315,
};

function ResizeHandle({ itemId, edge, isResizing }: ResizeHandleProps) {
  const [hovered, setHovered] = useState(false);
  const { ref } = useDraggable<DragData>({
    id: `${itemId}:resize:${edge}`,
    data: { kind: 'resize', itemId, edge },
    // The widget's edges follow the pointer via `followPointer`, so the handle itself stays put
    plugins: [Feedback.configure({ feedback: 'none' })],
  });
  // Hover is lost once the drag starts, so the container tells us when this edge is in use
  const active = hovered || isResizing;

  return (
    <div
      ref={ref}
      data-resize-handle={edge}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        background: active ? 'rgba(0, 0, 0, 0.35)' : 'transparent',
        transition: 'background 120ms',
        ...EDGE_STYLES[edge],
      }}
    >
      {active && (
        <ChevronRight
          size={16}
          aria-hidden
          style={{ color: 'white', transform: `rotate(${CHEVRON_ROTATION[edge]}deg)` }}
        />
      )}
    </div>
  );
}

type GridWidgetProps = {
  item: GridItem;
  isEditing: boolean;
  resizeStyle?: React.CSSProperties;
  resizingEdge?: Edge;
  children: React.ReactNode;
};

function GridWidget({ item, isEditing, resizeStyle, resizingEdge, children }: GridWidgetProps) {
  const { ref, handleRef, isDragging } = useDraggable<DragData>({
    id: item.id,
    data: { kind: 'move', itemId: item.id },
    disabled: !isEditing,
  });

  return (
    <div
      ref={ref}
      data-widget-id={item.id}
      style={{
        ...gridArea(item),
        position: 'relative',
        zIndex: 1,
        background: 'red',
        border: '1px solid black',
        opacity: isDragging ? 0.5 : undefined,
        ...resizeStyle,
      }}
    >
      <div
        ref={handleRef}
        style={{ width: '100%', height: '100%', cursor: isEditing ? 'grab' : 'default' }}
      >
        {children}
      </div>
      {isEditing &&
        EDGES.map((edge) => (
          <ResizeHandle
            key={edge}
            itemId={item.id}
            edge={edge}
            isResizing={edge === resizingEdge}
          />
        ))}
    </div>
  );
}

type GridCellProps = {
  cell: Cell;
  children?: React.ReactNode;
};

function GridCell({ cell, children }: GridCellProps) {
  const { ref } = useDroppable<Cell>({
    id: `cell-${cell.row}-${cell.col}`,
    data: cell,
  });

  return (
    <div
      ref={ref}
      data-cell-row={cell.row}
      data-cell-col={cell.col}
      style={{
        gridRow: cell.row + 1,
        gridColumn: cell.col + 1,
        background: 'grey',
        border: '1px solid white',
      }}
    >
      {children}
    </div>
  );
}

const DEFAULT_ROWS = 2;
const DEFAULT_COLS = 2;

type DragDropContainerOptionsProps = {
  rows: number;
  setRows: (rows: number) => void;
  cols: number;
  setCols: (cols: number) => void;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
};

function DragDropContainerOptions({
  rows,
  setRows,
  cols,
  setCols,
  isEditing,
  setIsEditing,
}: DragDropContainerOptionsProps) {
  return (
    <div>
      <label>
        Rows:
        <input type="number" value={rows} onChange={(e) => setRows(Number(e.target.value))} />
      </label>
      <label>
        Cols:
        <input type="number" value={cols} onChange={(e) => setCols(Number(e.target.value))} />
      </label>
      <label>
        Editing:
        <input
          type="checkbox"
          checked={isEditing}
          onChange={(e) => setIsEditing(e.target.checked)}
        />
      </label>
    </div>
  );
}

const isCell = (data: unknown): data is Cell =>
  typeof (data as Cell | undefined)?.row === 'number' &&
  typeof (data as Cell | undefined)?.col === 'number';

/**
 * Cell each dragged side snaps to: the furthest cell that side has entered. A side takes in a cell
 * as soon as it crosses into it and only gives it up once it has fully left it (gaps included).
 * Sides that aren't being dragged are ignored by `resizeTo`.
 */
function snapCell(grid: HTMLElement, rect: ReturnType<typeof resizedRect>, edge: Edge): Cell {
  const cells = [...grid.querySelectorAll<HTMLElement>('[data-cell-row]')].map((el) => ({
    row: Number(el.dataset.cellRow),
    col: Number(el.dataset.cellCol),
    bounds: el.getBoundingClientRect(),
  }));
  const cols = (entered: (b: DOMRect) => boolean) =>
    cells.filter((c) => entered(c.bounds)).map((c) => c.col);
  const rows = (entered: (b: DOMRect) => boolean) =>
    cells.filter((c) => entered(c.bounds)).map((c) => c.row);

  return {
    row: edge.includes('s')
      ? Math.max(-1, ...rows((b) => b.top < rect.bottom))
      : Math.min(Infinity, ...rows((b) => b.bottom > rect.top)),
    col: edge.includes('e')
      ? Math.max(-1, ...cols((b) => b.left < rect.right))
      : Math.min(Infinity, ...cols((b) => b.right > rect.left)),
  };
}

function DragDropContainer() {
  const [isEditing, setIsEditing] = useState(false);
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [cols, setCols] = useState(DEFAULT_COLS);

  const cells = Array.from({ length: rows * cols }, (_, i) => ({
    row: Math.floor(i / cols),
    col: i % cols,
  }));

  const [items, setItems] = useState<GridItems>({});
  const nextItemNumber = useRef(1);
  const gridRef = useRef<HTMLDivElement>(null);

  const [resizing, setResizing] = useState<ResizeState | null>(null);
  // Start-of-drag measurements, read in onDragMove without waiting for a re-render
  const resizeStart = useRef<Omit<ResizeState, 'delta'> | null>(null);

  // Rect the widget being resized will snap to; mirrored in a ref so onDragEnd sees the latest value
  const [preview, setPreview] = useState<GridItem | null>(null);
  const previewRef = useRef<GridItem | null>(null);
  const updatePreview = (next: GridItem | null) => {
    previewRef.current = next;
    setPreview(next);
  };

  // Which cell of a multi-cell widget was grabbed, so moves keep that cell under the pointer
  const grabOffset = useRef<Cell>({ row: 0, col: 0 });
  const anchorFor = (cell: Cell): Cell => ({
    row: cell.row - grabOffset.current.row,
    col: cell.col - grabOffset.current.col,
  });

  // Where the moved widget (and a swapped widget) will land; its original spot if the move is invalid
  const [moveSnaps, setMoveSnaps] = useState<GridItem[]>([]);
  const showMoveSnaps = (itemId: string, cell: Cell | null) => {
    const next = cell ? moveTo(items, itemId, anchorFor(cell), rows, cols) : items;
    const landed = Object.values(next).filter((item) => !sameRect(item, items[item.id]));
    setMoveSnaps(landed.length ? landed : [items[itemId]]);
  };

  const snaps = preview ? [preview] : moveSnaps;

  const handleAddItem = (cell: Cell) => {
    const itemId = `item-${nextItemNumber.current++}`;
    setItems((prev) => addItem(prev, itemId, cell));
  };

  const isCovered = (cell: Cell) =>
    Boolean(itemAt(items, cell) || itemAt(Object.fromEntries(snaps.map((s) => [s.id, s])), cell));
  // Items outside a shrunken grid are kept but hidden until the grid grows again
  const visible = Object.values(items).filter((item) => inBounds(item, rows, cols));

  return (
    <>
      <DragDropContainerOptions
        rows={rows}
        setRows={setRows}
        cols={cols}
        setCols={setCols}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
      />
      <DragDropProvider
        onDragStart={(event) => {
          const { source, position } = event.operation;
          const data = source?.data as DragData | undefined;
          const item = data && items[data.itemId];
          if (!item) return;

          if (data.kind === 'resize') {
            const widget = source?.element?.closest('[data-widget-id]')?.getBoundingClientRect();
            const grid = gridRef.current?.getBoundingClientRect();
            if (widget && grid) {
              resizeStart.current = { id: item.id, edge: data.edge, widget, grid };
              setResizing({ ...resizeStart.current, delta: { x: 0, y: 0 } });
            }
            updatePreview(item);
            return;
          }

          const rect = source?.element?.getBoundingClientRect();
          if (!rect) return;
          const { x, y } = position.initial;
          grabOffset.current = {
            row: clamp(
              Math.floor(((y - rect.top) / rect.height) * item.rowSpan),
              0,
              item.rowSpan - 1
            ),
            col: clamp(
              Math.floor(((x - rect.left) / rect.width) * item.colSpan),
              0,
              item.colSpan - 1
            ),
          };
          setMoveSnaps([item]);
        }}
        onDragOver={(event) => {
          const { source, target } = event.operation;
          const data = source?.data as DragData | undefined;
          if (data?.kind !== 'move') return;
          showMoveSnaps(data.itemId, isCell(target?.data) ? target.data : null);
        }}
        onDragMove={(event) => {
          const { source, position } = event.operation;
          const data = source?.data as DragData | undefined;
          const start = resizeStart.current;
          if (data?.kind !== 'resize' || !start || !gridRef.current) return;

          // dragmove fires before `position.current` is updated, so `to` is the latest pointer
          const current = event.to ?? position.current;
          const state = {
            ...start,
            delta: { x: current.x - position.initial.x, y: current.y - position.initial.y },
          };
          setResizing(state);

          // Resize handles use `feedback: 'none'`, which leaves dnd-kit without a drag shape to
          // run collision detection on, so snapping is worked out from the widget's edges.
          const pointer = snapCell(gridRef.current, resizedRect(state), data.edge);
          const item = items[data.itemId];
          if (!item) return;

          const next = clampResize(items, item, resizeTo(item, data.edge, pointer), rows, cols);
          if (!previewRef.current || !sameRect(previewRef.current, next)) updatePreview(next);
        }}
        onDragEnd={(event) => {
          const { source, target } = event.operation;
          const data = source?.data as DragData | undefined;
          const resized = previewRef.current;
          updatePreview(null);
          setMoveSnaps([]);
          setResizing(null);
          resizeStart.current = null;
          if (event.canceled || !data) return;

          if (data.kind === 'resize') {
            if (resized) setItems((prev) => ({ ...prev, [resized.id]: resized }));
            return;
          }

          if (!isCell(target?.data)) return;
          const anchor = anchorFor(target.data);
          setItems((prev) => moveTo(prev, data.itemId, anchor, rows, cols));
        }}
      >
        <div
          ref={gridRef}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, minmax(300px, auto))`,
            gap: GRID_GAP,
          }}
        >
          {cells.map((cell) => (
            <GridCell key={`${cell.row}-${cell.col}`} cell={cell}>
              {isEditing && !isCovered(cell) ? (
                <button
                  type="button"
                  onClick={() => handleAddItem(cell)}
                  style={{ width: '100%', height: '100%', cursor: 'pointer' }}
                >
                  + Add item
                </button>
              ) : null}
            </GridCell>
          ))}
          {visible.map((item) => (
            <GridWidget
              key={item.id}
              item={item}
              isEditing={isEditing}
              resizeStyle={resizing?.id === item.id ? followPointer(resizing) : undefined}
              resizingEdge={resizing?.id === item.id ? resizing.edge : undefined}
            >
              {item.id}
            </GridWidget>
          ))}
          {snaps.map((snap) => (
            <div
              key={snap.id}
              data-snap-indicator={snap.id}
              style={{
                ...gridArea(snap),
                zIndex: 2,
                pointerEvents: 'none',
                border: '3px dashed white',
                background: 'rgba(255, 255, 255, 0.15)',
              }}
            />
          ))}
        </div>
      </DragDropProvider>
    </>
  );
}

export default DragDropContainer;
