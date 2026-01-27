import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Wrench, Folder, Layout, FileText, Save, Loader2, RefreshCw, Download, FolderOpen, Plus, X, FolderPlus, Cpu, Sparkles, Bot, Terminal, Eye, EyeOff, History, FlaskConical, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import api from "@/lib/api";
import PathPicker from "@/components/PathPicker";

export default function PreferencesView({ onConfigChange }) {
  const [config, setConfig] = useState(null);
  const [configPath, setConfigPath] = useState('');
  const [picker, setPicker] = useState({ open: false, field: null, type: 'directory' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [versionInfo, setVersionInfo] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [projectDir, setProjectDir] = useState(null);
  const [hiddenSubprojects, setHiddenSubprojects] = useState([]);
  const [changelogDialog, setChangelogDialog] = useState({ open: false, content: '', loading: false });
  const [experimentalWarning, setExperimentalWarning] = useState({ open: false, feature: null });

  useEffect(() => {
    loadConfig();
    loadVersionInfo();
    loadProjectInfo();
  }, []);

  const loadVersionInfo = async () => {
    try {
      const data = await api.checkVersion();
      setVersionInfo(data);
    } catch (error) {
      console.error('Failed to load version info:', error);
    }
  };

  const loadProjectInfo = async () => {
    try {
      const data = await api.getProject();
      setProjectDir(data.dir);
      loadHiddenSubprojects(data.dir);
    } catch (error) {
      console.error('Failed to load project info:', error);
    }
  };

  const loadHiddenSubprojects = async (dir) => {
    if (!dir) return;
    try {
      const data = await api.getHiddenSubprojects(dir);
      setHiddenSubprojects(data.hidden || []);
    } catch (error) {
      console.error('Failed to load hidden sub-projects:', error);
    }
  };

  const handleUnhide = async (subprojectDir) => {
    if (!projectDir) return;
    try {
      const result = await api.unhideSubproject(projectDir, subprojectDir);
      if (result.success) {
        toast.success('Sub-project unhidden');
        loadHiddenSubprojects(projectDir);
      } else {
        toast.error(result.error || 'Failed to unhide');
      }
    } catch (error) {
      toast.error('Failed to unhide: ' + error.message);
    }
  };

  const handleUpdate = async () => {
    if (!versionInfo?.updateAvailable) {
      toast.error('No update available');
      return;
    }
    setUpdating(true);
    try {
      const result = await api.performUpdate({
        updateMethod: versionInfo.updateMethod,
        sourcePath: versionInfo.sourcePath
      });
      if (result.success) {
        toast.success(`Updated to v${result.newVersion}! Restarting server...`);

        // Trigger server restart
        try {
          await api.restartServer();
        } catch {
          // Expected - server exits before response completes
        }

        // Wait for server to come back up, then reload
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
        toast.error('Update failed: ' + result.error);
        setUpdating(false);
      }
    } catch (error) {
      toast.error('Update failed: ' + error.message);
      setUpdating(false);
    }
  };

  const loadChangelog = async () => {
    setChangelogDialog(prev => ({ ...prev, open: true, loading: true }));
    try {
      const result = await api.getChangelog();
      if (result.success) {
        setChangelogDialog(prev => ({ ...prev, content: result.content, loading: false }));
      } else {
        toast.error('Failed to load changelog');
        setChangelogDialog(prev => ({ ...prev, open: false, loading: false }));
      }
    } catch (error) {
      toast.error('Failed to load changelog: ' + error.message);
      setChangelogDialog(prev => ({ ...prev, open: false, loading: false }));
    }
  };

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await api.getConfig();
      setConfig(data.config);
      setConfigPath(data.path);
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveConfig(config);
      toast.success('Preferences saved!');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateNestedConfig = (parent, key, value) => {
    setConfig(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [key]: value }
    }));
  };

  const toggleTool = async (tool) => {
    const currentTools = config?.enabledTools || ['claude'];
    let newTools;

    if (currentTools.includes(tool)) {
      // Don't allow disabling all tools
      if (currentTools.length <= 1) {
        toast.error('At least one tool must be enabled');
        return;
      }
      newTools = currentTools.filter(t => t !== tool);
    } else {
      newTools = [...currentTools, tool];
    }

    // Update local state
    const newConfig = { ...config, enabledTools: newTools };
    setConfig(newConfig);

    // Auto-save immediately
    try {
      await api.saveConfig(newConfig);
      toast.success(`${tool === 'claude' ? 'Claude Code' : tool === 'gemini' ? 'Gemini CLI' : 'Antigravity'} ${newTools.includes(tool) ? 'enabled' : 'disabled'}`);
    } catch (error) {
      // Revert on error
      setConfig(config);
      toast.error('Failed to save preference');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
          <Wrench className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">coder-config Preferences</h2>
          <p className="text-sm text-muted-foreground">
            Tool settings for this configuration manager
          </p>
        </div>
      </div>

      {/* Configuration Section */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Stored in: <code className="bg-muted px-2 py-0.5 rounded">{configPath}</code>
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </div>

        <div className="space-y-6">
          {/* Directories Section */}
          <div className="border-b border-border pb-6">
            <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <Folder className="w-4 h-4" />
              Directories
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">MCP Tools Directories</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Folders containing local MCP tool repositories for discovery
                </p>
                <div className="space-y-2">
                  {(config?.toolsDirs || (config?.toolsDir ? [config.toolsDir] : [])).map((dir, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={dir || ''}
                        onChange={(e) => {
                          const newDirs = [...(config?.toolsDirs || (config?.toolsDir ? [config.toolsDir] : []))];
                          newDirs[index] = e.target.value;
                          updateConfig('toolsDirs', newDirs);
                          // Clear old single toolsDir
                          if (config?.toolsDir) {
                            setConfig(prev => {
                              const { toolsDir, ...rest } = prev;
                              return { ...rest, toolsDirs: newDirs };
                            });
                          }
                        }}
                        placeholder="~/mcp-tools"
                        className="font-mono flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setPicker({ open: true, field: 'toolsDirs', type: 'directory', index })}
                        title="Browse..."
                      >
                        <FolderOpen className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const currentDirs = config?.toolsDirs || (config?.toolsDir ? [config.toolsDir] : []);
                          const newDirs = currentDirs.filter((_, i) => i !== index);
                          setConfig(prev => {
                            const { toolsDir, ...rest } = prev;
                            return { ...rest, toolsDirs: newDirs.length > 0 ? newDirs : undefined };
                          });
                        }}
                        title="Remove"
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPicker({ open: true, field: 'toolsDirs', type: 'directory', index: -1 })}
                    className="mt-2"
                  >
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Add Tools Folder
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Global Registry Path</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Path to the global MCP registry file
                </p>
                <div className="flex gap-2">
                  <Input
                    value={config?.registryPath || ''}
                    onChange={(e) => updateConfig('registryPath', e.target.value)}
                    placeholder="~/.claude/registry.json"
                    className="font-mono flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPicker({ open: true, field: 'registryPath', type: 'file' })}
                    title="Browse..."
                  >
                    <FolderOpen className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* UI Section */}
          <div className="border-b border-border pb-6">
            <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <Layout className="w-4 h-4" />
              User Interface
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Default Port</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Port for the web UI server
                </p>
                <Input
                  type="number"
                  value={config?.ui?.port || 3333}
                  onChange={(e) => updateNestedConfig('ui', 'port', parseInt(e.target.value) || 3333)}
                  placeholder="3333"
                  className="w-32"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Open Browser on Start</label>
                  <p className="text-xs text-muted-foreground">
                    Automatically open browser when starting the UI
                  </p>
                </div>
                <Switch
                  checked={config?.ui?.openBrowser ?? true}
                  onCheckedChange={(checked) => updateNestedConfig('ui', 'openBrowser', checked)}
                />
              </div>
            </div>
          </div>

          {/* AI Assistant Section */}
          <div className="border-b border-border pb-6">
            <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <Bot className="w-4 h-4" />
              AI Assistant
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Choose which AI assistant to use for features like MCP creation and tool import.
            </p>

            <div className="space-y-2">
              <label
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border-2 transition-colors ${
                  (config?.aiAssistant || 'claude') === 'claude'
                    ? 'border-orange-500 bg-orange-500/5'
                    : 'border-transparent bg-muted/50 hover:bg-muted'
                }`}
                onClick={() => updateConfig('aiAssistant', 'claude')}
              >
                <input
                  type="radio"
                  name="aiAssistant"
                  value="claude"
                  checked={(config?.aiAssistant || 'claude') === 'claude'}
                  onChange={() => updateConfig('aiAssistant', 'claude')}
                  className="sr-only"
                />
                <div className="w-8 h-8 rounded-md bg-orange-500/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">Claude Code</span>
                  <p className="text-xs text-muted-foreground">
                    Anthropic's AI coding assistant • Command: <code className="text-xs">claude</code>
                  </p>
                </div>
                {(config?.aiAssistant || 'claude') === 'claude' && (
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                )}
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border-2 transition-colors ${
                  config?.aiAssistant === 'gemini'
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-transparent bg-muted/50 hover:bg-muted'
                }`}
                onClick={() => updateConfig('aiAssistant', 'gemini')}
              >
                <input
                  type="radio"
                  name="aiAssistant"
                  value="gemini"
                  checked={config?.aiAssistant === 'gemini'}
                  onChange={() => updateConfig('aiAssistant', 'gemini')}
                  className="sr-only"
                />
                <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center">
                  <Terminal className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">Gemini CLI</span>
                  <p className="text-xs text-muted-foreground">
                    Google's AI coding assistant • Command: <code className="text-xs">gemini</code>
                  </p>
                </div>
                {config?.aiAssistant === 'gemini' && (
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                )}
              </label>
            </div>
          </div>

          {/* Enabled AI Tools Section */}
          <div className="border-b border-border pb-6">
            <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Enabled AI Tools
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Select which AI coding tools to generate MCP configurations for. The Apply button will update all enabled tools.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-orange-500/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Claude Code</label>
                    <p className="text-xs text-muted-foreground">
                      Anthropic's AI coding assistant • Output: <code className="text-xs">.mcp.json</code>
                    </p>
                  </div>
                </div>
                <Switch
                  checked={(config?.enabledTools || ['claude']).includes('claude')}
                  onCheckedChange={() => toggleTool('claude')}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Gemini CLI</label>
                    <p className="text-xs text-muted-foreground">
                      Google's terminal AI coding assistant • Output: <code className="text-xs">~/.gemini/settings.json</code>
                    </p>
                  </div>
                </div>
                <Switch
                  checked={(config?.enabledTools || ['claude']).includes('gemini')}
                  onCheckedChange={() => toggleTool('gemini')}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-purple-500/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Antigravity</label>
                    <p className="text-xs text-muted-foreground">
                      Google's AI IDE • Output: <code className="text-xs">~/.gemini/antigravity/mcp_config.json</code>
                    </p>
                  </div>
                </div>
                <Switch
                  checked={(config?.enabledTools || ['claude']).includes('antigravity')}
                  onCheckedChange={() => toggleTool('antigravity')}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-green-500/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Codex CLI</label>
                    <p className="text-xs text-muted-foreground">
                      OpenAI's terminal coding assistant • Output: <code className="text-xs">.codex/mcp.json</code>
                    </p>
                  </div>
                </div>
                <Switch
                  checked={(config?.enabledTools || ['claude']).includes('codex')}
                  onCheckedChange={() => toggleTool('codex')}
                />
              </div>

              <p className="text-xs text-muted-foreground italic">
                Note: Antigravity does not support environment variable interpolation (<code>$&#123;VAR&#125;</code>).
                Variables are resolved to actual values when generating its config.
              </p>
            </div>
          </div>

          {/* Hidden Sub-projects Section */}
          {hiddenSubprojects.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                <EyeOff className="w-4 h-4" />
                Hidden Sub-projects
              </h3>

              <div className="space-y-2">
                {hiddenSubprojects.map((sub) => (
                  <div
                    key={sub.dir}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{sub.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {sub.dir.replace(projectDir + '/', '')}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnhide(sub.dir)}
                      className="h-7"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Unhide
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Experimental Features Section */}
          <div className="border-b border-border pb-6">
            <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              Experimental Features
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              These features are experimental and may change or be removed in future versions.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-yellow-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-yellow-500/10 flex items-center justify-center">
                    <FlaskConical className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Ralph Loops</label>
                    <p className="text-xs text-muted-foreground">
                      Autonomous development loops with Claude Code
                    </p>
                  </div>
                </div>
                <Switch
                  checked={config?.experimental?.ralphLoops || false}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      // Show warning dialog before enabling
                      setExperimentalWarning({ open: true, feature: 'ralphLoops' });
                    } else {
                      // Disable immediately
                      const newConfig = {
                        ...config,
                        experimental: { ...config?.experimental, ralphLoops: false }
                      };
                      setConfig(newConfig);
                      api.saveConfig(newConfig);
                      onConfigChange?.(newConfig);
                      toast.success('Ralph Loops disabled');
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* About Section */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              About
            </h3>

            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Installed Version</span>
                <span className="font-medium font-mono text-foreground">{versionInfo?.installedVersion || 'Loading...'}</span>
              </div>

              {versionInfo?.updateAvailable && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">Update Available!</p>
                      <p className="text-xs text-green-600/80 dark:text-green-400/80">
                        Version {versionInfo.latestVersion} via {versionInfo.updateMethod === 'npm' ? 'npm' : versionInfo.sourcePath}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleUpdate}
                      disabled={updating}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {updating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                      Update Now
                    </Button>
                  </div>
                </div>
              )}

              {!versionInfo?.updateAvailable && versionInfo?.latestVersion && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Latest Version</span>
                  <span className="font-mono text-green-600 dark:text-green-400">{versionInfo.latestVersion} ✓</span>
                </div>
              )}

              {versionInfo?.sourcePath && !versionInfo?.updateAvailable && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Dev Source</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-muted-foreground">{versionInfo.sourcePath}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleUpdate}
                      disabled={updating}
                      className="h-7"
                    >
                      {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Install Location</span>
                <code className="text-xs text-muted-foreground">{versionInfo?.installDir || '~/.coder-config'}</code>
              </div>

              <div className="flex items-center justify-between text-sm pt-2">
                <div>
                  <span className="text-muted-foreground">Auto-Update</span>
                  <p className="text-xs text-muted-foreground/70">Automatically install updates when available</p>
                </div>
                <Switch
                  checked={config?.autoUpdate || false}
                  onCheckedChange={(checked) => {
                    updateConfig('autoUpdate', checked);
                    api.saveConfig({ ...config, autoUpdate: checked });
                    toast.success(checked ? 'Auto-update enabled' : 'Auto-update disabled');
                  }}
                />
              </div>

              <div className="border-t border-border pt-3 mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Documentation</span>
                  <a
                    href="https://github.com/regression-io/coder-config"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    GitHub
                  </a>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">What's New</span>
                  <button
                    onClick={loadChangelog}
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <History className="w-3 h-3" />
                    Changelog
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  After updating, restart the server with <code className="bg-muted-foreground/10 px-1 rounded">coder-config ui</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Path Picker Dialog */}
      <PathPicker
        open={picker.open}
        onOpenChange={(open) => setPicker(prev => ({ ...prev, open }))}
        onSelect={(path) => {
          if (picker.field === 'toolsDirs') {
            const currentDirs = config?.toolsDirs || (config?.toolsDir ? [config.toolsDir] : []);
            if (picker.index === -1) {
              // Adding new folder
              setConfig(prev => {
                const { toolsDir, ...rest } = prev;
                return { ...rest, toolsDirs: [...currentDirs, path] };
              });
            } else {
              // Editing existing folder
              const newDirs = [...currentDirs];
              newDirs[picker.index] = path;
              setConfig(prev => {
                const { toolsDir, ...rest } = prev;
                return { ...rest, toolsDirs: newDirs };
              });
            }
          } else if (picker.field) {
            updateConfig(picker.field, path);
          }
        }}
        type={picker.type}
        initialPath={
          picker.field === 'toolsDirs' && picker.index >= 0
            ? (config?.toolsDirs || (config?.toolsDir ? [config.toolsDir] : []))[picker.index] || '~'
            : config?.[picker.field] || '~'
        }
        title={picker.type === 'directory' ? 'Select Directory' : 'Select File'}
      />

      {/* Changelog Dialog */}
      <Dialog open={changelogDialog.open} onOpenChange={(open) => setChangelogDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Changelog
            </DialogTitle>
          </DialogHeader>
          {changelogDialog.loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-[60vh]">
              <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
                <ReactMarkdown
                  components={{
                    h1: ({children}) => <h1 className="text-xl font-bold text-foreground mb-4">{children}</h1>,
                    h2: ({children}) => <h2 className="text-lg font-semibold text-foreground mt-6 mb-3 pb-2 border-b border-border">{children}</h2>,
                    h3: ({children}) => <h3 className="text-base font-medium text-foreground mt-4 mb-2">{children}</h3>,
                    p: ({children}) => <p className="text-sm text-muted-foreground mb-2">{children}</p>,
                    ul: ({children}) => <ul className="text-sm text-muted-foreground list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                    li: ({children}) => <li className="text-sm">{children}</li>,
                    code: ({children}) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                    hr: () => <hr className="my-4 border-border" />,
                    strong: ({children}) => <strong className="font-semibold text-foreground">{children}</strong>,
                  }}
                >
                  {changelogDialog.content}
                </ReactMarkdown>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Experimental Feature Warning Dialog */}
      <Dialog open={experimentalWarning.open} onOpenChange={(open) => setExperimentalWarning(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="w-5 h-5" />
              Experimental Feature Warning
            </DialogTitle>
            <DialogDescription className="pt-2">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">Ralph Loops</strong> is an experimental feature that enables autonomous development loops with Claude Code.
                </p>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-yellow-700 dark:text-yellow-300 font-medium mb-2">Please be aware:</p>
                  <ul className="list-disc pl-4 space-y-1 text-yellow-600 dark:text-yellow-400">
                    <li>This feature runs Claude autonomously with minimal intervention</li>
                    <li>It may make many API calls and incur costs</li>
                    <li>Always review generated code before committing</li>
                    <li>This feature may change or be removed in future versions</li>
                  </ul>
                </div>
                <p>
                  Do you want to enable Ralph Loops?
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setExperimentalWarning({ open: false, feature: null })}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
              onClick={() => {
                const newConfig = {
                  ...config,
                  experimental: { ...config?.experimental, ralphLoops: true }
                };
                setConfig(newConfig);
                api.saveConfig(newConfig);
                onConfigChange?.(newConfig);
                toast.success('Ralph Loops enabled');
                setExperimentalWarning({ open: false, feature: null });
              }}
            >
              <FlaskConical className="w-4 h-4 mr-2" />
              Enable Feature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
