import { create } from 'zustand';
import api from '@/lib/api';

const useLoopsStore = create((set, get) => ({
  loops: [],
  activeLoop: null,
  config: {},
  history: [],
  loading: false,
  error: null,

  // Fetch all loops
  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.getLoops();
      set({
        loops: data.loops || [],
        activeLoop: data.activeId ? data.loops?.find(l => l.id === data.activeId) : null,
        config: data.config || {},
        loading: false
      });
      return data.loops || [];
    } catch (error) {
      set({ error: error.message, loading: false });
      return [];
    }
  },

  // Fetch a specific loop
  fetchOne: async (id) => {
    try {
      const data = await api.getLoop(id);
      if (data.loop) {
        set(state => ({
          loops: state.loops.map(l => l.id === id ? data.loop : l)
        }));
        return data;
      }
      return { error: data.error };
    } catch (error) {
      return { error: error.message };
    }
  },

  // Create a loop
  create: async (task, options = {}) => {
    try {
      const result = await api.createLoop({ task, ...options });
      if (result.loop) {
        set(state => ({
          loops: [...state.loops, result.loop]
        }));
        return { success: true, loop: result.loop };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Update a loop
  update: async (id, updates) => {
    try {
      const result = await api.updateLoop(id, updates);
      if (result.loop) {
        set(state => ({
          loops: state.loops.map(l => l.id === id ? result.loop : l),
          activeLoop: state.activeLoop?.id === id ? result.loop : state.activeLoop
        }));
        return { success: true, loop: result.loop };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Delete a loop
  delete: async (id) => {
    try {
      const result = await api.deleteLoop(id);
      if (result.success) {
        set(state => ({
          loops: state.loops.filter(l => l.id !== id),
          activeLoop: state.activeLoop?.id === id ? null : state.activeLoop
        }));
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Start a loop
  start: async (id) => {
    try {
      const result = await api.startLoop(id);
      if (result.loop) {
        set(state => ({
          loops: state.loops.map(l => l.id === id ? result.loop : l),
          activeLoop: result.loop
        }));
        return { success: true, loop: result.loop };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Pause a loop
  pause: async (id) => {
    try {
      const result = await api.pauseLoop(id);
      if (result.loop) {
        set(state => ({
          loops: state.loops.map(l => l.id === id ? result.loop : l),
          activeLoop: state.activeLoop?.id === id ? result.loop : state.activeLoop
        }));
        return { success: true, loop: result.loop };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Cancel a loop
  cancel: async (id) => {
    try {
      const result = await api.cancelLoop(id);
      if (result.loop) {
        set(state => ({
          loops: state.loops.map(l => l.id === id ? result.loop : l),
          activeLoop: state.activeLoop?.id === id ? null : state.activeLoop
        }));
        return { success: true, loop: result.loop };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Complete a loop
  complete: async (id) => {
    try {
      const result = await api.completeLoop(id);
      if (result.loop) {
        set(state => ({
          loops: state.loops.filter(l => l.id !== id),
          activeLoop: state.activeLoop?.id === id ? null : state.activeLoop
        }));
        return { success: true, loop: result.loop };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Fetch history
  fetchHistory: async () => {
    try {
      const data = await api.getLoopHistory();
      set({ history: data.history || [] });
      return data.history || [];
    } catch (error) {
      return [];
    }
  },

  // Update config
  updateConfig: async (updates) => {
    try {
      const result = await api.updateLoopConfig(updates);
      if (result.config) {
        set({ config: result.config });
        return { success: true, config: result.config };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Set active loop (local only, for UI state)
  setActiveLoop: (loop) => {
    set({ activeLoop: loop });
  },

  // Clear active loop
  clearActiveLoop: () => {
    set({ activeLoop: null });
  },
}));

export default useLoopsStore;
