import { createFileRoute } from '@tanstack/react-router';
import DragDropPage from '@pages/test/DragDropPage';

export const Route = createFileRoute('/')({
  component: DragDropPage,
});
