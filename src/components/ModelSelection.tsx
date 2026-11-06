import {
  DataTableSkeleton,
  InlineNotification,
  Link as CarbonLink,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { createLink } from '@tanstack/react-router';
import { useModels } from '../hooks/useLumeApi';

/** Carbon-styled link with TanStack Router's typed `to`/`params`. */
const RouterLink = createLink(CarbonLink);

const HEADERS = ['Model', 'Version', 'Description'];
const TITLE = 'Models';

const ModelSelection = () => {
  const { data: models, isPending, isError, error } = useModels();

  if (isPending) {
    return (
      <DataTableSkeleton
        headers={HEADERS.map((header) => ({ header, key: header }))}
        columnCount={HEADERS.length}
        rowCount={3}
        showToolbar={false}
      />
    );
  }

  if (isError) {
    return (
      <InlineNotification
        kind="error"
        title="Failed to load models"
        subtitle={error.message}
        hideCloseButton
        lowContrast
      />
    );
  }

  return (
    <TableContainer
      title={TITLE}
      description={`${models.length} available`}
      style={{ minWidth: 0 }}
    >
      {models.length === 0 ? (
        <p className="panel__body">No models available.</p>
      ) : (
        <Table useZebraStyles aria-label={TITLE}>
          <TableHead>
            <TableRow>
              {HEADERS.map((header) => (
                <TableHeader key={header}>{header}</TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {models.map((model) => (
              <TableRow key={model.name}>
                <TableCell>
                  <RouterLink to="/models/$modelId" params={{ modelId: model.name }}>
                    {model.name}
                  </RouterLink>
                </TableCell>
                <TableCell>{model.version || '—'}</TableCell>
                <TableCell>{model.description || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </TableContainer>
  );
};

export default ModelSelection;
