import type { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';

import type { EvaluateResponse, Output } from '../api/types';

type OutputsProps = {
  outputs: EvaluateResponse['outputs'] | undefined;
  /** Shown under the title, e.g. a loading indicator or the output count. */
  description?: ReactNode;
  /** Shown in place of the table, e.g. an error or loading message. */
  children?: ReactNode;
};

const EMPTY = '—';

const outputValue = (output: Output): ReactNode => {
  switch (output.kind) {
    case 'scalar':
      return output.value ?? EMPTY;
    case 'array':
      return `[${output.shape.join(' × ')}] ${output.dtype}`;
    case 'particles':
      return `${output.n} particles`;
    case 'value':
      return JSON.stringify(output.value);
  }
};

const outputUnit = (output: Output) => ('unit' in output && output.unit ? output.unit : EMPTY);

const Outputs = ({ outputs, description, children }: OutputsProps) => {
  const entries = outputs ? Object.entries(outputs) : [];

  return (
    // minWidth 0 lets the table scroll inside the container instead of widening the Stack grid.
    <TableContainer title="Outputs" description={description} style={{ minWidth: 0 }}>
      {children ??
        (entries.length === 0 ? (
          <p className="panel__body">No outputs.</p>
        ) : (
          <Table size="sm" useZebraStyles aria-label="Outputs">
            <TableHead>
              <TableRow>
                <TableHeader>ID</TableHeader>
                <TableHeader>Kind</TableHeader>
                <TableHeader>Value</TableHeader>
                <TableHeader>Unit</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map(([id, output]) => (
                <TableRow key={id}>
                  <TableCell>{id}</TableCell>
                  <TableCell>{output.kind}</TableCell>
                  <TableCell>{outputValue(output)}</TableCell>
                  <TableCell>{outputUnit(output)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ))}
    </TableContainer>
  );
};

export default Outputs;
