import { useRef } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';
import { Slider } from '@carbon/react';

import type { InputInfo } from '../api/types';

type InputSliderProps = {
  input: InputInfo;
  value: number;
  /** Called once the user releases the slider, not on every drag tick. */
  onCommit: (value: number) => void;
  disabled?: boolean;
};

const COMMIT_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter']);

const formatBound = (bound: number, unit: string) =>
  `${Number(bound.toPrecision(4))}${unit ? ` ${unit}` : ''}`;

export const InputSlider = ({ input, value, onCommit, disabled }: InputSliderProps) => {
  const { id, min, max, unit, constant } = input;
  // Divide the range into 100 steps; fall back to 1 when min === max.
  const step = (max - min) / 100 || 1;

  // Latest value from the slider; committed on release, arrow/Enter keyup, or blur.
  const draft = useRef<number | null>(null);

  const commit = (next = draft.current) => {
    draft.current = null;
    if (next !== null && next !== value) onCommit(next);
  };

  // Carbon only fires `onRelease` for pointer drags, so keyboard and text entry commit here.
  const handleKeyUp = (e: KeyboardEvent) => {
    if (COMMIT_KEYS.has(e.key)) commit();
  };
  const handleBlur = (e: FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget)) commit();
  };

  return (
    <div onKeyUp={handleKeyUp} onBlur={handleBlur}>
      <Slider
        id={`input-${id}`}
        labelText={unit ? `${id} (${unit})` : id}
        min={min}
        max={max}
        step={step}
        value={value}
        formatLabel={(bound) => formatBound(bound, unit)}
        disabled={constant || disabled}
        onChange={({ value: next }) => {
          if (typeof next === 'number' && Number.isFinite(next)) draft.current = next;
        }}
        onRelease={({ value: next }) => {
          if (typeof next === 'number' && Number.isFinite(next)) commit(next);
        }}
      />
    </div>
  );
};
