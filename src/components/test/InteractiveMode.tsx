import { useModelConfig } from '@hooks/useLumeApi';
import InteractiveModelRunner from '@components/test/InteractiveModelRunner';

type InteractiveModeProps = { name?: string };

const InteractiveMode = ({ name }: InteractiveModeProps) => {
  const { data: modelConfig, isPending, isError, error } = useModelConfig(name);

  if (isPending) {
    return <div>Loading model configuration…</div>;
  }

  if (isError) {
    return <div role="alert">Failed to load model configuration: {error.message}</div>;
  }

  // Keyed so input values reset when navigating to a different model.
  return <InteractiveModelRunner key={name} name={name} config={modelConfig} />;
};

export default InteractiveMode;
