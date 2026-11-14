import type { ReactNode } from 'react';

type PanelProps = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
};

/** A titled section styled to match Carbon's `TableContainer` header. */
const Panel = ({ title, description, children }: PanelProps) => (
  <section className="panel" aria-label={title}>
    <header className="panel__header">
      <h4 className="panel__title">{title}</h4>
      {description ? <p className="panel__description">{description}</p> : null}
    </header>
    <div className="panel__body">{children}</div>
  </section>
);

export default Panel;
