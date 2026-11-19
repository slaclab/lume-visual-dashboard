import { DragDropProvider, useDraggable, useDroppable } from '@dnd-kit/react';
import { useRef, useState } from 'react';

type DraggableProps = {
  id: string;
  disabled?: boolean;
  children: React.ReactNode;
};

function Draggable({ id, disabled = false, children }: DraggableProps) {
  const { ref } = useDraggable({
    id,
    disabled,
  });

  return (
    <div
      ref={ref}
      style={{
        minWidth: 300,
        height: 300,
        background: 'red',
        border: '1px solid black',
        cursor: disabled ? 'default' : 'grab',
      }}
    >
      {children}
    </div>
  );
}

type DroppableProps = {
  id: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

function Droppable({ id, style, children }: DroppableProps) {
  const { ref } = useDroppable({
    id,
  });

  return (
    <div ref={ref} style={{ height: 300, background: 'grey', border: '1px solid white', ...style }}>
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

function DragDropContainer() {
  const [isEditing, setIsEditing] = useState(false);
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [cols, setCols] = useState(DEFAULT_COLS);

  const targets = Array.from({ length: rows * cols }, (_, i) => `cell-${i}`);

  // itemId -> grid cell id
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const nextItemNumber = useRef(1);

  const addItem = (cellId: string) => {
    const itemId = `item-${nextItemNumber.current++}`;
    setPlacements((prev) => ({ ...prev, [itemId]: cellId }));
  };

  const itemsIn = (cellId: string) =>
    Object.keys(placements)
      .filter((id) => placements[id] === cellId)
      .map((id) => (
        <Draggable key={id} id={id} disabled={!isEditing}>
          {id}
        </Draggable>
      ));

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
        onDragEnd={(event) => {
          if (event.canceled) return;
          const { source, target } = event.operation;
          if (!source || typeof target?.id !== 'string') return;

          const itemId = String(source.id);
          const destination = target.id;

          setPlacements((prev) => {
            const next = { ...prev, [itemId]: destination };
            // One item per cell: swap with whatever is already there
            const occupant = Object.keys(prev).find(
              (id) => id !== itemId && prev[id] === destination
            );
            if (occupant) next[occupant] = prev[itemId];
            return next;
          });
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridAutoRows: 'minmax(300px, auto)',
            gap: '1rem',
          }}
        >
          {targets.map((id) => {
            const items = itemsIn(id);
            return (
              <Droppable key={id} id={id}>
                {items.length ? (
                  items
                ) : isEditing ? (
                  <button
                    type="button"
                    onClick={() => addItem(id)}
                    style={{ width: '100%', height: '100%', cursor: 'pointer' }}
                  >
                    + Add item
                  </button>
                ) : null}
              </Droppable>
            );
          })}
        </div>
      </DragDropProvider>
    </>
  );
}

export default DragDropContainer;
