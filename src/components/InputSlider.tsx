import { useState } from 'react';

import type { InputInfo } from '../api/types';

type InputSliderProps = {
  input: InputInfo;
  value: number;
  /** Called once the user releases the slider, not on every drag tick. */
  onCommit: (value: number) => void;
  disabled?: boolean;
};

export const InputSlider = ({ input, value, onCommit, disabled }: InputSliderProps) => {
  const { id, min, max, unit, constant } = input;
  // Divide the range into 100 steps; fall back to 1 when min === max.
  const step = (max - min) / 100 || 1;

  // Value while dragging; null when not dragging, so the committed `value` prop is shown.
  const [draft, setDraft] = useState<number | null>(null);
  const shown = draft ?? value;

  const commit = () => {
    if (draft === null) return;
    if (draft !== value) onCommit(draft);
    setDraft(null);
  };

  return (
    <label>
      <span>
        {id}
        {/* {unit ? ` (${unit})` : ''} */}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={shown}
        disabled={constant || disabled}
        onChange={(e) => setDraft(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
      />
      <output>
        {shown}
        {unit ? ` ${unit}` : ''}
      </output>
    </label>
  );
};
