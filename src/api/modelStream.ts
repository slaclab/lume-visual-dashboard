import type { HarePvState } from './canopy/types';
import type { ConfigResponse, EvaluateResponse, InputSource, Output, ScalarOutput } from './types';

/** Where a streaming page gets its values: lume-model-api's live stream, or Canopy's Hare. */
export type ModelStreamSource = 'lume' | 'canopy';

/** lume: as reported by the model API. canopy: `live`, or why the PV has no value. */
export type InputValueSource = InputSource | 'disconnected' | 'rejected';

/** One update from either stream, in a shape the tables (and plots) can read regardless of source. */
export interface ModelStreamSnapshot {
  /** Epoch ms of the newest value. */
  updatedAt: number | undefined;
  /** lume-model-api only: the server's frame counter. */
  frameIndex: number | undefined;
  /** `null` when the value is unknown (non-finite, disconnected or rejected). */
  inputs: Record<string, number | null>;
  inputSources: Record<string, InputValueSource>;
  outputs: Record<string, Output>;
}

export function snapshotFromLiveFrame(frame: EvaluateResponse): ModelStreamSnapshot {
  return {
    updatedAt: frame.timestamp * 1000,
    frameIndex: frame.frame_index,
    inputs: frame.inputs,
    inputSources: frame.input_sources,
    outputs: frame.outputs,
  };
}

const scalarOutputs = (config: ConfigResponse) =>
  config.outputs.filter((output) => output.kind === 'scalar');

/** The PVs to watch on Hare: every input, plus the scalar outputs (particles and images can't be PVs). */
export function harePvNames(config: ConfigResponse): string[] {
  const names = [
    ...config.inputs.map((input) => input.id),
    ...scalarOutputs(config).map((output) => output.id),
  ];
  return [...new Set(names)];
}

const numericValue = ({ value }: HarePvState): number | null =>
  value?.connected && typeof value.value === 'number' && Number.isFinite(value.value)
    ? value.value
    : null;

/**
 * Measured values from Hare, keyed like a model frame. Outputs are the machine's readbacks of the
 * output PVs, not model predictions; outputs that aren't PVs (e.g. computed emittances) stay `null`.
 */
export function snapshotFromHare(
  config: ConfigResponse,
  pvs: Record<string, HarePvState>
): ModelStreamSnapshot {
  let updatedAt: number | undefined;
  const pv = (id: string): HarePvState => {
    const state = pvs[id] ?? { value: undefined, meta: undefined, rejected: undefined };
    if (state.value?.connected && state.value.tsNs > 0) {
      updatedAt = Math.max(updatedAt ?? 0, state.value.tsNs / 1e6);
    }
    return state;
  };

  const inputs: ModelStreamSnapshot['inputs'] = {};
  const inputSources: ModelStreamSnapshot['inputSources'] = {};
  for (const { id } of config.inputs) {
    const state = pv(id);
    const value = numericValue(state);
    inputs[id] = value;
    inputSources[id] = state.rejected ? 'rejected' : value === null ? 'disconnected' : 'live';
  }

  const outputs: ModelStreamSnapshot['outputs'] = {};
  for (const { id, unit, variable_class } of scalarOutputs(config)) {
    const state = pv(id);
    const output: ScalarOutput = {
      kind: 'scalar',
      value: numericValue(state),
      unit: unit || state.meta?.units || '',
      variable_class,
    };
    outputs[id] = output;
  }

  return { updatedAt, frameIndex: undefined, inputs, inputSources, outputs };
}
