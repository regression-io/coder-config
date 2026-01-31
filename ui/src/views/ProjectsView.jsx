import React, { useState, useEffect } from 'react';
import {
  FolderOpen, Folder, Plus, Trash2, RefreshCw, Check,
  AlertTriangle, Pencil
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import AddProjectDialog from "@/components/AddProjectDialog";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { Spinner } from "@/components/ui/spinner";
import { useProjectsStore } from "@/stores";
import { useDialog, useAsyncAction } from "@/hooks";

export default function ProjectsView({ onProjectSwitch }) {
  const { projects, loading, fetch: fetchProjects, remove, update } = useProjectsStore();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const editDialog = useDialog();
  const [editName, setEditName] = useState('');

  const { execute: executeUpdate, loading: saving } = useAsyncAction({
    onSuccess: () => {
      toast.success('Project updated');
      editDialog.close();
    },
    onError: (err) => toast.error(err || 'Failed to update project'),
  });

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleEdit = (project) => {
    setEditName(project.name);
    editDialog.open(project);
  };

  const handleSaveEdit = () => {
    if (!editDialog.data || !editName.trim()) return;
    executeUpdate(() => update(editDialog.data.id, { name: editName.trim() }));
  };

  const handleRemove = async (project) => {
    if (!confirm(`Remove "${project.name}" from the registry?\n\nThis won't delete any files.`)) {
      return;
    }
    const result = await remove(project.id);
    if (result.success) {
      toast.success(`Removed project: ${project.name}`);
    } else {
      toast.error(result.error || 'Failed to remove project');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FolderOpen className="w-5 h-5" />}
        iconColor="indigo"
        title="Projects"
        subtitle="Registered projects for quick switching"
        actions={
          <>
            <Button variant="outline" onClick={() => fetchProjects()} size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setAddDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
          </>
        }
      />

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
          <EmptyState
            icon={<Folder className="w-12 h-12" />}
            title="No Projects Yet"
            description="Add your first project to get started with quick switching."
            action={
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Project
              </Button>
            }
          />
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(project)}
                    className="text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                    title="Edit project name"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
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
        onAdded={fetchProjects}
      />

      {/* Edit Project Dialog */}
      <Dialog open={editDialog.isOpen} onOpenChange={editDialog.onOpenChange}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update the project name displayed in the registry.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-foreground">Project Name</label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="My Project"
              className="mt-1"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
            />
            {editDialog.data && (
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                {editDialog.data.path.replace(/^\/Users\/[^/]+/, '~')}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={editDialog.close}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editName.trim()}>
              {saving ? <Spinner size="sm" className="mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
