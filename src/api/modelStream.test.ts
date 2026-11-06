import { describe, expect, it } from 'vitest';
import type { HarePvState, PVValue } from './canopy/types';
import { harePvNames, snapshotFromHare, snapshotFromLiveFrame } from './modelStream';
import type { ConfigResponse, EvaluateResponse } from './types';

const config: ConfigResponse = {
  model: 'demo',
  version: '1',
  description: '',
  inputs: [
    { id: 'Q1', unit: 'kG', default: 0, min: -1, max: 1, range_source: 'model', constant: false },
    { id: 'Q2', unit: 'kG', default: 0, min: -1, max: 1, range_source: 'model', constant: false },
    { id: 'Q3', unit: 'kG', default: 0, min: -1, max: 1, range_source: 'model', constant: false },
  ],
  outputs: [
    { id: 'BPM:X', kind: 'scalar', unit: '', variable_class: 'ScalarVariable' },
    { id: 'emit', kind: 'scalar', unit: 'm', variable_class: 'ScalarVariable' },
    { id: 'beam', kind: 'particles', unit: '', variable_class: 'ParticleGroup' },
    // An output that echoes an input is only subscribed once.
    { id: 'Q1', kind: 'scalar', unit: 'kG', variable_class: 'ScalarVariable' },
  ],
  screens: [],
};

const pvValue = (pv: string, value: PVValue['value'], tsNs: number, connected = true): PVValue => ({
  pv,
  value,
  valueKind: 'scalar',
  severity: 'NO_ALARM',
  alarmStatus: 0,
  tsNs,
  connected,
  error: null,
});

const pvState = (value: PVValue | undefined, extra: Partial<HarePvState> = {}): HarePvState => ({
  value,
  meta: undefined,
  rejected: undefined,
  ...extra,
});

describe('harePvNames', () => {
  it('lists inputs and scalar outputs once each', () => {
    expect(harePvNames(config)).toEqual(['Q1', 'Q2', 'Q3', 'BPM:X', 'emit']);
  });
});

describe('snapshotFromHare', () => {
  it('maps PV values to inputs and measured outputs', () => {
    const snapshot = snapshotFromHare(config, {
      Q1: pvState(pvValue('Q1', 0.5, 2_000_000_000)),
      Q2: pvState(pvValue('Q2', 0.1, 1_000_000_000, false)),
      Q3: pvState(undefined, { rejected: 'Invalid PV name' }),
      'BPM:X': pvState(pvValue('BPM:X', 'n/a', 3_000_000_000), {
        meta: { pv: 'BPM:X', valueKind: 'scalar', units: 'mm' },
      }),
    });

    expect(snapshot.inputs).toEqual({ Q1: 0.5, Q2: null, Q3: null });
    expect(snapshot.inputSources).toEqual({ Q1: 'live', Q2: 'disconnected', Q3: 'rejected' });
    expect(snapshot.outputs).toEqual({
      'BPM:X': { kind: 'scalar', value: null, unit: 'mm', variable_class: 'ScalarVariable' },
      emit: { kind: 'scalar', value: null, unit: 'm', variable_class: 'ScalarVariable' },
      Q1: { kind: 'scalar', value: 0.5, unit: 'kG', variable_class: 'ScalarVariable' },
    });
    // Newest timestamp among connected PVs, in ms.
    expect(snapshot.updatedAt).toBe(3000);
    expect(snapshot.frameIndex).toBeUndefined();
  });

  it('has no update time before any PV arrives', () => {
    expect(snapshotFromHare(config, {}).updatedAt).toBeUndefined();
  });
});

describe('snapshotFromLiveFrame', () => {
  it('keeps the frame values and converts the timestamp to ms', () => {
    const frame: EvaluateResponse = {
      model: 'demo',
      version: '1',
      timestamp: 12.5,
      frame_index: 7,
      inputs: { Q1: 0.2 },
      input_sources: { Q1: 'live' },
      outputs: { emit: { kind: 'scalar', value: 1, unit: 'm', variable_class: 'ScalarVariable' } },
    };
    expect(snapshotFromLiveFrame(frame)).toEqual({
      updatedAt: 12_500,
      frameIndex: 7,
      inputs: frame.inputs,
      inputSources: frame.input_sources,
      outputs: frame.outputs,
    });
  });
});
