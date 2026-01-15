import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Package, Layout, Lock, RefreshCw, Rocket,
  Folder, FolderOpen, Loader2, Brain, Wand2, Wrench, Shield, Download, Layers, BookOpen
} from 'lucide-react';
import FileExplorer from "@/components/FileExplorer";
import ProjectSwitcher from "@/components/ProjectSwitcher";
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
  CreateMcpView,
  EnvView,
  TemplatesView,
  SubprojectsView,
  RegistryView,
  MemoryView,
  ProjectsView,
  DocsView
} from "@/views";

const navItems = [
  { id: 'projects', label: 'All Projects', icon: Layers, section: 'Projects' },
  { id: 'explorer', label: 'Project Explorer', icon: FolderOpen, section: 'Projects' },
  { id: 'subprojects', label: 'Sub-Projects', icon: Folder, section: 'Projects', badge: 'subprojects' },
  { id: 'registry', label: 'MCP Registry', icon: Package, section: 'Configuration' },
  { id: 'memory', label: 'Memory', icon: Brain, section: 'Configuration' },
  { id: 'claude-settings', label: 'Claude Code', icon: Shield, section: 'Configuration' },
  { id: 'templates', label: 'Templates', icon: Layout, section: 'Tools' },
  { id: 'env', label: 'Environment', icon: Lock, section: 'Tools' },
  { id: 'create-mcp', label: 'Create MCP', icon: Wand2, section: 'Developer' },
  { id: 'preferences', label: 'Preferences', icon: Wrench, section: 'System' },
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
  const [templates, setTemplates] = useState([]);
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

  // Persist currentView to localStorage
  useEffect(() => {
    setStoredState('currentView', currentView);
  }, [currentView]);

  // Load all data
  const loadData = useCallback(async () => {
    try {
      const [projectData, configsData, registryData, rulesData, commandsData, templatesData] = await Promise.all([
        api.getProject(),
        api.getConfigs(),
        api.getRegistry(),
        api.getRules(),
        api.getCommands(),
        api.getTemplates(),
      ]);

      setProject(projectData);
      setConfigs(configsData);
      setRegistry(registryData);
      setRules(rulesData);
      setCommands(commandsData);
      setTemplates(templatesData);

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

  // Handle project switch
  const handleSwitchProject = async (projectId) => {
    try {
      const result = await api.setActiveProject(projectId);
      if (result.success) {
        setProject({ dir: result.dir, hierarchy: result.hierarchy, subprojects: result.subprojects });
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
    api.checkVersion().then(data => {
      setVersion(data?.installedVersion);
      if (data?.updateAvailable) {
        setUpdateInfo(data);
      }
    }).catch(() => {});
  }, []);

  // Handle one-click update
  const handleUpdate = async () => {
    if (!updateInfo?.updateAvailable) return;
    setUpdating(true);
    try {
      const result = await api.performUpdate({
        updateMethod: updateInfo.updateMethod,
        sourcePath: updateInfo.sourcePath
      });
      if (result.success) {
        toast.success(`Updated to v${result.newVersion}! Reloading...`);
        // Reload the page after a short delay to get new UI
        setTimeout(() => window.location.reload(), 1500);
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
    subprojects: project.subprojects?.length || 0,
    mcps: uniqueEnabledMcps.size,
    rules: rules.length,
    commands: commands.length,
  };

  const handleApplyConfig = async () => {
    try {
      await api.applyConfig(project.dir);
      toast.success('Configuration applied successfully!');
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
        return <FileExplorer onRefresh={loadData} />;
      case 'subprojects':
        return <SubprojectsView project={project} onRefresh={handleRefresh} />;
      case 'registry':
        return <RegistryView registry={registry} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onUpdate={loadData} />;
      case 'memory':
        return <MemoryView project={project} onUpdate={loadData} />;
      case 'templates':
        return <TemplatesView templates={templates} project={project} onApply={loadData} />;
      case 'env':
        return <EnvView project={project} configs={configs} />;
      case 'create-mcp':
        return <CreateMcpView project={project} />;
      case 'claude-settings':
        return <ClaudeSettingsView />;
      case 'preferences':
        return <PreferencesView />;
      case 'projects':
        return <ProjectsView onProjectSwitch={(result) => {
          setProject({ dir: result.dir, hierarchy: result.hierarchy, subprojects: result.subprojects });
          loadData();
          loadProjects();
        }} />;
      case 'docs':
        return <DocsView />;
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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Claude <span className="text-primary">Config</span>
                  {version && <span className="text-xs font-normal text-muted-foreground ml-2">v{version}</span>}
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
                  {updating ? 'Updating...' : `Update to v${updateInfo.sourceVersion}`}
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-md"
            >
              <Rocket className="w-4 h-4" />
              Apply Config
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 h-[calc(100vh-64px)] border-r border-border bg-card sticky top-16">
          <ScrollArea className="h-full py-4">
            {['Projects', 'Configuration', 'Tools', 'Developer', 'System', 'Help'].map((section) => (
              <div key={section} className="mb-6">
                <h3 className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section}
                </h3>
                <div className="space-y-0.5">
                  {navItems
                    .filter(item => item.section === section)
                    .filter(item => {
                      // Hide sub-projects if there are none
                      if (item.id === 'subprojects' && (!project.subprojects || project.subprojects.length === 0)) {
                        return false;
                      }
                      return true;
                    })
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
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className={cn(
          "flex-1 overflow-auto",
          (currentView === 'explorer' || currentView === 'docs') ? "h-[calc(100vh-64px)]" : "p-6"
        )}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={(currentView === 'explorer' || currentView === 'docs') ? "h-full" : ""}
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
    </div>
  );
}
