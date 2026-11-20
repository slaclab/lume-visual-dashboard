import { useModelConfig } from '@hooks/useLumeApi';
import ModelPageRunner from '@components/test/ModelPageRunner';

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

  return <ModelPageRunner config={modelConfig} />;
};

export default ModelConfig;
