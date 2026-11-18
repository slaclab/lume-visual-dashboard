import { useParams } from '@tanstack/react-router';
import StreamingMode from '@/components/test/StreamingMode';

function CanopyStreamingPage() {
  const { modelId } = useParams({ from: '/models/$modelId/canopy' });
  return <StreamingMode name={modelId} source="canopy" />;
}
export default CanopyStreamingPage;
