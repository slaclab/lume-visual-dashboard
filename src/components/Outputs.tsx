import type { EvaluateResponse, Output } from '../api/types';

type OutputsProps = {
  outputs: EvaluateResponse['outputs'];
};

const OutputValue = ({ output }: { output: Output }) => {
  switch (output.kind) {
    case 'scalar':
      return (
        <span>
          {output.value ?? '—'}
          {output.unit ? ` ${output.unit}` : ''}
        </span>
      );
    case 'array':
      return (
        <span>
          array [{output.shape.join(' × ')}] {output.dtype}
          {output.unit ? ` (${output.unit})` : ''}
        </span>
      );
    case 'particles':
      return <span>{output.n} particles</span>;
    case 'value':
      return <span>{JSON.stringify(output.value)}</span>;
  }
};

const Outputs = ({ outputs }: OutputsProps) => {
  const entries = Object.entries(outputs);

  if (entries.length === 0) {
    return <div>No outputs.</div>;
  }

  return (
    <dl>
      {entries.map(([id, output]) => (
        <div key={id}>
          <dt>{id}</dt>
          <dd>
            <OutputValue output={output} />
          </dd>
        </div>
      ))}
    </dl>
  );
};

export default Outputs;
