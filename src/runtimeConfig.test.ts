import { afterEach, describe, expect, it } from 'vitest';
import { getCanopyApiKey, getCanopyBaseUrl, isCanopyConfigured } from './api/canopy/client';
import { getBaseUrl } from './api/client';
import { CANOPY_TEST_API_KEY, CANOPY_TEST_BASE_URL, TEST_BASE_URL } from './test/server';

afterEach(() => {
  delete window.__LUME_DASHBOARD_CONFIG__;
});

describe('runtime config', () => {
  it('falls back to the VITE_* variables when config.js sets nothing', () => {
    window.__LUME_DASHBOARD_CONFIG__ = {};
    expect(getBaseUrl()).toBe(TEST_BASE_URL);
    expect(getCanopyBaseUrl()).toBe(CANOPY_TEST_BASE_URL);
    expect(getCanopyApiKey()).toBe(CANOPY_TEST_API_KEY);
    expect(isCanopyConfigured()).toBe(true);
  });

  it('overrides the build-time settings', () => {
    window.__LUME_DASHBOARD_CONFIG__ = {
      lumeApiBaseUrl: 'https://host/lume-model-api/',
      canopyApiBaseUrl: 'https://host/canopy',
      canopyApiKey: 'read-only',
    };
    expect(getBaseUrl()).toBe('https://host/lume-model-api');
    expect(getCanopyBaseUrl()).toBe('https://host/canopy');
    expect(getCanopyApiKey()).toBe('read-only');
  });

  it('turns Canopy off with a null base URL', () => {
    window.__LUME_DASHBOARD_CONFIG__ = { canopyApiBaseUrl: null };
    expect(isCanopyConfigured()).toBe(false);
  });
});
