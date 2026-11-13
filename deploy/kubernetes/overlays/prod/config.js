// Runtime settings for the prod dashboard, served as /lume-visual-dashboard/config.js.
// Changing this file rolls the pod (the ConfigMap name is content-hashed); no image rebuild needed.
// The repo is public and this file is served to every browser: public values only.
window.__LUME_DASHBOARD_CONFIG__ = {
  // TEMPORARY: using the dev lume-model-api for now.
  lumeApiBaseUrl: 'https://ad-accel-online-ml-dev.slac.stanford.edu/lume-model-api',
  // The lume-canopy Deployment in this namespace (base/canopy.yaml).
  canopyApiBaseUrl: 'https://ard-modeling-service.slac.stanford.edu/lume-canopy',
  // canopyApiKey is set by canopy-key.js, mounted from a Secret (see secrets.example.yaml).
};
