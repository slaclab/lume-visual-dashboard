import { describe, expect, it } from 'vitest';
import { decodeEvaluateResponse, decodeFloat32 } from './decode';
import type { EvaluateV1WireResponse } from './types';
import { encodeFloat32 } from '../test/utils';

describe('decodeFloat32', () => {
  it('decodes base64 little-endian float32', () => {
    const decoded = decodeFloat32(encodeFloat32([1.5, -2, 0, 3.25]));
    expect(Array.from(decoded)).toEqual([1.5, -2, 0, 3.25]);
  });

  it('decodes an empty payload', () => {
    expect(decodeFloat32('')).toHaveLength(0);
  });

  it('matches a known little-endian encoding', () => {
    // 1.0f little-endian is 00 00 80 3f
    expect(Array.from(decodeFloat32('AACAPw=='))).toEqual([1]);
  });
});

describe('decodeEvaluateResponse', () => {
  const wire: EvaluateV1WireResponse = {
    model: 'demo',
    version: '1',
    timestamp: 1,
    frame_index: 0,
    inputs: { Q1: 1 },
    input_sources: { Q1: 'request' },
    outputs: {
      sigma: { kind: 'scalar', value: 0.5, unit: 'm', variable_class: 'ScalarVariable' },
      img: {
        kind: 'array',
        shape: [2, 2],
        dtype: 'float32',
        data_b64: encodeFloat32([1, 2, 3, 4]),
        unit: '',
        variable_class: 'ArrayVariable',
      },
      beam: {
        kind: 'particles',
        n: 2,
        coords: { x: encodeFloat32([0.1, 0.2]) },
        stats: { sigma_x: 0.15 },
        stats_units: { sigma_x: 'm' },
        units: { x: 'm' },
        variable_class: 'ParticleGroupVariable',
      },
      label: { kind: 'value', value: 'ok', variable_class: 'Variable' },
    },
  };

  it('decodes array and particle payloads and passes other kinds through', () => {
    const decoded = decodeEvaluateResponse(wire);
    const { img, beam, sigma, label } = decoded.outputs;

    expect(img.kind === 'array' && Array.from(img.data)).toEqual([1, 2, 3, 4]);
    expect(img).not.toHaveProperty('data_b64');
    expect(beam.kind === 'particles' && beam.coords.x).toBeInstanceOf(Float32Array);
    expect(beam.kind === 'particles' && beam.coords.x[1]).toBeCloseTo(0.2);
    expect(sigma).toEqual(wire.outputs.sigma);
    expect(label).toEqual(wire.outputs.label);
    expect(decoded.input_sources).toEqual({ Q1: 'request' });
  });
});
