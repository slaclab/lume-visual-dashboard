import { Modal } from '@carbon/react';
import { WIDGET_TYPES, WIDGETS, type WidgetType } from './widgets/registry';

type AddWidgetModalProps = {
  open: boolean;
  onSelect: (type: WidgetType) => void;
  onCancel: () => void;
};

/** Lets the user pick which kind of widget to create; one tile per registered type. */
function AddWidgetModal({ open, onSelect, onCancel }: AddWidgetModalProps) {
  return (
    <Modal open={open} passiveModal modalHeading="Add widget" onRequestClose={onCancel}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 8,
        }}
      >
        {WIDGET_TYPES.map((type) => {
          const { name, description, icon: Icon } = WIDGETS[type];
          const descriptionId = `add-widget-${type}-description`;
          return (
            <button
              key={type}
              type="button"
              aria-label={`Add ${name} widget`}
              aria-describedby={descriptionId}
              onClick={() => onSelect(type)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 8,
                padding: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'inherit',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <Icon size={24} aria-hidden />
              <strong>{name}</strong>
              <span id={descriptionId} style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                {description}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

export default AddWidgetModal;
