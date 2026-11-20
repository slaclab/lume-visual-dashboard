import { Modal } from '@carbon/react';

type RemoveWidgetModalProps = {
  /** Widget waiting for confirmation; the modal is closed when this is null. */
  itemId: string | null;
  /** Type name shown in the heading, e.g. "Text". */
  widgetName?: string;
  onConfirm: (itemId: string) => void;
  onCancel: () => void;
};

function RemoveWidgetModal({ itemId, widgetName, onConfirm, onCancel }: RemoveWidgetModalProps) {
  return (
    <Modal
      open={itemId !== null}
      danger
      size="xs"
      modalHeading={widgetName ? `Remove ${widgetName} widget?` : 'Remove widget?'}
      primaryButtonText="Remove"
      secondaryButtonText="Cancel"
      onRequestSubmit={() => itemId && onConfirm(itemId)}
      onRequestClose={onCancel}
    >
      <p>The widget will be removed from the grid and its cells freed up.</p>
    </Modal>
  );
}

export default RemoveWidgetModal;
