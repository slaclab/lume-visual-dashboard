import type { ModelStreamSource } from '../api/modelStream';
import { useModelConfig } from '../hooks/useLumeApi';
import StreamingModelRunner from './StreamingModelRunner';

type StreamingPageProps = { name?: string; source: ModelStreamSource };

const StreamingPage = ({ name, source }: StreamingPageProps) => {
  const { data: modelConfig, isPending, isError, error } = useModelConfig(name);

  if (isPending) {
    return <div>Loading model configuration…</div>;
  }

  if (isError) {
    return <div role="alert">Failed to load model configuration: {error.message}</div>;
  }

  // Keyed so the screen and pause state reset when the model or source changes.
  return (
    <StreamingModelRunner
      key={`${source}:${name}`}
      name={name}
      config={modelConfig}
      source={source}
    />
  );
};

export default StreamingPage;
