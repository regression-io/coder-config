import { create } from 'zustand';
import api from '@/lib/api';

const useWorkstreamsStore = create((set, get) => ({
  workstreams: [],
  activeId: null, // Just the ID, not the full object
  loading: false,
  error: null,

  // Fetch all workstreams
  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.getWorkstreams();
      set({
        workstreams: data.workstreams || [],
        activeId: data.activeId || null,
        loading: false
      });
      return data.workstreams || [];
    } catch (error) {
      set({ error: error.message, loading: false });
      return [];
    }
  },

  // Get the active workstream object (computed)
  getActiveWorkstream: () => {
    const { workstreams, activeId } = get();
    return activeId ? workstreams.find(ws => ws.id === activeId) : null;
  },

  // Create a workstream
  create: async (name, projects = [], rules = '') => {
    try {
      const result = await api.createWorkstream({ name, projects, rules });
      if (result.success || result.workstream) {
        set(state => ({
          workstreams: [...state.workstreams, result.workstream]
        }));
        return { success: true, workstream: result.workstream };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Update a workstream
  update: async (id, updates) => {
    try {
      const result = await api.updateWorkstream(id, updates);
      if (result.success || result.workstream) {
        set(state => ({
          workstreams: state.workstreams.map(ws =>
            ws.id === id ? { ...ws, ...result.workstream } : ws
          )
        }));
        return { success: true, workstream: result.workstream };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Delete a workstream
  delete: async (id) => {
    try {
      const result = await api.deleteWorkstream(id);
      if (result.success) {
        set(state => ({
          workstreams: state.workstreams.filter(ws => ws.id !== id),
          activeId: state.activeId === id ? null : state.activeId
        }));
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Set active workstream
  setActive: async (id) => {
    try {
      const result = await api.setActiveWorkstream(id);
      if (result.success) {
        set({ activeId: id });
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Add project to workstream
  addProject: async (workstreamId, projectPath) => {
    try {
      const result = await api.addProjectToWorkstream(workstreamId, projectPath);
      if (result.success) {
        set(state => ({
          workstreams: state.workstreams.map(ws =>
            ws.id === workstreamId
              ? { ...ws, projects: [...(ws.projects || []), projectPath] }
              : ws
          )
        }));
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Remove project from workstream
  removeProject: async (workstreamId, projectPath) => {
    try {
      const result = await api.removeProjectFromWorkstream(workstreamId, projectPath);
      if (result.success) {
        set(state => ({
          workstreams: state.workstreams.map(ws =>
            ws.id === workstreamId
              ? { ...ws, projects: (ws.projects || []).filter(p => p !== projectPath) }
              : ws
          )
        }));
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get workstreams containing a project
  getWorkstreamsForProject: (projectPath) => {
    return get().workstreams.filter(ws => ws.projects?.includes(projectPath));
  },

  // Count workstreams containing a project
  countWorkstreamsForProject: (projectPath) => {
    return get().getWorkstreamsForProject(projectPath).length;
  },
}));

export default useWorkstreamsStore;
