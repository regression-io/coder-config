import React, { useState, useEffect } from 'react';
import {
  Layers, Plus, Trash2, RefreshCw, Check, Edit2, Save, X,
  FolderPlus, FolderMinus, ChevronDown, ChevronRight,
  Loader2, FileText, AlertCircle, CheckCircle2, Download,
  Activity, Sparkles, BarChart3, Zap, HelpCircle, Wand2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import api from "@/lib/api";

export default function WorkstreamsView({ projects = [], onWorkstreamChange }) {
  const [workstreams, setWorkstreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingWorkstream, setEditingWorkstream] = useState(null);
  const [addProjectDialogOpen, setAddProjectDialogOpen] = useState(false);
  const [selectedWorkstreamForProject, setSelectedWorkstreamForProject] = useState(null);
  const [selectedProjectsToAdd, setSelectedProjectsToAdd] = useState(new Set());

  // Form states
  const [newName, setNewName] = useState('');
  const [newRules, setNewRules] = useState('');
  const [newProjects, setNewProjects] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  // Subprojects state
  const [expandedProjects, setExpandedProjects] = useState({}); // { projectPath: boolean }
  const [subprojectsCache, setSubprojectsCache] = useState({}); // { projectPath: subprojects[] }
  const [loadingSubprojects, setLoadingSubprojects] = useState({});

  // Hook status
  const [hookStatus, setHookStatus] = useState({ isInstalled: false, loading: true });
  const [installingHook, setInstallingHook] = useState(false);

  // Activity tracking
  const [activitySummary, setActivitySummary] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissedWorkstreamSuggestions') || '[]');
    } catch {
      return [];
    }
  });

  // Generate rules state
  const [generatingRules, setGeneratingRules] = useState(false);
  const [useClaudeForRules, setUseClaudeForRules] = useState(false);

  // CD hook and global settings
  const [cdHookStatus, setCdHookStatus] = useState({ installed: false, loading: true });
  const [globalSettings, setGlobalSettings] = useState({ workstreamAutoActivate: true });
  const [installingCdHook, setInstallingCdHook] = useState(false);

  // Add trigger folder dialog
  const [addTriggerDialogOpen, setAddTriggerDialogOpen] = useState(false);
  const [selectedWorkstreamForTrigger, setSelectedWorkstreamForTrigger] = useState(null);
  const [newTriggerFolder, setNewTriggerFolder] = useState('');

  useEffect(() => {
    loadWorkstreams();
    loadHookStatus();
    loadActivity();
    loadCdHookStatus();
    loadGlobalSettings();
  }, []);

  const loadCdHookStatus = async () => {
    try {
      const status = await api.getCdHookStatus();
      setCdHookStatus({ ...status, loading: false });
    } catch (error) {
      setCdHookStatus({ installed: false, loading: false, error: error.message });
    }
  };

  const loadGlobalSettings = async () => {
    try {
      const result = await api.getWorkstreamSettings();
      setGlobalSettings(result.settings || { workstreamAutoActivate: true });
    } catch (error) {
      console.error('Failed to load global settings:', error);
    }
  };

  const loadHookStatus = async () => {
    try {
      const status = await api.getWorkstreamHookStatus();
      setHookStatus({ ...status, loading: false });
    } catch (error) {
      setHookStatus({ isInstalled: false, loading: false, error: error.message });
    }
  };

  const loadActivity = async () => {
    try {
      setLoadingActivity(true);
      const [summary, suggestionsData] = await Promise.all([
        api.getActivitySummary(),
        api.getWorkstreamSuggestions(),
      ]);
      setActivitySummary(summary);
      setSuggestions(suggestionsData.suggestions || []);
    } catch (error) {
      // Activity tracking may not have data yet, that's OK
      console.log('Activity data not available:', error.message);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleCreateSuggested = (suggestion) => {
    // Pre-fill the create dialog with suggestion data
    setNewName(suggestion.name);
    setNewProjects([...suggestion.projects]);
    setNewRules(
      `# Auto-generated workstream based on activity patterns\n\n` +
      `These projects are frequently worked on together.`
    );
    setCreateDialogOpen(true);
  };

  const handleRemoveNewProject = (projectPath) => {
    setNewProjects(prev => prev.filter(p => p !== projectPath));
  };

  const handleAddNewProject = (projectPath) => {
    if (!newProjects.includes(projectPath)) {
      setNewProjects(prev => [...prev, projectPath]);
    }
  };

  const toggleProjectExpand = async (projectPath) => {
    const isExpanded = expandedProjects[projectPath];

    if (!isExpanded && !subprojectsCache[projectPath]) {
      // Load subprojects
      setLoadingSubprojects(prev => ({ ...prev, [projectPath]: true }));
      try {
        const result = await api.getSubprojects(projectPath);
        setSubprojectsCache(prev => ({ ...prev, [projectPath]: result.subprojects || [] }));
      } catch (err) {
        console.error('Failed to load subprojects:', err);
        setSubprojectsCache(prev => ({ ...prev, [projectPath]: [] }));
      } finally {
        setLoadingSubprojects(prev => ({ ...prev, [projectPath]: false }));
      }
    }

    setExpandedProjects(prev => ({ ...prev, [projectPath]: !isExpanded }));
  };

  const handleDismissSuggestion = (suggestion) => {
    const key = suggestion.projects.sort().join('|');
    const newDismissed = [...dismissedSuggestions, key];
    setDismissedSuggestions(newDismissed);
    localStorage.setItem('dismissedWorkstreamSuggestions', JSON.stringify(newDismissed));
    setSuggestions(prev => prev.filter(s => s.projects.sort().join('|') !== key));
    toast.success('Suggestion dismissed');
  };

  // Filter out dismissed suggestions
  const filteredSuggestions = suggestions.filter(s => {
    const key = s.projects.sort().join('|');
    return !dismissedSuggestions.includes(key);
  });

  const handleClearActivity = async () => {
    if (!confirm('Clear activity data older than 30 days?')) return;
    try {
      const result = await api.clearActivity(30);
      if (result.success) {
        toast.success(`Cleared ${result.cleared} old entries`);
        loadActivity();
      }
    } catch (error) {
      toast.error('Failed to clear activity: ' + error.message);
    }
  };

  const handleGenerateRules = async (projects, setRules) => {
    if (!projects || projects.length === 0) {
      toast.error('Add projects first to generate rules');
      return;
    }
    setGeneratingRules(true);
    try {
      const result = await api.generateWorkstreamRules(projects, useClaudeForRules);
      if (result.success && result.rules) {
        setRules(result.rules);
        toast.success(useClaudeForRules ? 'Generated rules with Claude' : 'Generated rules from repos');
      } else {
        toast.error(result.error || 'Failed to generate rules');
      }
    } catch (error) {
      toast.error('Failed to generate rules: ' + error.message);
    } finally {
      setGeneratingRules(false);
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

  const handleInstallCdHook = async () => {
    setInstallingCdHook(true);
    try {
      const result = await api.installCdHook();
      if (result.success) {
        toast.success('CD hook installed. Restart your shell to activate.');
        setCdHookStatus(prev => ({ ...prev, installed: true }));
      } else {
        toast.error(result.error || 'Failed to install CD hook');
      }
    } catch (error) {
      toast.error('Failed to install CD hook: ' + error.message);
    } finally {
      setInstallingCdHook(false);
    }
  };

  const handleUninstallCdHook = async () => {
    setInstallingCdHook(true);
    try {
      const result = await api.uninstallCdHook();
      if (result.success) {
        toast.success('CD hook uninstalled. Restart your shell to apply.');
        setCdHookStatus(prev => ({ ...prev, installed: false }));
      } else {
        toast.error(result.error || 'Failed to uninstall CD hook');
      }
    } catch (error) {
      toast.error('Failed to uninstall CD hook: ' + error.message);
    } finally {
      setInstallingCdHook(false);
    }
  };

  const handleToggleGlobalAutoActivate = async () => {
    const newValue = !globalSettings.workstreamAutoActivate;
    try {
      await api.setGlobalAutoActivate(newValue);
      setGlobalSettings(prev => ({ ...prev, workstreamAutoActivate: newValue }));
      toast.success(`Auto-activation ${newValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update setting: ' + error.message);
    }
  };

  const handleToggleWorkstreamAutoActivate = async (ws, value) => {
    try {
      const result = await api.setWorkstreamAutoActivate(ws.id, value);
      if (result.success) {
        setWorkstreams(prev => prev.map(w =>
          w.id === ws.id ? { ...w, autoActivate: value === 'default' ? undefined : value === 'on' } : w
        ));
        toast.success(`Auto-activate ${value} for ${ws.name}`);
      }
    } catch (error) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  const handleAddTriggerFolder = async () => {
    if (!selectedWorkstreamForTrigger || !newTriggerFolder.trim()) return;
    try {
      const result = await api.addTriggerFolder(selectedWorkstreamForTrigger.id, newTriggerFolder.trim());
      if (result.success) {
        setWorkstreams(prev => prev.map(w =>
          w.id === selectedWorkstreamForTrigger.id ? result.workstream : w
        ));
        toast.success('Trigger folder added');
        setAddTriggerDialogOpen(false);
        setNewTriggerFolder('');
        setSelectedWorkstreamForTrigger(null);
      }
    } catch (error) {
      toast.error('Failed to add trigger folder: ' + error.message);
    }
  };

  const handleRemoveTriggerFolder = async (ws, folderPath) => {
    try {
      const result = await api.removeTriggerFolder(ws.id, folderPath);
      if (result.success) {
        setWorkstreams(prev => prev.map(w =>
          w.id === ws.id ? result.workstream : w
        ));
        toast.success('Trigger folder removed');
      }
    } catch (error) {
      toast.error('Failed to remove trigger folder: ' + error.message);
    }
  };

  const loadWorkstreams = async () => {
    try {
      setLoading(true);
      const data = await api.getWorkstreams();
      setWorkstreams(data.workstreams || []);
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
      const result = await api.createWorkstream(newName.trim(), newProjects, newRules);
      if (result.success) {
        setWorkstreams(prev => [...prev, result.workstream]);
        toast.success(`Created workstream: ${newName}`);
        setCreateDialogOpen(false);
        setNewName('');
        setNewRules('');
        setNewProjects([]);
        // Remove from suggestions if this was from a suggestion
        setSuggestions(prev => prev.filter(s => s.name !== newName.trim()));
      } else {
        toast.error(result.error || 'Failed to create workstream');
      }
    } catch (error) {
      toast.error('Failed to create workstream: ' + error.message);
    } finally {
      setSaving(false);
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
        projects: editingWorkstream.projects || [],
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

  // Toggle project selection in Add Project dialog
  const toggleProjectSelection = (projectPath) => {
    setSelectedProjectsToAdd(prev => {
      const next = new Set(prev);
      if (next.has(projectPath)) {
        next.delete(projectPath);
      } else {
        next.add(projectPath);
      }
      return next;
    });
  };

  // Add all selected projects to workstream
  const handleAddSelectedProjects = async () => {
    if (!selectedWorkstreamForProject || selectedProjectsToAdd.size === 0) return;

    setSaving(true);
    let successCount = 0;
    let lastWorkstream = null;

    for (const projectPath of selectedProjectsToAdd) {
      try {
        const result = await api.addProjectToWorkstream(selectedWorkstreamForProject.id, projectPath);
        if (result.success) {
          lastWorkstream = result.workstream;
          successCount++;
        }
      } catch (error) {
        console.error('Failed to add project:', projectPath, error);
      }
    }

    if (lastWorkstream) {
      setWorkstreams(prev => prev.map(ws =>
        ws.id === selectedWorkstreamForProject.id ? lastWorkstream : ws
      ));
    }

    if (successCount > 0) {
      toast.success(`Added ${successCount} project${successCount > 1 ? 's' : ''} to ${selectedWorkstreamForProject.name}`);
    } else {
      toast.error('Failed to add projects');
    }

    setSaving(false);
    setAddProjectDialogOpen(false);
    setSelectedWorkstreamForProject(null);
    setSelectedProjectsToAdd(new Set());
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

  // Check if a project is already in another workstream
  const getProjectWorkstream = (projectPath, excludeWorkstreamId = null) => {
    return workstreams.find(ws =>
      ws.id !== excludeWorkstreamId && ws.projects?.includes(projectPath)
    );
  };

  // Count how many workstreams include a project
  const countWorkstreamsForProject = (projectPath) => {
    return workstreams.filter(ws => ws.projects?.includes(projectPath)).length;
  };

  // Get badge text: "in use" if in 1 workstream, "shared" if in 2+
  const getProjectBadge = (projectPath, currentWorkstreamId = null) => {
    const count = countWorkstreamsForProject(projectPath);
    // If we're in a dialog for a specific workstream, check if project is already added to it
    const isInCurrent = currentWorkstreamId
      ? workstreams.find(ws => ws.id === currentWorkstreamId)?.projects?.includes(projectPath)
      : false;

    if (count === 0) return null;
    if (count === 1) return isInCurrent ? null : 'in use';
    return 'shared'; // count >= 2
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
        <p>
          <strong>Workstreams</strong> let you group related repos together so Claude sees them as one cohesive project. Perfect for microservices, monorepos, or any multi-repo setup where context matters. Your custom rules and context persist across sessions, and Claude stays scoped to only the directories you specify.
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
                  className="p-4 flex items-center gap-4 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900"
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
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-slate-800">
                    <Layers className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate text-gray-900 dark:text-white">
                        {ws.name}
                      </h3>
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

                    {/* Trigger Folders */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300">Trigger Folders</h4>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs text-xs">
                                  Additional folders that activate this workstream when you cd into them.
                                  Projects are always trigger folders automatically.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedWorkstreamForTrigger(ws);
                            setAddTriggerDialogOpen(true);
                          }}
                        >
                          <FolderPlus className="w-4 h-4 mr-1" />
                          Add Folder
                        </Button>
                      </div>
                      {ws.triggerFolders?.length > 0 ? (
                        <div className="space-y-1">
                          {ws.triggerFolders.map(f => (
                            <div
                              key={f}
                              className="flex items-center justify-between py-1.5 px-3 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700"
                            >
                              <span className="text-sm font-mono text-gray-700 dark:text-slate-300 truncate">
                                {f.replace(/^\/Users\/[^/]+/, '~')}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveTriggerFolder(ws, f)}
                                className="text-gray-400 hover:text-red-500 h-6 w-6 p-0"
                              >
                                <FolderMinus className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-slate-400 italic">
                          No extra trigger folders. Projects auto-trigger this workstream.
                        </p>
                      )}
                    </div>

                    {/* Auto-Activate Setting */}
                    <div className="flex items-center justify-between py-2 px-3 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Auto-Activate on cd</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            {ws.autoActivate === true ? 'On' : ws.autoActivate === false ? 'Off' : 'Default'}
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleToggleWorkstreamAutoActivate(ws, 'on')}>
                            <Check className={`w-4 h-4 mr-2 ${ws.autoActivate === true ? 'opacity-100' : 'opacity-0'}`} />
                            On
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleWorkstreamAutoActivate(ws, 'off')}>
                            <Check className={`w-4 h-4 mr-2 ${ws.autoActivate === false ? 'opacity-100' : 'opacity-0'}`} />
                            Off
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleWorkstreamAutoActivate(ws, 'default')}>
                            <Check className={`w-4 h-4 mr-2 ${ws.autoActivate === undefined ? 'opacity-100' : 'opacity-0'}`} />
                            Default ({globalSettings.workstreamAutoActivate ? 'On' : 'Off'})
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300">Hook Integration</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                  <HelpCircle className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-sm">
                  <strong>What are hooks?</strong><br /><br />
                  Hooks are scripts that run automatically at specific points in Claude Code sessions.
                  The workstream hook runs before each prompt and injects your active workstream's rules into the context.<br /><br />
                  <strong>How it works:</strong><br />
                  1. You activate a workstream<br />
                  2. Hook detects the active workstream<br />
                  3. Rules are prepended to Claude's context<br />
                  4. Claude understands your project context
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

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
                <p className="font-medium mb-1">Hook Not Installed</p>
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
                  Install Hook
                </Button>
                <p className="text-xs mt-2 text-amber-600 dark:text-amber-500">
                  Creates <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">~/.claude/hooks/pre-prompt.sh</code>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CD Hook Auto-Activation */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300">Folder Auto-Activation</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="text-sm mb-2">
                  <strong>How it works:</strong>
                </p>
                <ol className="text-xs space-y-1 list-decimal list-inside">
                  <li>Install the CD hook to your shell</li>
                  <li>When you <code className="bg-slate-700 px-1 rounded">cd</code> into a folder matching a workstream, it auto-activates</li>
                  <li>If multiple workstreams match, you'll be prompted to choose</li>
                </ol>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-4">
          {/* Global Setting */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Global Auto-Activate</span>
              <span className="text-xs text-gray-500 dark:text-slate-400">(default for all workstreams)</span>
            </div>
            <Button
              variant={globalSettings.workstreamAutoActivate ? "default" : "outline"}
              size="sm"
              onClick={handleToggleGlobalAutoActivate}
            >
              {globalSettings.workstreamAutoActivate ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          {/* CD Hook Status */}
          {cdHookStatus.installed ? (
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-green-800 dark:text-green-300">CD Hook Installed</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Shell: {cdHookStatus.shell} • RC file: <code className="bg-green-100 dark:bg-green-900/50 px-1 rounded">{cdHookStatus.rcFile?.replace(/^\/Users\/[^/]+/, '~')}</code>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={handleUninstallCdHook}
                  disabled={installingCdHook}
                >
                  {installingCdHook ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Uninstall
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300 mb-1">CD Hook Not Installed</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                  Install the hook to auto-activate workstreams when you cd into matching folders.
                </p>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleInstallCdHook}
                  disabled={installingCdHook || cdHookStatus.loading}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {installingCdHook ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Install CD Hook
                </Button>
                <p className="text-xs mt-2 text-amber-600 dark:text-amber-500">
                  Adds function to <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">~/.zshrc</code> or <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">~/.bashrc</code>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity Insights */}
      {activitySummary && activitySummary.totalSessions > 0 && (
        <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-medium text-gray-900 dark:text-white">Activity Insights</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearActivity}
              className="text-gray-500 dark:text-slate-400 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear Old
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-xs mb-1">
                <BarChart3 className="w-3 h-3" />
                Sessions
              </div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                {activitySummary.totalSessions}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-xs mb-1">
                <FileText className="w-3 h-3" />
                Files Tracked
              </div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                {activitySummary.totalFiles}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-xs mb-1">
                <Layers className="w-3 h-3" />
                Projects Active
              </div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                {activitySummary.projectCount}
              </div>
            </div>
          </div>

          {activitySummary.topProjects?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Most Active Projects</h4>
              <div className="space-y-1">
                {activitySummary.topProjects.slice(0, 5).map((proj, i) => (
                  <div key={proj.path} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-slate-400 truncate" title={proj.path}>
                      {proj.path.split('/').pop()}
                    </span>
                    <span className="text-gray-400 dark:text-slate-500 text-xs">
                      {proj.fileCount} files
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Workstream Suggestions */}
      {filteredSuggestions.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-medium text-indigo-900 dark:text-indigo-300">Suggested Workstreams</h3>
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded">
              Based on activity patterns
            </span>
          </div>
          <p className="text-sm text-indigo-700 dark:text-indigo-400 mb-4">
            These projects are frequently worked on together. Create a workstream to group them?
          </p>
          <div className="space-y-3">
            {filteredSuggestions.map(suggestion => (
              <div
                key={suggestion.name}
                className="bg-white dark:bg-slate-900 rounded-lg border border-indigo-200 dark:border-indigo-800 p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="font-medium text-gray-900 dark:text-white">{suggestion.name}</span>
                    {suggestion.coActivityScore && (
                      <span className="text-xs text-gray-500 dark:text-slate-400">
                        {suggestion.coActivityScore}% co-activity
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismissSuggestion(suggestion)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                      title="Dismiss suggestion"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleCreateSuggested(suggestion)}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Create
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {suggestion.projects.map(p => (
                    <span
                      key={p}
                      className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 px-2 py-0.5 rounded"
                    >
                      {p.split('/').pop()}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CLI Hint */}
      <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 border border-transparent dark:border-slate-800">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">CLI Commands</h4>
        <div className="space-y-1 text-sm text-gray-600 dark:text-slate-400 font-mono">
          <p>coder-config workstream                  # List workstreams</p>
          <p>coder-config workstream use "Name"      # Set workstream for this tab</p>
          <p>coder-config workstream create "Name"   # Create workstream</p>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCreateDialogOpen(false);
          setNewName('');
          setNewRules('');
          setNewProjects([]);
          setShowProjectPicker(false);
          setExpandedProjects({});
        }
      }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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

            {/* Projects Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  Projects
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowProjectPicker(!showProjectPicker)}
                >
                  <FolderPlus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              {newProjects.length > 0 ? (
                <div className="space-y-1 mb-2">
                  {newProjects.map(p => (
                    <div
                      key={p}
                      className="flex items-center justify-between py-1.5 px-3 bg-gray-50 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700"
                    >
                      <span className="text-sm font-mono text-gray-700 dark:text-slate-300 truncate">
                        {p.replace(/^\/Users\/[^/]+/, '~')}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveNewProject(p)}
                        className="text-gray-400 hover:text-red-500 h-6 w-6 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-slate-400 italic mb-2">
                  No projects added. Add projects to help organize your workstream.
                </p>
              )}

              {/* Project Picker with Subprojects */}
              {showProjectPicker && projects.length > 0 && (
                <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-2 max-h-64 overflow-y-auto bg-white dark:bg-slate-900">
                  {projects.map(p => {
                    const badge = getProjectBadge(p.path);
                    const isExpanded = expandedProjects[p.path];
                    const isLoading = loadingSubprojects[p.path];
                    const subprojects = subprojectsCache[p.path] || [];
                    const projectAdded = newProjects.includes(p.path);

                    return (
                      <div key={p.id} className="mb-1">
                        {/* Main project row */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleProjectExpand(p.path)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                            title="Show sub-projects"
                          >
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            ) : isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddNewProject(p.path)}
                            disabled={projectAdded}
                            className={`flex-1 text-left p-2 rounded transition-colors ${
                              projectAdded
                                ? 'bg-purple-50 dark:bg-purple-950/30 opacity-50'
                                : 'hover:bg-purple-50 dark:hover:bg-purple-950/30'
                            }`}
                          >
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                              <div className="flex items-center gap-1">
                                {badge && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                                    badge === 'shared'
                                      ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400'
                                      : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                                  }`}>
                                    {badge}
                                  </span>
                                )}
                                {projectAdded && (
                                  <Check className="w-4 h-4 text-purple-600" />
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-slate-400 font-mono truncate">
                              {p.path.replace(/^\/Users\/[^/]+/, '~')}
                            </div>
                          </button>
                        </div>

                        {/* Subprojects */}
                        {isExpanded && subprojects.length > 0 && (
                          <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-slate-700 pl-2">
                            {subprojects.map(sub => {
                              const subAdded = newProjects.includes(sub.dir);
                              const subBadge = getProjectBadge(sub.dir);
                              return (
                                <button
                                  key={sub.dir}
                                  type="button"
                                  onClick={() => handleAddNewProject(sub.dir)}
                                  disabled={subAdded}
                                  className={`w-full text-left p-2 rounded transition-colors ${
                                    subAdded
                                      ? 'bg-purple-50 dark:bg-purple-950/30 opacity-50'
                                      : 'hover:bg-purple-50 dark:hover:bg-purple-950/30'
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700 dark:text-slate-300">{sub.name}</span>
                                    <div className="flex items-center gap-1">
                                      {subBadge && (
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                                          subBadge === 'shared'
                                            ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400'
                                            : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                                        }`}>
                                          {subBadge}
                                        </span>
                                      )}
                                      {subAdded && (
                                        <Check className="w-4 h-4 text-purple-600" />
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-slate-400 font-mono">
                                    {sub.relativePath}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {isExpanded && subprojects.length === 0 && !isLoading && (
                          <div className="ml-6 mt-1 pl-2 text-xs text-gray-400 dark:text-slate-500 italic">
                            No sub-projects found
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  Context (optional)
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 cursor-pointer">
                    <Checkbox
                      checked={useClaudeForRules}
                      onCheckedChange={setUseClaudeForRules}
                      className="h-3.5 w-3.5"
                    />
                    Use Claude
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleGenerateRules(newProjects, setNewRules)}
                    disabled={generatingRules || newProjects.length === 0}
                    className="text-xs h-7 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                    title={useClaudeForRules ? "Use Claude Code to analyze repos" : "Extract from README, package.json, etc."}
                  >
                    {generatingRules ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Wand2 className="w-3 h-3 mr-1" />
                    )}
                    Generate
                  </Button>
                </div>
              </div>
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
            <Button variant="outline" onClick={() => {
              setCreateDialogOpen(false);
              setNewName('');
              setNewRules('');
              setNewProjects([]);
              setShowProjectPicker(false);
              setExpandedProjects({});
            }}>
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
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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

              {/* Projects Section in Edit */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Projects
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingWorkstream(prev => ({ ...prev, showPicker: !prev.showPicker }))}
                  >
                    <FolderPlus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>

                {editingWorkstream.projects?.length > 0 ? (
                  <div className="space-y-1 mb-2">
                    {editingWorkstream.projects.map(p => (
                      <div
                        key={p}
                        className="flex items-center justify-between py-1.5 px-3 bg-gray-50 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700"
                      >
                        <span className="text-sm font-mono text-gray-700 dark:text-slate-300 truncate">
                          {p.replace(/^\/Users\/[^/]+/, '~')}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingWorkstream(prev => ({
                            ...prev,
                            projects: prev.projects.filter(proj => proj !== p)
                          }))}
                          className="text-gray-400 hover:text-red-500 h-6 w-6 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-slate-400 italic mb-2">
                    No projects in this workstream.
                  </p>
                )}

                {/* Project Picker for Edit with Subprojects */}
                {editingWorkstream.showPicker && projects.length > 0 && (
                  <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-2 max-h-48 overflow-y-auto bg-white dark:bg-slate-900">
                    {projects.map(p => {
                      const isAlreadyAdded = editingWorkstream.projects?.includes(p.path);
                      const badge = getProjectBadge(p.path, editingWorkstream.id);
                      const isExpanded = expandedProjects[p.path];
                      const isLoading = loadingSubprojects[p.path];
                      const subprojects = subprojectsCache[p.path] || [];

                      return (
                        <div key={p.id} className="mb-1">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleProjectExpand(p.path)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                              title="Show sub-projects"
                            >
                              {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                              ) : isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => !isAlreadyAdded && setEditingWorkstream(prev => ({
                                ...prev,
                                projects: [...(prev.projects || []), p.path]
                              }))}
                              disabled={isAlreadyAdded}
                              className={`flex-1 text-left p-2 rounded transition-colors ${
                                isAlreadyAdded
                                  ? 'bg-purple-50 dark:bg-purple-950/30 opacity-50'
                                  : 'hover:bg-purple-50 dark:hover:bg-purple-950/30'
                              }`}
                            >
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                                <div className="flex items-center gap-1">
                                  {badge && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      badge === 'shared'
                                        ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400'
                                        : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                                    }`}>
                                      {badge}
                                    </span>
                                  )}
                                  {isAlreadyAdded && (
                                    <Check className="w-4 h-4 text-purple-600" />
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-slate-400 font-mono truncate">
                                {p.path.replace(/^\/Users\/[^/]+/, '~')}
                              </div>
                            </button>
                          </div>

                          {/* Subprojects */}
                          {isExpanded && subprojects.length > 0 && (
                            <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-slate-700 pl-2">
                              {subprojects.map(sub => {
                                const subAlreadyAdded = editingWorkstream.projects?.includes(sub.dir);
                                const subBadge = getProjectBadge(sub.dir, editingWorkstream.id);
                                return (
                                  <button
                                    key={sub.dir}
                                    type="button"
                                    onClick={() => !subAlreadyAdded && setEditingWorkstream(prev => ({
                                      ...prev,
                                      projects: [...(prev.projects || []), sub.dir]
                                    }))}
                                    disabled={subAlreadyAdded}
                                    className={`w-full text-left p-2 rounded transition-colors ${
                                      subAlreadyAdded
                                        ? 'bg-purple-50 dark:bg-purple-950/30 opacity-50'
                                        : 'hover:bg-purple-50 dark:hover:bg-purple-950/30'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-gray-700 dark:text-slate-300">{sub.name}</span>
                                      <div className="flex items-center gap-1">
                                        {subBadge && (
                                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                                            subBadge === 'shared'
                                              ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400'
                                              : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                                          }`}>
                                            {subBadge}
                                          </span>
                                        )}
                                        {subAlreadyAdded && (
                                          <Check className="w-4 h-4 text-purple-600" />
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-slate-400 font-mono truncate">
                                      {sub.relativePath}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {isExpanded && subprojects.length === 0 && !isLoading && (
                            <div className="ml-6 mt-1 pl-2 text-xs text-gray-400 dark:text-slate-500 italic">
                              No sub-projects found
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Rules
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 cursor-pointer">
                      <Checkbox
                        checked={useClaudeForRules}
                        onCheckedChange={setUseClaudeForRules}
                        className="h-3.5 w-3.5"
                      />
                      Use Claude
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleGenerateRules(
                        editingWorkstream.projects,
                        (rules) => setEditingWorkstream(prev => ({ ...prev, rules }))
                      )}
                      disabled={generatingRules || !editingWorkstream.projects?.length}
                      className="text-xs h-7 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                      title={useClaudeForRules ? "Use Claude Code to analyze repos" : "Extract from README, package.json, etc."}
                    >
                      {generatingRules ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Wand2 className="w-3 h-3 mr-1" />
                      )}
                      Generate
                    </Button>
                  </div>
                </div>
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
      <Dialog open={addProjectDialogOpen} onOpenChange={(open) => {
        setAddProjectDialogOpen(open);
        if (!open) {
          setExpandedProjects({});
          setSelectedProjectsToAdd(new Set());
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-purple-600" />
              Add Project to {selectedWorkstreamForProject?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
              Select projects to add to this workstream (multi-select enabled):
            </p>
            {projects.length > 0 ? (
              <div className="space-y-1 max-h-64 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900">
                {projects.map(p => {
                  const isAlreadyAdded = selectedWorkstreamForProject?.projects?.includes(p.path);
                  const isSelected = selectedProjectsToAdd.has(p.path);
                  const badge = getProjectBadge(p.path, selectedWorkstreamForProject?.id);
                  const isExpanded = expandedProjects[p.path];
                  const isLoading = loadingSubprojects[p.path];
                  const subprojects = subprojectsCache[p.path] || [];

                  return (
                    <div key={p.id} className="mb-1">
                      {/* Main project row */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleProjectExpand(p.path)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                          title="Show sub-projects"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          ) : isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => !isAlreadyAdded && toggleProjectSelection(p.path)}
                          disabled={isAlreadyAdded}
                          className={`flex-1 text-left p-2 rounded transition-colors ${
                            isAlreadyAdded
                              ? 'bg-gray-100 dark:bg-slate-800 opacity-50 cursor-not-allowed'
                              : isSelected
                                ? 'bg-purple-100 dark:bg-purple-950/50 ring-2 ring-purple-500'
                                : 'hover:bg-purple-50 dark:hover:bg-purple-950/30'
                          }`}
                        >
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                isAlreadyAdded
                                  ? 'bg-gray-300 dark:bg-slate-600 border-gray-300 dark:border-slate-600'
                                  : isSelected
                                    ? 'bg-purple-600 border-purple-600'
                                    : 'border-gray-300 dark:border-slate-600'
                              }`}>
                                {(isAlreadyAdded || isSelected) && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {badge && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  badge === 'shared'
                                    ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400'
                                    : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                                }`}>
                                  {badge}
                                </span>
                              )}
                              {isAlreadyAdded && (
                                <span className="text-xs text-gray-500 dark:text-slate-400">added</span>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-400 font-mono truncate ml-6">
                            {p.path.replace(/^\/Users\/[^/]+/, '~')}
                          </div>
                        </button>
                      </div>

                      {/* Subprojects */}
                      {isExpanded && subprojects.length > 0 && (
                        <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-slate-700 pl-2">
                          {subprojects.map(sub => {
                            const subAlreadyAdded = selectedWorkstreamForProject?.projects?.includes(sub.dir);
                            const subIsSelected = selectedProjectsToAdd.has(sub.dir);
                            const subBadge = getProjectBadge(sub.dir, selectedWorkstreamForProject?.id);
                            return (
                              <button
                                key={sub.dir}
                                type="button"
                                onClick={() => !subAlreadyAdded && toggleProjectSelection(sub.dir)}
                                disabled={subAlreadyAdded}
                                className={`w-full text-left p-2 rounded transition-colors ${
                                  subAlreadyAdded
                                    ? 'bg-gray-100 dark:bg-slate-800 opacity-50 cursor-not-allowed'
                                    : subIsSelected
                                      ? 'bg-purple-100 dark:bg-purple-950/50 ring-2 ring-purple-500'
                                      : 'hover:bg-purple-50 dark:hover:bg-purple-950/30'
                                }`}
                              >
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                      subAlreadyAdded
                                        ? 'bg-gray-300 dark:bg-slate-600 border-gray-300 dark:border-slate-600'
                                        : subIsSelected
                                          ? 'bg-purple-600 border-purple-600'
                                          : 'border-gray-300 dark:border-slate-600'
                                    }`}>
                                      {(subAlreadyAdded || subIsSelected) && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className="text-gray-700 dark:text-slate-300">{sub.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {subBadge && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                                        subBadge === 'shared'
                                          ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400'
                                          : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                                      }`}>
                                        {subBadge}
                                      </span>
                                    )}
                                    {subAlreadyAdded && (
                                      <span className="text-xs text-gray-500 dark:text-slate-400">added</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-slate-400 font-mono truncate ml-6">
                                  {sub.relativePath}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {isExpanded && subprojects.length === 0 && !isLoading && (
                        <div className="ml-6 mt-1 pl-2 text-xs text-gray-400 dark:text-slate-500 italic">
                          No sub-projects found
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
                No projects registered. Add projects in the Projects view first.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAddProjectDialogOpen(false);
              setSelectedProjectsToAdd(new Set());
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSelectedProjects}
              disabled={selectedProjectsToAdd.size === 0 || saving}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Selected ({selectedProjectsToAdd.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Trigger Folder Dialog */}
      <Dialog open={addTriggerDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setAddTriggerDialogOpen(false);
          setNewTriggerFolder('');
          setSelectedWorkstreamForTrigger(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Trigger Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Add a folder that will trigger the workstream <strong>{selectedWorkstreamForTrigger?.name}</strong> when you cd into it.
            </p>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">
                Folder Path
              </label>
              <Input
                value={newTriggerFolder}
                onChange={(e) => setNewTriggerFolder(e.target.value)}
                placeholder="~/path/to/folder"
                className="font-mono"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Use absolute path or ~ for home directory
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAddTriggerDialogOpen(false);
              setNewTriggerFolder('');
              setSelectedWorkstreamForTrigger(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddTriggerFolder}
              disabled={!newTriggerFolder.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Add Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
