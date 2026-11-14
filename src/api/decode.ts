import type {
  EvaluateResponse,
  EvaluateV1WireResponse,
  InputSource,
  Output,
  WireOutput,
} from './types';

const IS_LITTLE_ENDIAN = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

/** Decode base64 little-endian float32 (the server's encoding for all large numeric payloads). */
export function decodeFloat32(b64: string): Float32Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length - (binary.length % 4));
  for (let i = 0; i < bytes.length; i++) bytes[i] = binary.charCodeAt(i);
  if (IS_LITTLE_ENDIAN) return new Float32Array(bytes.buffer);
  const view = new DataView(bytes.buffer);
  const out = new Float32Array(bytes.length / 4);
  for (let i = 0; i < out.length; i++) out[i] = view.getFloat32(i * 4, true);
  return out;
}

export function decodeOutput(output: WireOutput): Output {
  switch (output.kind) {
    case 'array': {
      const { data_b64, ...rest } = output;
      return { ...rest, data: decodeFloat32(data_b64) };
    }
    case 'particles': {
      const coords: Record<string, Float32Array> = {};
      for (const [key, b64] of Object.entries(output.coords)) coords[key] = decodeFloat32(b64);
      return { ...output, coords };
    }
    default:
      return output;
  }
}

export function decodeEvaluateResponse(wire: EvaluateV1WireResponse): EvaluateResponse {
  const outputs: Record<string, Output> = {};
  for (const [id, output] of Object.entries(wire.outputs)) outputs[id] = decodeOutput(output);
  return {
    ...wire,
    input_sources: (wire.input_sources ?? {}) as Record<string, InputSource>,
    outputs,
  };
}
