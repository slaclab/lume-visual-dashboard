import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import DragDropContainer from './DragDropContainer';

beforeAll(() => {
  // jsdom has no ResizeObserver; Carbon's Modal needs one to mount
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

function setupWithWidget() {
  render(<DragDropContainer />);
  fireEvent.click(screen.getByLabelText('Editing:'));
  fireEvent.click(screen.getAllByRole('button', { name: '+ Add item' })[0]);
}

describe('DragDropContainer', () => {
  it('removes a widget after confirming', () => {
    setupWithWidget();
    expect(screen.getAllByRole('button', { name: '+ Add item' })).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: 'Remove item-1' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));

    expect(screen.queryByRole('button', { name: 'Remove item-1' })).toBeNull();
    expect(screen.getAllByRole('button', { name: '+ Add item' })).toHaveLength(4);
  });

  it('keeps the widget when the removal is cancelled', () => {
    setupWithWidget();

    fireEvent.click(screen.getByRole('button', { name: 'Remove item-1' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('button', { name: 'Remove item-1' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: '+ Add item' })).toHaveLength(3);
  });
});
