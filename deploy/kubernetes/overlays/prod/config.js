// Runtime settings for the prod dashboard, served as /lume-visual-dashboard/config.js.
// Changing this file rolls the pod (the ConfigMap name is content-hashed); no image rebuild needed.
// The repo is public and this file is served to every browser: public values only.
window.__LUME_DASHBOARD_CONFIG__ = {
  // Planned prod lume-model-api, on the same host as the dashboard (not deployed yet).
  lumeApiBaseUrl: 'https://ard-modeling-service.slac.stanford.edu/lume-model-api',
  // The lume-canopy Deployment in this namespace (base/canopy.yaml).
  canopyApiBaseUrl: 'https://ard-modeling-service.slac.stanford.edu/lume-canopy',
  // canopyApiKey is set by canopy-key.js, mounted from a Secret (see secrets.example.yaml).
};
