import { useModelConfig } from '../hooks/useLumeApi';
import ModelPageRunner from './ModelPageRunner';

type ModelPageProps = {
  name?: string;
};

const ModelPage = ({ name }: ModelPageProps) => {
  const { data: modelConfig, isPending, isError, error } = useModelConfig(name);

  if (isPending) {
    return <div>Loading model configuration…</div>;
  }

  if (isError) {
    return <div role="alert">Failed to load model configuration: {error.message}</div>;
  }

  return <ModelPageRunner config={modelConfig} />;
};

export default ModelPage;
