import { create } from 'zustand';
import api from '@/lib/api';

const useProjectsStore = create((set, get) => ({
  projects: [],
  activeProject: null,
  loading: false,
  error: null,

  // Fetch all projects
  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.getProjects();
      const projects = data.projects || [];
      const active = projects.find(p => p.isActive) || null;
      set({ projects, activeProject: active, loading: false });
      return projects;
    } catch (error) {
      set({ error: error.message, loading: false });
      return [];
    }
  },

  // Add a project
  add: async (path, name, runClaudeInit = false) => {
    try {
      const result = await api.addProject(path, name, runClaudeInit);
      if (result.success || result.project) {
        const project = result.project || { path, name, exists: true };
        set(state => ({
          projects: [...state.projects, project]
        }));
        return { success: true, project };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Remove a project
  remove: async (projectId) => {
    try {
      const result = await api.removeProject(projectId);
      if (result.success) {
        set(state => ({
          projects: state.projects.filter(p => p.id !== projectId),
          activeProject: state.activeProject?.id === projectId ? null : state.activeProject
        }));
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Update a project
  update: async (projectId, updates) => {
    try {
      const result = await api.updateProject(projectId, updates);
      if (result.success) {
        set(state => ({
          projects: state.projects.map(p =>
            p.id === projectId ? { ...p, ...result.project } : p
          )
        }));
        return { success: true, project: result.project };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Set active project
  setActive: async (projectId) => {
    try {
      const result = await api.setActiveProject(projectId);
      if (result.success) {
        set(state => ({
          projects: state.projects.map(p => ({
            ...p,
            isActive: p.id === projectId
          })),
          activeProject: result.project
        }));
        return result;
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Clear active project
  clearActive: () => {
    set(state => ({
      projects: state.projects.map(p => ({ ...p, isActive: false })),
      activeProject: null
    }));
  },
}));

export default useProjectsStore;
