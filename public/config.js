// Runtime settings, loaded before the app. Empty here, so local dev uses the VITE_* variables
// from .env.local. Deployments replace this file with a ConfigMap (see deploy/kubernetes).
// Keys: lumeApiBaseUrl, canopyApiBaseUrl (null turns Canopy off), canopyApiKey (usually set by
// canopy-key.js instead).
window.__LUME_DASHBOARD_CONFIG__ = {};
