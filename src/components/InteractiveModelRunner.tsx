import { useMemo, useState } from 'react';
import { InlineNotification, Select, SelectItem, Stack } from '@carbon/react';

import type { ConfigResponse } from '../api/types';
import { useEvaluate } from '../hooks/useLumeApi';
import Inputs from './Inputs';
import ModelSummary from './ModelSummary';
import Outputs from './Outputs';
import Panel from './Panel';

type ModelRunnerProps = {
  name?: string;
  config: ConfigResponse;
};

const InteractiveModelRunner = ({ name, config }: ModelRunnerProps) => {
  const { inputs, outputs, screens } = config;

  const [selectedScreen, setSelectedScreen] = useState(screens[0]?.key ?? '');

  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(inputs.map((input) => [input.id, input.default]))
  );

  const handleInputChange = (id: string, value: number) =>
    setValues((prev) => ({ ...prev, [id]: value }));

  // Arrays/particles are large, and some arrays (e.g. `name`) hold strings the server can't encode.
  const outputIds = useMemo(
    () => outputs.filter((output) => output.kind === 'scalar').map((output) => output.id),
    [outputs]
  );

  // Values only change on slider release, so no debounce is needed.
  const {
    data: result,
    isError,
    error,
    isPending,
    isFetching,
  } = useEvaluate(
    name,
    { inputs: values, outputs: outputIds, screen: selectedScreen },
    { debounceMs: 0 }
  );

  // Plain text: Carbon renders the description inside a <p>.
  const outputsDescription = [
    result ? `${Object.keys(result.outputs).length} total` : null,
    isFetching ? 'Evaluating…' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Stack gap={7}>
      <ModelSummary config={config} />
      <Panel title="Inputs" description={`${inputs.length} total`}>
        <Stack gap={6}>
          {screens.length > 0 ? (
            <Select
              id="screen-select"
              labelText="Screen"
              value={selectedScreen}
              onChange={(e) => setSelectedScreen(e.target.value)}
            >
              {screens.map((screen) => (
                <SelectItem key={screen.key} value={screen.key} text={screen.key} />
              ))}
            </Select>
          ) : null}
          <Inputs
            inputs={inputs}
            values={values}
            onChange={handleInputChange}
            disabled={isFetching}
          />
        </Stack>
      </Panel>
      <Outputs outputs={result?.outputs} description={outputsDescription}>
        {isError ? (
          <InlineNotification
            kind="error"
            title="Failed to evaluate"
            subtitle={error.message}
            hideCloseButton
            lowContrast
          />
        ) : !result && isPending ? (
          <p className="panel__body">Waiting for the first evaluation…</p>
        ) : undefined}
      </Outputs>
    </Stack>
  );
};

export default InteractiveModelRunner;
