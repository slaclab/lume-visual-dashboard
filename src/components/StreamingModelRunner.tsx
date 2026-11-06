import { useMemo, useState } from 'react';
import { Pause, Play, Renew } from '@carbon/icons-react';
import { Button, InlineNotification, Select, SelectItem, Stack, Tag } from '@carbon/react';

import type { ConfigResponse, EvaluateResponse, LiveStreamStatus } from '../api/types';
import { useLiveStream } from '../hooks/useLiveStream';
import LiveInputs from './LiveInputs';
import ModelSummary from './ModelSummary';
import Outputs from './Outputs';
import Panel from './Panel';

type StreamingModelRunnerProps = {
  name?: string;
  config: ConfigResponse;
};

type DisplayStatus = LiveStreamStatus | 'paused';

const STATUS_TAG = {
  idle: { label: 'Idle', type: 'gray' },
  connecting: { label: 'Connecting', type: 'gray' },
  open: { label: 'Live', type: 'green' },
  reconnecting: { label: 'Reconnecting', type: 'warm-gray' },
  closed: { label: 'Closed', type: 'red' },
  paused: { label: 'Paused', type: 'cool-gray' },
} as const satisfies Record<DisplayStatus, { label: string; type: string }>;

const frameMeta = (frame: EvaluateResponse | undefined) =>
  frame
    ? `Frame #${frame.frame_index} · updated ${new Date(frame.timestamp * 1000).toLocaleTimeString()}`
    : 'No frames yet';

const StreamingModelRunner = ({ name, config }: StreamingModelRunnerProps) => {
  const { inputs, outputs, screens } = config;

  const [selectedScreen, setSelectedScreen] = useState(screens[0]?.key ?? '');
  const [paused, setPaused] = useState(false);
  // Pausing disconnects, and a disconnected stream has no frame, so keep the last one to show.
  const [heldFrame, setHeldFrame] = useState<EvaluateResponse>();

  // Arrays/particles are large, and some arrays (e.g. `name`) hold strings the server can't encode.
  const outputIds = useMemo(
    () => outputs.filter((output) => output.kind === 'scalar').map((output) => output.id),
    [outputs]
  );

  const { status, frame, errorMessage, error, reconnect } = useLiveStream(
    name,
    { screen: selectedScreen || null, outputs: outputIds },
    { enabled: !paused }
  );

  const shownFrame = frame ?? heldFrame;
  const displayStatus: DisplayStatus = paused ? 'paused' : status;
  const statusTag = STATUS_TAG[displayStatus];

  const togglePaused = () => {
    if (!paused) setHeldFrame(shownFrame);
    setPaused(!paused);
  };

  const changeScreen = (screen: string) => {
    setSelectedScreen(screen);
    // The held frame belongs to the previous screen's stream.
    setHeldFrame(undefined);
  };

  return (
    <Stack gap={7}>
      <ModelSummary config={config} />
      <Panel title="Live stream" description="Evaluated at the machine's current inputs">
        <Stack gap={6}>
          <div className="stream-toolbar">
            <Tag type={statusTag.type}>{statusTag.label}</Tag>
            <span className="stream-toolbar__meta">{frameMeta(shownFrame)}</span>
            <Button
              kind="tertiary"
              size="sm"
              renderIcon={paused ? Play : Pause}
              onClick={togglePaused}
            >
              {paused ? 'Resume' : 'Pause'}
            </Button>
            {status === 'closed' ? (
              <Button kind="primary" size="sm" renderIcon={Renew} onClick={reconnect}>
                Retry
              </Button>
            ) : null}
          </div>
          {status === 'closed' ? (
            <InlineNotification
              kind="error"
              title="Live stream closed"
              subtitle={error?.message}
              hideCloseButton
              lowContrast
            />
          ) : status === 'reconnecting' && error ? (
            <InlineNotification
              kind="warning"
              title="Connection lost, reconnecting"
              subtitle={error.message}
              hideCloseButton
              lowContrast
            />
          ) : errorMessage ? (
            <InlineNotification
              kind="warning"
              title="Server reported an error"
              subtitle={errorMessage}
              hideCloseButton
              lowContrast
            />
          ) : null}
          {screens.length > 0 ? (
            <Select
              id="stream-screen-select"
              labelText="Screen"
              value={selectedScreen}
              onChange={(e) => changeScreen(e.target.value)}
            >
              {screens.map((screen) => (
                <SelectItem key={screen.key} value={screen.key} text={screen.key} />
              ))}
            </Select>
          ) : null}
        </Stack>
      </Panel>
      <LiveInputs inputs={inputs} frame={shownFrame} />
      <Outputs
        outputs={shownFrame?.outputs}
        description={shownFrame ? `${Object.keys(shownFrame.outputs).length} total` : undefined}
      >
        {shownFrame ? undefined : (
          <p className="panel__body">
            {displayStatus === 'closed'
              ? 'No frames received.'
              : displayStatus === 'paused'
                ? 'Paused before the first frame.'
                : 'Waiting for the first frame…'}
          </p>
        )}
      </Outputs>
    </Stack>
  );
};

export default StreamingModelRunner;
