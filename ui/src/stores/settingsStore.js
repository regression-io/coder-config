import { create } from 'zustand';
import api from '@/lib/api';

const useSettingsStore = create((set, get) => ({
  // App config (coder-config preferences)
  appConfig: null,
  loading: false,
  error: null,

  // Version info
  version: null,
  latestVersion: null,
  updateAvailable: false,

  // Fetch app config
  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.getConfig();
      set({
        appConfig: data.config || {},
        loading: false
      });
      return data.config;
    } catch (error) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  // Save app config
  save: async (config) => {
    try {
      const result = await api.saveConfig(config);
      if (result.success) {
        set({ appConfig: config });
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Update specific config values
  update: async (updates) => {
    const current = get().appConfig || {};
    const newConfig = { ...current, ...updates };
    return get().save(newConfig);
  },

  // Check for updates
  checkVersion: async () => {
    try {
      const data = await api.checkVersion();
      set({
        version: data.installedVersion,
        latestVersion: data.latestVersion,
        updateAvailable: data.updateAvailable || false
      });
      return data;
    } catch (error) {
      return { error: error.message };
    }
  },

  // Helpers for common config checks
  isFeatureEnabled: (feature) => {
    const config = get().appConfig;
    return config?.experimental?.[feature] === true;
  },

  isToolEnabled: (tool) => {
    const config = get().appConfig;
    const enabledTools = config?.enabledTools || ['claude'];
    return enabledTools.includes(tool);
  },

  getEnabledTools: () => {
    const config = get().appConfig;
    return config?.enabledTools || ['claude'];
  },

  // Set experimental feature
  setExperimentalFeature: async (feature, enabled) => {
    const current = get().appConfig || {};
    const experimental = { ...(current.experimental || {}), [feature]: enabled };
    return get().save({ ...current, experimental });
  },

  // Set enabled tools
  setEnabledTools: async (tools) => {
    const current = get().appConfig || {};
    return get().save({ ...current, enabledTools: tools });
  },
}));

export default useSettingsStore;
