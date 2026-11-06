import { useModelConfig } from '../hooks/useLumeApi';
import StreamingModelRunner from './StreamingModelRunner';

type StreamingPageProps = { name?: string };

const StreamingPage = ({ name }: StreamingPageProps) => {
  const { data: modelConfig, isPending, isError, error } = useModelConfig(name);

  if (isPending) {
    return <div>Loading model configuration…</div>;
  }

  if (isError) {
    return <div role="alert">Failed to load model configuration: {error.message}</div>;
  }

  // Keyed so the screen and pause state reset when navigating to a different model.
  return <StreamingModelRunner key={name} name={name} config={modelConfig} />;
};

export default StreamingPage;
