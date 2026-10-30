import type { components } from './schema';

type Schemas = components['schemas'];

/**
 * Current value of a PV. `tsNs` is epoch nanoseconds, which exceeds 2^53, so it loses
 * sub-microsecond precision once parsed; fine for display, not for exact comparisons.
 */
export type PVValue = Schemas['PVValue'];
/** Static display metadata for a PV (units, precision, limits, enum labels). */
export type PVMeta = Schemas['PVMeta'];
export type ValueKind = Schemas['ValueKind'];
export type AlarmSeverity = Schemas['AlarmSeverity'];
export type TableValue = Schemas['TableValue'];
