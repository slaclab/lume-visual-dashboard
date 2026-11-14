import { useState } from 'react';
import { Pause, Play, Renew } from '@carbon/icons-react';
import { Button, InlineNotification, Select, SelectItem, Stack, Tag } from '@carbon/react';

import type { ModelStreamSnapshot, ModelStreamSource } from '../api/modelStream';
import type { ConfigResponse, LiveStreamStatus } from '../api/types';
import { useModelStream } from '../hooks/useModelStream';
import LiveInputs from './LiveInputs';
import ModelSummary from './ModelSummary';
import Outputs from './Outputs';
import Panel from './Panel';

type StreamingModelRunnerProps = {
  name?: string;
  config: ConfigResponse;
  source: ModelStreamSource;
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

const SOURCE_PANEL = {
  lume: {
    title: 'Live stream (lume-model-api)',
    description: "Model evaluated at the machine's current inputs",
  },
  canopy: {
    title: 'Live PVs (Canopy Hare)',
    description: 'Measured input and output PVs; outputs that are not PVs have no value',
  },
} as const satisfies Record<ModelStreamSource, { title: string; description: string }>;

const updateMeta = (snapshot: ModelStreamSnapshot | undefined) => {
  if (!snapshot) return 'No values yet';
  const parts = [];
  if (snapshot.frameIndex !== undefined) parts.push(`Frame #${snapshot.frameIndex}`);
  if (snapshot.updatedAt !== undefined) {
    parts.push(`updated ${new Date(snapshot.updatedAt).toLocaleTimeString()}`);
  }
  const text = parts.join(' · ') || 'Waiting for values';
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const StreamingModelRunner = ({ name, config, source }: StreamingModelRunnerProps) => {
  const { inputs, screens } = config;

  const [selectedScreen, setSelectedScreen] = useState(screens[0]?.key ?? '');
  const [paused, setPaused] = useState(false);
  // Pausing disconnects, and a disconnected stream has no values, so keep the last ones to show.
  const [heldSnapshot, setHeldSnapshot] = useState<ModelStreamSnapshot>();

  const { status, snapshot, errorMessage, error, backend, available, reconnect } = useModelStream(
    source,
    name,
    config,
    { screen: selectedScreen, enabled: !paused }
  );

  const shownSnapshot = snapshot ?? heldSnapshot;
  const displayStatus: DisplayStatus = paused ? 'paused' : status;
  const statusTag = STATUS_TAG[displayStatus];
  const panel = SOURCE_PANEL[source];

  const togglePaused = () => {
    if (!paused) setHeldSnapshot(shownSnapshot);
    setPaused(!paused);
  };

  const changeScreen = (screen: string) => {
    setSelectedScreen(screen);
    // The held values belong to the previous screen's stream.
    setHeldSnapshot(undefined);
  };

  return (
    <Stack gap={7}>
      <ModelSummary config={config} />
      <Panel title={panel.title} description={panel.description}>
        <Stack gap={6}>
          <div className="stream-toolbar">
            <Tag type={statusTag.type}>{statusTag.label}</Tag>
            {backend ? <Tag type="outline">Backend: {backend}</Tag> : null}
            <span className="stream-toolbar__meta">{updateMeta(shownSnapshot)}</span>
            {available ? (
              <Button
                kind="tertiary"
                size="sm"
                renderIcon={paused ? Play : Pause}
                onClick={togglePaused}
              >
                {paused ? 'Resume' : 'Pause'}
              </Button>
            ) : null}
            {status === 'closed' ? (
              <Button kind="primary" size="sm" renderIcon={Renew} onClick={reconnect}>
                Retry
              </Button>
            ) : null}
          </div>
          {!available ? (
            <InlineNotification
              kind="info"
              title="Canopy is not configured"
              subtitle="This deployment has no Canopy instance, so live PVs are unavailable."
              hideCloseButton
              lowContrast
            />
          ) : status === 'closed' ? (
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
          {/* Screens are model-evaluated particles and images, which Hare can't provide. */}
          {source === 'lume' && screens.length > 0 ? (
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
      <LiveInputs inputs={inputs} snapshot={shownSnapshot} />
      <Outputs
        outputs={shownSnapshot?.outputs}
        description={
          shownSnapshot ? `${Object.keys(shownSnapshot.outputs).length} total` : undefined
        }
      >
        {shownSnapshot ? undefined : (
          <p className="panel__body">
            {!available
              ? 'Not available in this deployment.'
              : displayStatus === 'closed'
                ? 'No values received.'
                : displayStatus === 'paused'
                  ? 'Paused before the first values arrived.'
                  : 'Waiting for the first values…'}
          </p>
        )}
      </Outputs>
    </Stack>
  );
};

export default StreamingModelRunner;
