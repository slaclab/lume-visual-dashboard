import { Link, useParams } from '@tanstack/react-router';

function ModelNotFound() {
  const { modelId } = useParams({ from: '/models/$modelId' });
  return (
    <div role="alert">
      <p>Model “{modelId}” was not found.</p>
      <Link to="/models">Back to models</Link>
    </div>
  );
}
export default ModelNotFound;
