import type { ConfigResponse } from '../api/types';

import { InputSlider } from './InputSlider';

type InputsProps = {
  inputs: ConfigResponse['inputs'];
  values: Record<string, number>;
  disabled?: boolean;
  onChange: (id: string, value: number) => void;
};

const Inputs = ({ inputs, values, onChange, disabled }: InputsProps) => {
  return (
    <div>
      {inputs.map((input) => (
        <InputSlider
          key={input.id}
          input={input}
          value={values[input.id] ?? input.default}
          onCommit={(value) => onChange(input.id, value)}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

export default Inputs;
