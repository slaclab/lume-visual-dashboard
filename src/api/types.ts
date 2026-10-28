import type { components } from './schema';

type Schemas = components['schemas'];

export type ModelListEntry = Schemas['ModelListEntry'];
export type ConfigResponse = Schemas['ConfigResponse'];
export type InputInfo = Schemas['InputInfo'];
export type OutputInfo = Schemas['OutputInfo'];
export type ScreenInfo = Schemas['ScreenInfo'];
export type SnapshotResponse = Schemas['SnapshotResponse'];
export type HTTPValidationError = Schemas['HTTPValidationError'];
export type OutputKind = OutputInfo['kind'];

/** Wire shapes, exactly as sent by the server (base64 payloads). */
export type WireScalarOutput = Schemas['ScalarOutput'];
export type WireArrayOutput = Schemas['ArrayOutput'];
export type WireParticlesOutput = Schemas['ParticlesOutput'];
export type WireValueOutput = Schemas['ValueOutput'];
export type WireOutput = EvaluateV1WireResponse['outputs'][string];
export type EvaluateV1WireResponse = Schemas['EvaluateV1Response'];

/**
 * The server fills `inputs`/`outputs` with defaults, so they are optional here even though
 * the generated schema marks them required. At least one of `outputs` or `screen` is required.
 */
export type EvaluateRequest = Omit<Schemas['EvaluateV1Request'], 'inputs' | 'outputs'> & {
  inputs?: Record<string, number>;
  outputs?: string[];
};

/** Non-finite numbers in responses arrive as JSON `null`, so all decoded numbers are nullable. */
export type ScalarOutput = Omit<WireScalarOutput, 'value'> & { value: number | null };

export type ArrayOutput = Omit<WireArrayOutput, 'data_b64'> & {
  /** Row-major, sized by `shape`. */
  data: Float32Array;
};

export type ParticlesOutput = Omit<WireParticlesOutput, 'coords' | 'stats'> & {
  /** `x`, `px`, `y`, `py`, `z`, `pz`, `weight`, each of length `n`. */
  coords: Record<string, Float32Array>;
  stats: Record<string, number | null>;
};

export type ValueOutput = WireValueOutput;

export type Output = ScalarOutput | ArrayOutput | ParticlesOutput | ValueOutput;

export type InputSource = 'live' | 'request' | 'baseline';

export type EvaluateResponse = Omit<
  EvaluateV1WireResponse,
  'outputs' | 'inputs' | 'input_sources'
> & {
  inputs: Record<string, number | null>;
  input_sources: Record<string, InputSource>;
  outputs: Record<string, Output>;
};
