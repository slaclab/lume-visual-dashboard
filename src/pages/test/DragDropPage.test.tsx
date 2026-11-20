import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DragDropPage from './DragDropPage';

const setEditing = (on: boolean) => {
  const toggle = screen.queryByRole('button', { name: on ? 'Edit' : 'Stop Editing' });
  if (toggle) fireEvent.click(toggle);
};

function setupWithWidget(type = 'Text') {
  render(<DragDropPage />);
  setEditing(true);
  fireEvent.click(screen.getAllByRole('button', { name: '+ Add item' })[0]);
  fireEvent.click(screen.getByRole('button', { name: `Add ${type} widget` }));
}

// Both modals stay mounted, so pick the dialog by its heading
const dialog = (heading: string) =>
  screen.getByRole('heading', { name: heading }).closest('[role="dialog"]') as HTMLElement;

// Collapsed (inert) panels are hidden from the accessibility tree, so look it up directly
const configuration = () => document.querySelector('aside[aria-label="Configuration"]')!;

const widget = () => document.querySelector<HTMLElement>('[data-widget-id="item-1"]');

describe('DragDropPage', () => {
  it('removes a widget after confirming', () => {
    setupWithWidget();
    expect(screen.getAllByRole('button', { name: '+ Add item' })).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: 'Remove item-1' }));
    fireEvent.click(within(dialog('Remove Text widget?')).getByRole('button', { name: 'Remove' }));

    expect(widget()).toBeNull();
    expect(screen.getAllByRole('button', { name: '+ Add item' })).toHaveLength(4);
  });

  it('keeps the widget when the removal is cancelled', () => {
    setupWithWidget();

    fireEvent.click(screen.getByRole('button', { name: 'Remove item-1' }));
    fireEvent.click(within(dialog('Remove Text widget?')).getByRole('button', { name: 'Cancel' }));

    expect(widget()).toBeTruthy();
    expect(screen.getAllByRole('button', { name: '+ Add item' })).toHaveLength(3);
  });

  it('asks for a widget type and adds nothing when cancelled', () => {
    render(<DragDropPage />);
    setEditing(true);
    fireEvent.click(screen.getAllByRole('button', { name: '+ Add item' })[0]);
    fireEvent.click(within(dialog('Add widget')).getByRole('button', { name: 'Close' }));

    expect(widget()).toBeNull();
    expect(screen.getAllByRole('button', { name: '+ Add item' })).toHaveLength(4);
  });

  it("edits a widget's own settings", () => {
    setupWithWidget('Text');
    setEditing(false);
    fireEvent.click(screen.getByRole('button', { name: 'Configure item-1' }));

    const panel = screen.getByRole('region', { name: 'item-1 settings' });
    expect(within(panel).getByRole('heading', { name: 'Text · item-1' })).toBeTruthy();
    fireEvent.change(within(panel).getByLabelText('Heading'), { target: { value: 'Beam status' } });

    expect(within(widget()!).getByRole('heading', { name: 'Beam status' })).toBeTruthy();
  });

  it('configures a clicked widget outside edit mode', () => {
    setupWithWidget();
    setEditing(false);
    expect(configuration().hasAttribute('inert')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Configure item-1' }));
    expect(configuration().hasAttribute('inert')).toBe(false);
    const panel = screen.getByRole('region', { name: 'item-1 settings' });
    expect(within(panel).getByRole('heading', { name: 'Text · item-1' })).toBeTruthy();
    // Only the Color widget has a colour; other types have no background setting
    expect(within(panel).queryByText('Background')).toBeNull();
  });

  it('fills a Color widget with its picked colour', () => {
    setupWithWidget('Color');
    setEditing(false);
    fireEvent.click(screen.getByRole('button', { name: 'Configure item-1' }));

    const panel = screen.getByRole('region', { name: 'item-1 settings' });
    fireEvent.change(within(panel).getByLabelText('Colour'), { target: { value: '#0f62fe' } });

    const swatch = widget()?.querySelector<HTMLElement>('[data-color-swatch]');
    expect(swatch?.style.background).toBe('rgb(15, 98, 254)');
  });

  it('clears the selection when editing is turned on', () => {
    setupWithWidget();
    setEditing(false);
    fireEvent.click(screen.getByRole('button', { name: 'Configure item-1' }));

    setEditing(true);

    expect(screen.queryByRole('region', { name: 'item-1 settings' })).toBeNull();
    expect(configuration().hasAttribute('inert')).toBe(true);
  });
});
