import { useParams } from '@tanstack/react-router';
import ModelConfig from '@components/test/ModelConfig';

function ModelIndexPage() {
  const { modelId } = useParams({ from: '/models/$modelId/' });
  return <ModelConfig name={modelId} />;
}
export default ModelIndexPage;
