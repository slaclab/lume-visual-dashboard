import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';

import type { InputValueSource, ModelStreamSnapshot } from '../api/modelStream';
import type { InputInfo } from '../api/types';

type LiveInputsProps = {
  inputs: InputInfo[];
  /** The latest values; undefined before the first ones arrive. */
  snapshot: ModelStreamSnapshot | undefined;
};

const EMPTY = '—';
const TITLE = 'Live inputs';

const SOURCE_TAG_TYPE = {
  live: 'green',
  request: 'blue',
  baseline: 'gray',
  disconnected: 'red',
  rejected: 'magenta',
} as const satisfies Record<InputValueSource, string>;

const LiveInputs = ({ inputs, snapshot }: LiveInputsProps) => (
  // minWidth 0 lets the table scroll inside the container instead of widening the Stack grid.
  <TableContainer title={TITLE} description={`${inputs.length} total`} style={{ minWidth: 0 }}>
    {inputs.length === 0 ? (
      <p className="panel__body">No inputs.</p>
    ) : (
      <Table size="sm" useZebraStyles aria-label={TITLE} className="fixed-columns">
        <TableHead>
          <TableRow>
            <TableHeader className="col-id">ID</TableHeader>
            <TableHeader className="col-value">Value</TableHeader>
            <TableHeader className="col-unit">Unit</TableHeader>
            <TableHeader className="col-source">Source</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {inputs.map(({ id, unit }) => {
            const source = snapshot?.inputSources[id];
            return (
              <TableRow key={id}>
                <TableCell>{id}</TableCell>
                <TableCell className="numeric">{snapshot?.inputs[id] ?? EMPTY}</TableCell>
                <TableCell>{unit || EMPTY}</TableCell>
                <TableCell>
                  {source ? (
                    <Tag size="sm" type={SOURCE_TAG_TYPE[source] ?? 'gray'}>
                      {source}
                    </Tag>
                  ) : (
                    EMPTY
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    )}
  </TableContainer>
);

export default LiveInputs;
