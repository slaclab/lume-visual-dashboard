import { useMemo, useState } from 'react';

import type { ConfigResponse } from '../api/types';
import { useEvaluate, useModelConfig } from '../hooks/useLumeApi';
import Inputs from './Inputs';
import Outputs from './Outputs';

const ModelConfig = ({ name }: { name?: string }) => {
  const { data: modelConfig, isPending, isError, error } = useModelConfig(name);

  if (isPending) {
    return <div>Loading model configuration…</div>;
  }

  if (isError) {
    return <div role="alert">Failed to load model configuration: {error.message}</div>;
  }

  return <ModelRunner name={name} config={modelConfig} />;
};

type ModelRunnerProps = {
  name?: string;
  config: ConfigResponse;
};

const ModelRunner = ({ name, config }: ModelRunnerProps) => {
  const { description, inputs, outputs, model, version } = config;

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
  } = useEvaluate(name, { inputs: values, outputs: outputIds }, { debounceMs: 0 });

  return (
    <div>
      <h2>{model}</h2>
      <p>{description}</p>
      <p>Version: {version}</p>
      <h3>Inputs</h3>
      <Inputs inputs={inputs} values={values} onChange={handleInputChange} disabled={isFetching} />
      <h3>Outputs</h3>
      {isError ? (
        <div role="alert">Failed to evaluate: {error.message}</div>
      ) : result ? (
        <Outputs outputs={result.outputs} />
      ) : isPending ? (
        <div>Evaluating…</div>
      ) : null}
    </div>
  );
};

export default ModelConfig;
