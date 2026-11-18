import { DragDropProvider, useDraggable, useDroppable } from '@dnd-kit/react';
import { useState } from 'react';

type DraggableProps = {
  id: string;
  children: React.ReactNode;
};

function Draggable({ id, children }: DraggableProps) {
  const { ref } = useDraggable({
    id,
  });

  return (
    <div ref={ref} style={{ height: 300, background: 'red', border: '1px solid black' }}>
      {children}
    </div>
  );
}

type DroppableProps = {
  id: string;
  children: React.ReactNode;
};

function Droppable({ id, children }: DroppableProps) {
  const { ref } = useDroppable({
    id,
  });

  return (
    <div ref={ref} style={{ height: 300, background: 'white', border: '1px solid white' }}>
      {children}
    </div>
  );
}

const NUM_TARGETS = 20;

function DragDropContainer() {
  const targets = Array.from({ length: NUM_TARGETS }, (_, i) => String.fromCharCode(65 + i));
  const [target, setTarget] = useState<string | undefined>();
  const draggable = <Draggable id="draggable">Drag me</Draggable>;

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        if (event.canceled) return;
        if (typeof event.operation.target?.id !== 'string') return;

        setTarget(event.operation.target?.id);
      }}
    >
      {!target ? draggable : null}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridAutoRows: 'minmax(300px, auto)',
          gap: '1rem',
        }}
      >
        {targets.map((id) => (
          <Droppable key={id} id={id}>
            {target === id ? draggable : `Droppable ${id}`}
          </Droppable>
        ))}
      </div>
    </DragDropProvider>
  );
}

export default DragDropContainer;
