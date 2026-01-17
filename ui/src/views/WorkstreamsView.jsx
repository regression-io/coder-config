import React, { useState, useEffect } from 'react';
import {
  Layers, Plus, Trash2, RefreshCw, Check, Edit2, Save, X,
  FolderPlus, FolderMinus, ChevronDown, ChevronRight, Play,
  Loader2, FileText, AlertCircle, CheckCircle2, Download
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import api from "@/lib/api";

export default function WorkstreamsView({ projects = [], onWorkstreamChange }) {
  const [workstreams, setWorkstreams] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingWorkstream, setEditingWorkstream] = useState(null);
  const [addProjectDialogOpen, setAddProjectDialogOpen] = useState(false);
  const [selectedWorkstreamForProject, setSelectedWorkstreamForProject] = useState(null);

  // Form states
  const [newName, setNewName] = useState('');
  const [newRules, setNewRules] = useState('');
  const [saving, setSaving] = useState(false);

  // Hook status
  const [hookStatus, setHookStatus] = useState({ isInstalled: false, loading: true });
  const [installingHook, setInstallingHook] = useState(false);

  useEffect(() => {
    loadWorkstreams();
    loadHookStatus();
  }, []);

  const loadHookStatus = async () => {
    try {
      const status = await api.getWorkstreamHookStatus();
      setHookStatus({ ...status, loading: false });
    } catch (error) {
      setHookStatus({ isInstalled: false, loading: false, error: error.message });
    }
  };

  const handleInstallHook = async () => {
    setInstallingHook(true);
    try {
      const result = await api.installWorkstreamHook();
      if (result.success) {
        toast.success(result.message);
        setHookStatus(prev => ({ ...prev, isInstalled: true }));
      } else {
        toast.error(result.error || 'Failed to install hook');
      }
    } catch (error) {
      toast.error('Failed to install hook: ' + error.message);
    } finally {
      setInstallingHook(false);
    }
  };

  const loadWorkstreams = async () => {
    try {
      setLoading(true);
      const data = await api.getWorkstreams();
      setWorkstreams(data.workstreams || []);
      setActiveId(data.activeId);
    } catch (error) {
      toast.error('Failed to load workstreams');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      const result = await api.createWorkstream(newName.trim(), [], newRules);
      if (result.success) {
        setWorkstreams(prev => [...prev, result.workstream]);
        if (!activeId) {
          setActiveId(result.workstream.id);
        }
        toast.success(`Created workstream: ${newName}`);
        setCreateDialogOpen(false);
        setNewName('');
        setNewRules('');
      } else {
        toast.error(result.error || 'Failed to create workstream');
      }
    } catch (error) {
      toast.error('Failed to create workstream: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (workstream) => {
    try {
      const result = await api.setActiveWorkstream(workstream.id);
      if (result.success) {
        setActiveId(workstream.id);
        toast.success(`Switched to: ${workstream.name}`);
        onWorkstreamChange?.(result.workstream);
      } else {
        toast.error(result.error || 'Failed to switch workstream');
      }
    } catch (error) {
      toast.error('Failed to switch workstream: ' + error.message);
    }
  };

  const handleDelete = async (workstream) => {
    if (!confirm(`Delete workstream "${workstream.name}"?\n\nThis cannot be undone.`)) {
      return;
    }

    try {
      const result = await api.deleteWorkstream(workstream.id);
      if (result.success) {
        setWorkstreams(prev => prev.filter(ws => ws.id !== workstream.id));
        if (activeId === workstream.id) {
          setActiveId(workstreams.find(ws => ws.id !== workstream.id)?.id || null);
        }
        toast.success(`Deleted workstream: ${workstream.name}`);
      } else {
        toast.error(result.error || 'Failed to delete workstream');
      }
    } catch (error) {
      toast.error('Failed to delete workstream: ' + error.message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingWorkstream) return;

    setSaving(true);
    try {
      const result = await api.updateWorkstream(editingWorkstream.id, {
        name: editingWorkstream.name,
        rules: editingWorkstream.rules,
      });
      if (result.success) {
        setWorkstreams(prev => prev.map(ws =>
          ws.id === editingWorkstream.id ? result.workstream : ws
        ));
        toast.success('Workstream updated');
        setEditingWorkstream(null);
      } else {
        toast.error(result.error || 'Failed to update workstream');
      }
    } catch (error) {
      toast.error('Failed to update workstream: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddProject = async (projectPath) => {
    if (!selectedWorkstreamForProject) return;

    try {
      const result = await api.addProjectToWorkstream(selectedWorkstreamForProject.id, projectPath);
      if (result.success) {
        setWorkstreams(prev => prev.map(ws =>
          ws.id === selectedWorkstreamForProject.id ? result.workstream : ws
        ));
        toast.success(`Added project to ${selectedWorkstreamForProject.name}`);
      } else {
        toast.error(result.error || 'Failed to add project');
      }
    } catch (error) {
      toast.error('Failed to add project: ' + error.message);
    }
    setAddProjectDialogOpen(false);
    setSelectedWorkstreamForProject(null);
  };

  const handleRemoveProject = async (workstream, projectPath) => {
    try {
      const result = await api.removeProjectFromWorkstream(workstream.id, projectPath);
      if (result.success) {
        setWorkstreams(prev => prev.map(ws =>
          ws.id === workstream.id ? result.workstream : ws
        ));
        toast.success(`Removed project from ${workstream.name}`);
      } else {
        toast.error(result.error || 'Failed to remove project');
      }
    } catch (error) {
      toast.error('Failed to remove project: ' + error.message);
    }
  };

  const getBasename = (p) => {
    return p.split('/').pop() || p;
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
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Workstreams</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Context sets for multi-project workflows
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadWorkstreams} size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            New Workstream
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4 text-sm text-purple-700 dark:text-purple-400">
        <p className="font-medium mb-1">What are Workstreams?</p>
        <p>
          Workstreams group related projects and inject context rules into Claude.
          When active, your workstream's rules are automatically prepended to every Claude session.
        </p>
      </div>

      {/* Workstreams List */}
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {workstreams.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-slate-600" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Workstreams Yet</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
              Create your first workstream to organize multi-project contexts.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Workstream
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {workstreams.map(ws => (
              <div key={ws.id} className="group">
                {/* Workstream Header */}
                <div
                  className={`p-4 flex items-center gap-4 transition-colors cursor-pointer ${
                    ws.id === activeId
                      ? 'bg-purple-50 dark:bg-purple-950/30'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-900'
                  }`}
                  onClick={() => setExpandedId(expandedId === ws.id ? null : ws.id)}
                >
                  {/* Expand Icon */}
                  <div className="w-5 h-5 flex items-center justify-center text-gray-400">
                    {expandedId === ws.id ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>

                  {/* Status Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    ws.id === activeId
                      ? 'bg-purple-100 dark:bg-purple-900/50'
                      : 'bg-gray-100 dark:bg-slate-800'
                  }`}>
                    {ws.id === activeId ? (
                      <Check className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <Layers className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-medium truncate ${
                        ws.id === activeId ? 'text-purple-700 dark:text-purple-400' : 'text-gray-900 dark:text-white'
                      }`}>
                        {ws.name}
                      </h3>
                      {ws.id === activeId && (
                        <span className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded">
                          Active
                        </span>
                      )}
                      {ws.projects?.length > 0 && (
                        <span className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                          {ws.projects.length} project{ws.projects.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {ws.rules && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                          <FileText className="w-3 h-3 inline mr-0.5" />
                          Rules
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-slate-400 truncate">
                      {ws.projects?.length > 0
                        ? ws.projects.map(p => getBasename(p)).join(', ')
                        : 'No projects added'
                      }
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {ws.id !== activeId && (
                      <Button
                        size="sm"
                        onClick={() => handleActivate(ws)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Activate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingWorkstream({ ...ws })}
                      className="text-gray-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400"
                      title="Edit workstream"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(ws)}
                      className="text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                      title="Delete workstream"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedId === ws.id && (
                  <div className="px-4 pb-4 pl-16 space-y-4 bg-gray-50/50 dark:bg-slate-900/50">
                    {/* Projects */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300">Projects</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedWorkstreamForProject(ws);
                            setAddProjectDialogOpen(true);
                          }}
                        >
                          <FolderPlus className="w-4 h-4 mr-1" />
                          Add Project
                        </Button>
                      </div>
                      {ws.projects?.length > 0 ? (
                        <div className="space-y-1">
                          {ws.projects.map(p => (
                            <div
                              key={p}
                              className="flex items-center justify-between py-1.5 px-3 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700"
                            >
                              <span className="text-sm font-mono text-gray-700 dark:text-slate-300 truncate">
                                {p.replace(/^\/Users\/[^/]+/, '~')}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveProject(ws, p)}
                                className="text-gray-400 hover:text-red-500 h-6 w-6 p-0"
                              >
                                <FolderMinus className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-slate-400 italic">
                          No projects added yet. Add projects to help organize your workstream.
                        </p>
                      )}
                    </div>

                    {/* Rules Preview */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Rules</h4>
                      {ws.rules ? (
                        <pre className="text-sm text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700 p-3 overflow-auto max-h-40 whitespace-pre-wrap">
                          {ws.rules}
                        </pre>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-slate-400 italic">
                          No rules defined. Click Edit to add context rules for this workstream.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hook Status */}
      {hookStatus.isInstalled ? (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 text-sm text-green-700 dark:text-green-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Hook Installed</p>
              <p className="text-green-600 dark:text-green-500">
                Workstream rules will be automatically injected into every Claude session.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-700 dark:text-amber-400">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium mb-1">Hook Integration Required</p>
              <p className="mb-3">
                Install the pre-prompt hook to automatically inject workstream rules into every Claude session.
              </p>
              <Button
                onClick={handleInstallHook}
                disabled={installingHook || hookStatus.loading}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {installingHook ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Install Hook Automatically
              </Button>
              <p className="text-xs mt-2 text-amber-600 dark:text-amber-500">
                This will create/update <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">~/.claude/hooks/pre-prompt.sh</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CLI Hint */}
      <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 border border-transparent dark:border-slate-800">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">CLI Commands</h4>
        <div className="space-y-1 text-sm text-gray-600 dark:text-slate-400 font-mono">
          <p>claude-config workstream                  # List workstreams</p>
          <p>claude-config workstream create "Name"   # Create workstream</p>
          <p>claude-config workstream use "Name"      # Activate workstream</p>
          <p>claude-config workstream inject          # Output active rules</p>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              Create Workstream
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">
                Name
              </label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g., User Auth, Admin Dashboard"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">
                Rules (optional)
              </label>
              <Textarea
                value={newRules}
                onChange={e => setNewRules(e.target.value)}
                placeholder="Context rules for this workstream. These will be injected into every Claude session when this workstream is active."
                rows={6}
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Example: "Focus on user authentication. Use JWT tokens. React Query for state management."
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !newName.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingWorkstream} onOpenChange={(open) => !open && setEditingWorkstream(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-purple-600" />
              Edit Workstream
            </DialogTitle>
          </DialogHeader>
          {editingWorkstream && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">
                  Name
                </label>
                <Input
                  value={editingWorkstream.name}
                  onChange={e => setEditingWorkstream(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">
                  Rules
                </label>
                <Textarea
                  value={editingWorkstream.rules || ''}
                  onChange={e => setEditingWorkstream(prev => ({ ...prev, rules: e.target.value }))}
                  placeholder="Context rules for this workstream..."
                  rows={8}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingWorkstream(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Project Dialog */}
      <Dialog open={addProjectDialogOpen} onOpenChange={setAddProjectDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-purple-600" />
              Add Project to {selectedWorkstreamForProject?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
              Select a registered project to add to this workstream:
            </p>
            {projects.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {projects
                  .filter(p => !selectedWorkstreamForProject?.projects?.includes(p.path))
                  .map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleAddProject(p.path)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
                      <div className="text-sm text-gray-500 dark:text-slate-400 font-mono truncate">
                        {p.path.replace(/^\/Users\/[^/]+/, '~')}
                      </div>
                    </button>
                  ))}
                {projects.filter(p => !selectedWorkstreamForProject?.projects?.includes(p.path)).length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
                    All registered projects are already in this workstream.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
                No projects registered. Add projects in the Projects view first.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddProjectDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
