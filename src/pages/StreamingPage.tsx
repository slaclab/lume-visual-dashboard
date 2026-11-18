import { useParams } from '@tanstack/react-router';
import StreamingMode from '@/components/test/StreamingMode';

function StreamingPage() {
  const { modelId } = useParams({ from: '/models/$modelId/streaming' });
  return <StreamingMode name={modelId} source="lume" />;
}
export default StreamingPage;
