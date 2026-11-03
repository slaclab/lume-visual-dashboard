import { Link } from '@tanstack/react-router';
import { useModels } from '../hooks/useLumeApi';

const ModelSelection = () => {
  const { data: models, isPending, isError, error } = useModels();

  if (isPending) {
    return <div>Loading models…</div>;
  }

  if (isError) {
    return <div role="alert">Failed to load models: {error.message}</div>;
  }

  if (models.length === 0) {
    return <div>No models available.</div>;
  }

  return (
    <ul>
      {models.map((model) => (
        <li key={model.name}>
          <Link to="/models/$modelId" params={{ modelId: model.name }}>
            <strong>{model.name}</strong>
          </Link>{' '}
          <span>v{model.version}</span>
          {model.description && <p>{model.description}</p>}
        </li>
      ))}
    </ul>
  );
};

export default ModelSelection;
