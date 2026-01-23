import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Package, RefreshCw, Rocket, Terminal,
  Folder, FolderOpen, Loader2, Brain, Wand2, Wrench, Shield, Download, Layers, BookOpen, Puzzle, Workflow, GraduationCap, RefreshCcw
} from 'lucide-react';
import FileExplorer from "@/components/FileExplorer";
import ProjectSwitcher from "@/components/ProjectSwitcher";
import WelcomeModal from "@/components/WelcomeModal";
import AddProjectDialog from "@/components/AddProjectDialog";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  PreferencesView,
  ClaudeSettingsView,
  GeminiSettingsView,
  AntigravitySettingsView,
  CodexSettingsView,
  CreateMcpView,
  RegistryView,
  MemoryView,
  ProjectsView,
  DocsView,
  PluginsView,
  WorkstreamsView,
  LoopsView,
  TutorialView
} from "@/views";

const navItems = [
  // Projects section
  { id: 'projects', label: 'All Projects', icon: Layers, section: 'Projects' },
  { id: 'explorer', label: 'Project Explorer', icon: FolderOpen, section: 'Projects' },
  // Tools section (above Configuration)
  { id: 'registry', label: 'MCP Registry', icon: Package, section: 'Tools' },
  { id: 'plugins', label: 'Plugins', icon: Puzzle, section: 'Tools' },
  { id: 'memory', label: 'Memory', icon: Brain, section: 'Tools' },
  { id: 'workstreams', label: 'Workstreams', icon: Workflow, section: 'Tools' },
  { id: 'loops', label: 'Ralph Loops', icon: RefreshCcw, section: 'Tools', isNew: true },
  // Configuration section (tool-specific settings)
  { id: 'claude-settings', label: 'Claude Code', icon: Shield, section: 'Configuration' },
  { id: 'gemini-settings', label: 'Gemini CLI', icon: Terminal, section: 'Configuration' },
  { id: 'codex-settings', label: 'Codex CLI', icon: Terminal, section: 'Configuration', isNew: true },
  { id: 'antigravity-settings', label: 'Antigravity', icon: Rocket, section: 'Configuration' },
  // Developer section
  { id: 'create-mcp', label: 'Create MCP', icon: Wand2, section: 'Developer' },
  // System section
  { id: 'preferences', label: 'Preferences', icon: Wrench, section: 'System' },
  // Help section
  { id: 'tutorial', label: 'Tutorial', icon: GraduationCap, section: 'Help' },
  { id: 'docs', label: 'Docs & Help', icon: BookOpen, section: 'Help' },
];

// Helper to get/set localStorage with JSON
const getStoredState = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(`claude-config-${key}`);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setStoredState = (key, value) => {
  try {
    localStorage.setItem(`claude-config-${key}`, JSON.stringify(value));
  } catch {
    // Ignore storage errors
  }
};

export default function Dashboard() {
  const [currentView, setCurrentView] = useState(() => getStoredState('currentView', 'explorer'));
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState({ dir: '', subprojects: [], hierarchy: [] });
  const [configs, setConfigs] = useState([]);
  const [registry, setRegistry] = useState({ mcpServers: {} });
  const [rules, setRules] = useState([]);
  const [commands, setCommands] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', type: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [fileHashes, setFileHashes] = useState({});
  const [version, setVersion] = useState(null);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [rootProject, setRootProject] = useState(null); // Track root project for sticky subprojects

  // Persist currentView to localStorage
  useEffect(() => {
    setStoredState('currentView', currentView);
  }, [currentView]);

  // Load all data
  const loadData = useCallback(async () => {
    try {
      const [projectData, configsData, registryData, rulesData, commandsData] = await Promise.all([
        api.getProject(),
        api.getConfigs(),
        api.getRegistry(),
        api.getRules(),
        api.getCommands(),
      ]);

      setProject(projectData);
      setConfigs(configsData);
      setRegistry(registryData);
      setRules(rulesData);
      setCommands(commandsData);

      // Select the project-level config by default
      if (configsData.length > 0 && !selectedConfig) {
        setSelectedConfig(configsData[configsData.length - 1]);
      }
    } catch (error) {
      toast.error('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedConfig]);

  // Load projects registry
  const loadProjects = useCallback(async (isInitialLoad = false) => {
    try {
      const data = await api.getProjects();
      setProjects(data.projects || []);
      const active = data.projects?.find(p => p.isActive);
      setActiveProject(active || null);

      // On initial load, set root project from active project's registered path
      if (isInitialLoad && active) {
        // Fetch subprojects from the root project path (not current dir)
        const subData = await api.getSubprojects(active.path);
        setRootProject({ dir: active.path, subprojects: subData.subprojects || [] });
      }

      // On initial load, only show projects view if no active project and no stored view
      if (isInitialLoad && !active) {
        const storedView = getStoredState('currentView', null);
        if (!storedView) {
          setCurrentView('projects');
        }
      }
    } catch (error) {
      // Projects API might not exist in older versions
      console.log('Projects API not available');
    }
  }, []);

  // Handle project switch (from registry - sets root project)
  const handleSwitchProject = async (projectId) => {
    try {
      const result = await api.setActiveProject(projectId);
      if (result.success) {
        setProject({ dir: result.dir, hierarchy: result.hierarchy, subprojects: result.subprojects });
        // Store as root project for sticky subprojects
        setRootProject({ dir: result.dir, subprojects: result.subprojects });
        setActiveProject(result.project);
        setProjects(prev => prev.map(p => ({
          ...p,
          isActive: p.id === projectId
        })));
        await loadData();
        toast.success(`Switched to ${result.project.name}`);
      } else {
        toast.error(result.error || 'Failed to switch project');
      }
    } catch (error) {
      toast.error('Failed to switch project: ' + error.message);
    }
  };

  // Handle project added
  const handleProjectAdded = (newProject) => {
    setProjects(prev => [...prev, { ...newProject, exists: true, hasClaudeConfig: false }]);
  };

  // Initial load
  useEffect(() => {
    loadData();
    loadProjects(true);  // Pass true for initial load to show project selector if no active project

    // Load version info and check for updates
    const checkForUpdates = async () => {
      try {
        const [versionData, configData] = await Promise.all([
          api.checkVersion(),
          api.getConfig()
        ]);

        setVersion(versionData?.installedVersion);

        if (versionData?.updateAvailable && versionData?.updateMethod === 'npm') {
          // Check if auto-update is enabled
          if (configData?.config?.autoUpdate) {
            // Auto-update: trigger update immediately
            toast.info(`Auto-updating to v${versionData.latestVersion}...`);
            setUpdating(true);

            const result = await api.performUpdate({
              updateMethod: versionData.updateMethod,
              targetVersion: versionData.latestVersion
            });

            if (result.success) {
              toast.success(`Updated to v${result.newVersion}! Restarting server...`);
              try { await api.restartServer(); } catch {}

              let attempts = 0;
              const checkServer = setInterval(async () => {
                attempts++;
                try {
                  await api.checkVersion();
                  clearInterval(checkServer);
                  toast.success('Server restarted! Reloading...');
                  setTimeout(() => window.location.reload(), 500);
                } catch {
                  if (attempts > 30) {
                    clearInterval(checkServer);
                    toast.info('Server restarting. Please refresh the page.');
                    setUpdating(false);
                  }
                }
              }, 500);
            } else {
              toast.error('Auto-update failed: ' + result.error);
              setUpdating(false);
              setUpdateInfo(versionData); // Show manual update option
            }
          } else {
            // Manual update: just show the badge
            setUpdateInfo(versionData);
          }
        }
      } catch {}
    };

    checkForUpdates();
  }, []);

  // Handle one-click update
  const handleUpdate = async () => {
    if (!updateInfo?.updateAvailable) return;
    setUpdating(true);
    try {
      const result = await api.performUpdate({
        updateMethod: updateInfo.updateMethod,
        sourcePath: updateInfo.sourcePath,
        targetVersion: updateInfo.latestVersion
      });
      if (result.success) {
        // Show success message and restart the server
        toast.success(`Updated to v${result.newVersion}! Restarting server...`);
        setUpdateInfo(null); // Clear the update badge
        setVersion(result.newVersion);

        // Trigger server restart - server will exit and LaunchAgent/daemon will restart it
        try {
          await api.restartServer();
        } catch {
          // Expected - server exits before response completes
        }

        // Wait for server to come back up, then reload the page
        let attempts = 0;
        const checkServer = setInterval(async () => {
          attempts++;
          try {
            await api.checkVersion();
            clearInterval(checkServer);
            toast.success('Server restarted! Reloading...');
            setTimeout(() => window.location.reload(), 500);
          } catch {
            if (attempts > 30) { // 15 seconds timeout
              clearInterval(checkServer);
              toast.info('Server restarting. Please refresh the page.');
              setUpdating(false);
            }
          }
        }, 500);
      } else {
        toast.error('Update failed: ' + result.error);
        setUpdating(false);
      }
    } catch (error) {
      toast.error('Update failed: ' + error.message);
      setUpdating(false);
    }
  };

  // File change detection polling
  useEffect(() => {
    const checkFileChanges = async () => {
      try {
        const { hashes } = await api.getFileHashes();
        const oldHashes = fileHashes;

        // Check if any hashes changed
        const hasChanges = Object.keys(hashes).some(
          key => oldHashes[key] !== hashes[key]
        ) || Object.keys(oldHashes).some(
          key => !hashes[key]
        );

        if (hasChanges && Object.keys(oldHashes).length > 0) {
          toast.info('Files changed externally, reloading...');
          await loadData();
        }

        setFileHashes(hashes);
      } catch (error) {
        // Ignore polling errors
      }
    };

    const interval = setInterval(checkFileChanges, 2000);
    checkFileChanges(); // Initial check

    return () => clearInterval(interval);
  }, [fileHashes, loadData]);

  // Calculate unique enabled MCPs (not counting duplicates across levels)
  const uniqueEnabledMcps = new Set();
  configs.forEach(c => {
    (c.config?.include || []).forEach(name => uniqueEnabledMcps.add(name));
    Object.keys(c.config?.mcpServers || {}).forEach(name => uniqueEnabledMcps.add(name));
  });

  const badges = {
    mcps: uniqueEnabledMcps.size,
    rules: rules.length,
    commands: commands.length,
  };

  const handleApplyConfig = async () => {
    try {
      const result = await api.applyConfig(project.dir);
      // Show which tools were updated
      if (result.tools) {
        const updated = Object.entries(result.tools)
          .filter(([, success]) => success)
          .map(([tool]) => tool === 'claude' ? 'Claude Code' : 'Antigravity');
        if (updated.length > 0) {
          toast.success(`Config applied to: ${updated.join(', ')}`);
        } else {
          toast.warning('No tools were updated');
        }
      } else {
        toast.success('Configuration applied successfully!');
      }
    } catch (error) {
      toast.error('Failed to apply config: ' + error.message);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await loadData();
    toast.success('Data refreshed');
  };

  const openModal = (title, type, content = '') => {
    setModalContent({ title, type });
    setEditorContent(content);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading configuration...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case 'explorer':
        return <FileExplorer project={project} onRefresh={loadData} />;
      case 'registry':
        return <RegistryView registry={registry} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onUpdate={loadData} />;
      case 'plugins':
        return <PluginsView />;
      case 'memory':
        return <MemoryView project={project} onUpdate={loadData} />;
      case 'create-mcp':
        return <CreateMcpView project={project} />;
      case 'claude-settings':
        return <ClaudeSettingsView />;
      case 'gemini-settings':
        return <GeminiSettingsView />;
      case 'codex-settings':
        return <CodexSettingsView />;
      case 'antigravity-settings':
        return <AntigravitySettingsView />;
      case 'preferences':
        return <PreferencesView />;
      case 'projects':
        return <ProjectsView onProjectSwitch={(result) => {
          setProject({ dir: result.dir, hierarchy: result.hierarchy, subprojects: result.subprojects });
          setRootProject({ dir: result.dir, subprojects: result.subprojects });
          loadData();
          loadProjects();
        }} />;
      case 'workstreams':
        return <WorkstreamsView projects={projects} onWorkstreamChange={(ws) => {
          toast.success(`Switched to workstream: ${ws.name}`);
        }} />;
      case 'loops':
        return <LoopsView workstreams={[]} activeProject={activeProject} />;
      case 'docs':
        return <DocsView />;
      case 'tutorial':
        return <TutorialView />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 bg-card border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg width="22" height="22" viewBox="0 0 128 128">
                  <circle cx="64" cy="64" r="52" fill="none" stroke="white" strokeWidth="10" strokeDasharray="24 12"/>
                  <circle cx="64" cy="64" r="28" fill="white"/>
                  <circle cx="64" cy="64" r="12" fill="#7c3aed"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Coder <span className="text-primary">Config</span>
                </h1>
              </div>
              {updateInfo && (
                <button
                  onClick={handleUpdate}
                  disabled={updating}
                  className="ml-3 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 rounded-full flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {updating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  {updating ? 'Updating...' : `Update to v${updateInfo.latestVersion}`}
                </button>
              )}
            </div>
            <Separator orientation="vertical" className="h-6" />
            <ProjectSwitcher
              projects={projects}
              activeProject={activeProject}
              onSwitch={handleSwitchProject}
              onAddClick={() => setAddProjectOpen(true)}
              onManageClick={() => setCurrentView('projects')}
            />
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleApplyConfig}
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground"
              title="Config auto-applies on save. Click to manually re-apply."
            >
              <Rocket className="w-4 h-4" />
              Re-apply
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 h-[calc(100vh-64px)] border-r border-border bg-card sticky top-16 flex flex-col">
          <ScrollArea className="flex-1 py-4">
            {['Projects', 'Tools', 'Configuration', 'Developer', 'System', 'Help'].map((section) => (
              <div key={section} className="mb-6">
                <h3 className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section}
                </h3>
                <div className="space-y-0.5">
                  {navItems
                    .filter(item => item.section === section)
                    .map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setCurrentView(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200 border-l-2 ${
                          isActive
                            ? 'bg-accent border-primary text-primary font-medium'
                            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}>
                            {badges[item.badge]}
                          </span>
                        )}
                        {item.isNew && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-green-500/20 text-green-600 dark:text-green-400">
                            new
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </ScrollArea>
          {/* Version footer */}
          <div className="px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {version ? `v${version}` : ''}
            </span>
          </div>
        </aside>

        {/* Main Content */}
        <main className={cn(
          "flex-1 overflow-auto",
          ['explorer', 'docs', 'tutorial'].includes(currentView) ? "h-[calc(100vh-64px)]" : "p-6"
        )}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={['explorer', 'docs', 'tutorial'].includes(currentView) ? "h-full" : ""}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Add Project Dialog */}
      <AddProjectDialog
        open={addProjectOpen}
        onOpenChange={setAddProjectOpen}
        onAdded={handleProjectAdded}
      />

      {/* First-time Welcome Modal */}
      <WelcomeModal onStartTutorial={() => setCurrentView('tutorial')} />
    </div>
  );
}
