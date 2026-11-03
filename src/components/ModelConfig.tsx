import { useModelConfig } from '../hooks/useLumeApi';
import ModelRunner from './ModelRunner';

type ModelConfigProps = {
  name?: string;
};

const ModelConfig = ({ name }: ModelConfigProps) => {
  const { data: modelConfig, isPending, isError, error } = useModelConfig(name);

  if (isPending) {
    return <div>Loading model configuration…</div>;
  }

  if (isError) {
    return <div role="alert">Failed to load model configuration: {error.message}</div>;
  }

  // Keyed so input values reset when navigating to a different model.
  return <ModelRunner key={name} name={name} config={modelConfig} />;
};

export default ModelConfig;
