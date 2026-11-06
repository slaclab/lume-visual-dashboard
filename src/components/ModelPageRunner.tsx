import type { ReactNode } from 'react';
import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import type { ConfigResponse, InputInfo, OutputInfo } from '../api/types';
import ModelSummary from './ModelSummary';

type ModelPageRunnerProps = {
  config: ConfigResponse;
};

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
};

const EMPTY = '—';

const text = (value: string | null | undefined) => (value ? value : EMPTY);

const INPUT_COLUMNS: Column<InputInfo>[] = [
  { key: 'id', header: 'ID', render: (i) => i.id },
  { key: 'unit', header: 'Unit', render: (i) => text(i.unit) },
  { key: 'default', header: 'Default', render: (i) => i.default },
  { key: 'min', header: 'Min', render: (i) => i.min },
  { key: 'max', header: 'Max', render: (i) => i.max },
  { key: 'range_source', header: 'Range source', render: (i) => text(i.range_source) },
  { key: 'constant', header: 'Constant', render: (i) => (i.constant ? 'Yes' : 'No') },
  { key: 'alias_of', header: 'Alias of', render: (i) => text(i.alias_of) },
];

const OUTPUT_COLUMNS: Column<OutputInfo>[] = [
  { key: 'id', header: 'ID', render: (o) => o.id },
  { key: 'kind', header: 'Kind', render: (o) => o.kind },
  { key: 'unit', header: 'Unit', render: (o) => text(o.unit) },
  { key: 'shape', header: 'Shape', render: (o) => (o.shape ? o.shape.join(' × ') : EMPTY) },
  { key: 'variable_class', header: 'Variable class', render: (o) => text(o.variable_class) },
  { key: 'element_name', header: 'Element', render: (o) => text(o.element_name) },
  { key: 'alias_of', header: 'Alias of', render: (o) => text(o.alias_of) },
];

type ConfigTableProps<T> = {
  title: string;
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
};

function ConfigTable<T>({ title, rows, columns, rowKey }: ConfigTableProps<T>) {
  return (
    // minWidth 0 lets the table scroll inside the container instead of widening the Stack grid.
    <TableContainer title={title} description={`${rows.length} total`} style={{ minWidth: 0 }}>
      {rows.length === 0 ? (
        <p className="cds--label">None</p>
      ) : (
        <Table size="sm" useZebraStyles aria-label={title}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableHeader key={column.key}>{column.header}</TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((column) => (
                  <TableCell key={column.key}>{column.render(row)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </TableContainer>
  );
}

const ModelPageRunner = ({ config }: ModelPageRunnerProps) => {
  const { inputs, outputs } = config;

  return (
    <Stack gap={7}>
      <ModelSummary config={config} />
      <ConfigTable title="Inputs" rows={inputs} columns={INPUT_COLUMNS} rowKey={(i) => i.id} />
      <ConfigTable title="Outputs" rows={outputs} columns={OUTPUT_COLUMNS} rowKey={(o) => o.id} />
    </Stack>
  );
};

export default ModelPageRunner;
