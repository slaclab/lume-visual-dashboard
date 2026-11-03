import ModelConfig from './ModelConfig';
import ModelSelection from './ModelSelection';

const DEFAULT_MODEL_NAME = 'cu_hxr_staged';

const Interactive = () => {
  return (
    <div>
      <ModelSelection />
      <ModelConfig name={DEFAULT_MODEL_NAME} />
    </div>
  );
};

export default Interactive;
