import type { ReactNode } from 'react';
import {
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
  StructuredListWrapper,
} from '@carbon/react';
import type { ConfigResponse } from '../api/types';

type ModelSummaryProps = {
  config: Pick<ConfigResponse, 'model' | 'version' | 'description'>;
};

const ModelSummary = ({ config: { model, version, description } }: ModelSummaryProps) => {
  const rows: [string, ReactNode][] = [
    ['Model', model],
    ['Version', version || '—'],
    ['Description', description || '—'],
  ];

  return (
    <StructuredListWrapper isCondensed aria-label="Model summary">
      <StructuredListBody>
        {rows.map(([label, value]) => (
          <StructuredListRow key={label}>
            <StructuredListCell noWrap>{label}</StructuredListCell>
            <StructuredListCell>{value}</StructuredListCell>
          </StructuredListRow>
        ))}
      </StructuredListBody>
    </StructuredListWrapper>
  );
};

export default ModelSummary;
