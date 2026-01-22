import React, { useState, useEffect } from 'react';
import {
  FolderOpen, Folder, Plus, Trash2, RefreshCw, Check,
  AlertTriangle, Loader2, ExternalLink
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import AddProjectDialog from "@/components/AddProjectDialog";

export default function ProjectsView({ onProjectSwitch }) {
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await api.getProjects();
      setProjects(data.projects || []);
      setActiveProjectId(data.activeProjectId);
    } catch (error) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async (projectId) => {
    setSwitching(projectId);
    try {
      const result = await api.setActiveProject(projectId);
      if (result.success) {
        setActiveProjectId(projectId);
        setProjects(prev => prev.map(p => ({
          ...p,
          isActive: p.id === projectId
        })));
        toast.success(`Switched to ${result.project.name}`);
        onProjectSwitch?.(result);
      } else {
        toast.error(result.error || 'Failed to switch project');
      }
    } catch (error) {
      toast.error('Failed to switch project: ' + error.message);
    } finally {
      setSwitching(null);
    }
  };

  const handleRemove = async (project) => {
    if (!confirm(`Remove "${project.name}" from the registry?\n\nThis won't delete any files.`)) {
      return;
    }

    try {
      const result = await api.removeProject(project.id);
      if (result.success) {
        setProjects(prev => prev.filter(p => p.id !== project.id));
        toast.success(`Removed project: ${project.name}`);
      } else {
        toast.error(result.error || 'Failed to remove project');
      }
    } catch (error) {
      toast.error('Failed to remove project: ' + error.message);
    }
  };

  const handleProjectAdded = (project) => {
    setProjects(prev => [...prev, { ...project, exists: true, hasClaudeConfig: false }]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Projects</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Registered projects for quick switching
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadProjects} size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setAddDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Project
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-700 dark:text-blue-400">
        <p>
          Projects registered here can be quickly switched in the header dropdown.
          The UI will update to show the selected project's configuration.
        </p>
      </div>

      {/* Projects List */}
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {projects.length === 0 ? (
          <div className="p-12 text-center">
            <Folder className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-slate-600" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Projects Yet</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
              Add your first project to get started with quick switching.
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Project
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {projects.map(project => (
              <div
                key={project.id}
                className={`p-4 flex items-center gap-4 transition-colors ${
                  project.isActive ? 'bg-indigo-50 dark:bg-indigo-950/30' : 'hover:bg-gray-50 dark:hover:bg-slate-900'
                }`}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  project.isActive
                    ? 'bg-indigo-100 dark:bg-indigo-900/50'
                    : project.exists
                    ? 'bg-gray-100 dark:bg-slate-800'
                    : 'bg-amber-100 dark:bg-amber-900/30'
                }`}>
                  {project.isActive ? (
                    <Check className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  ) : project.exists ? (
                    <Folder className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-medium truncate ${
                      project.isActive ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-900 dark:text-white'
                    }`}>
                      {project.name}
                    </h3>
                    {project.hasClaudeConfig && (
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
                        .claude
                      </span>
                    )}
                    {project.isActive && (
                      <span className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-slate-400 font-mono truncate">
                    {project.path.replace(/^\/Users\/[^/]+/, '~')}
                  </p>
                  {!project.exists && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Path not found - the directory may have been moved or deleted
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!project.isActive && project.exists && (
                    <Button
                      size="sm"
                      onClick={() => handleSwitch(project.id)}
                      disabled={switching === project.id}
                    >
                      {switching === project.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Select'
                      )}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(project)}
                    className="text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                    title="Remove from registry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CLI Hint */}
      <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 border border-transparent dark:border-slate-800">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">CLI Commands</h4>
        <div className="space-y-1 text-sm text-gray-600 dark:text-slate-400 font-mono">
          <p>coder-config project add [path]        # Add project</p>
          <p>coder-config project remove &lt;name&gt;    # Remove project</p>
          <p>coder-config project                   # List projects</p>
        </div>
      </div>

      {/* Add Project Dialog */}
      <AddProjectDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdded={handleProjectAdded}
      />
    </div>
  );
}
