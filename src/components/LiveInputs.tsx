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

import type { EvaluateResponse, InputInfo, InputSource } from '../api/types';

type LiveInputsProps = {
  inputs: InputInfo[];
  /** The latest frame; undefined before the first one arrives. */
  frame: EvaluateResponse | undefined;
};

const EMPTY = '—';
const TITLE = 'Live inputs';

const SOURCE_TAG_TYPE = {
  live: 'green',
  request: 'blue',
  baseline: 'gray',
} as const satisfies Record<InputSource, string>;

const LiveInputs = ({ inputs, frame }: LiveInputsProps) => (
  // minWidth 0 lets the table scroll inside the container instead of widening the Stack grid.
  <TableContainer title={TITLE} description={`${inputs.length} total`} style={{ minWidth: 0 }}>
    {inputs.length === 0 ? (
      <p className="panel__body">No inputs.</p>
    ) : (
      <Table size="sm" useZebraStyles aria-label={TITLE}>
        <TableHead>
          <TableRow>
            <TableHeader>ID</TableHeader>
            <TableHeader>Value</TableHeader>
            <TableHeader>Unit</TableHeader>
            <TableHeader>Source</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {inputs.map(({ id, unit }) => {
            const source = frame?.input_sources[id];
            return (
              <TableRow key={id}>
                <TableCell>{id}</TableCell>
                <TableCell>{frame?.inputs[id] ?? EMPTY}</TableCell>
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
