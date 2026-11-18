import { useParams } from '@tanstack/react-router';
import InteractiveMode from '@components/test/InteractiveMode';

function InteractivePage() {
  const { modelId } = useParams({ from: '/models/$modelId/interactive' });
  return <InteractiveMode name={modelId} />;
}
export default InteractivePage;
