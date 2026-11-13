# Choosing a stream

A model view can use either stream, or both together:

| Need | Use |
| --- | --- |
| Model outputs (screens, beam parameters) evaluated at the machine's current inputs | `useLiveStream` (lume-model-api SSE) |
| Raw machine readbacks or setpoints, e.g. to compare with the model's prediction | `usePvStream` / `useHareStream` (Canopy Hare WebSocket) |
| A model's inputs as the machine sees them, without evaluating | `useHareStream(config.inputs.map((i) => i.id))`, or `useMachineSnapshot` for a one-off read |

The two run independently: each has its own connection, `status` and `error`.

The streaming pages read either source through `useModelStream(source, model, config)`
(`src/hooks/useModelStream.ts`), which converts both into one snapshot of inputs and outputs. It
updates that snapshot at most once per second (`modelStreamTiming.displayIntervalMs`, or the
`intervalMs` option), so the tables don't re-render on every frame. The connection still receives
every update, and the latest values are shown at the end of each interval.

