import { Modal } from '@carbon/react';

type RemoveWidgetModalProps = {
  /** Widget waiting for confirmation; the modal is closed when this is null. */
  itemId: string | null;
  onConfirm: (itemId: string) => void;
  onCancel: () => void;
};

function RemoveWidgetModal({ itemId, onConfirm, onCancel }: RemoveWidgetModalProps) {
  return (
    <Modal
      open={itemId !== null}
      danger
      size="xs"
      modalHeading={`Remove ${itemId ?? 'widget'}?`}
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
