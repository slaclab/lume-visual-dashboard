// Runtime settings for the prod dashboard, served as /lume-visual-dashboard/config.js.
// Changing this file rolls the pod (the ConfigMap name is content-hashed); no image rebuild needed.
window.__LUME_DASHBOARD_CONFIG__ = {
  // Planned prod lume-model-api, on the same host as the dashboard (not deployed yet).
  lumeApiBaseUrl: 'https://ard-modeling-service.slac.stanford.edu/lume-model-api',
  // No Canopy instance in the cluster yet. Set its URL (and a read-only canopyApiKey) to enable
  // the Canopy page; the key is sent to the browser.
  canopyApiBaseUrl: null,
};
