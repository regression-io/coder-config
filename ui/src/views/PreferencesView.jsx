import React, { useState, useEffect } from 'react';
import { Wrench, Folder, Layout, FileText, Save, Loader2, RefreshCw, Download, FolderOpen, Plus, X, FolderPlus, Cpu, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import api from "@/lib/api";
import PathPicker from "@/components/PathPicker";

export default function PreferencesView() {
  const [config, setConfig] = useState(null);
  const [configPath, setConfigPath] = useState('');
  const [picker, setPicker] = useState({ open: false, field: null, type: 'directory' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [versionInfo, setVersionInfo] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadConfig();
    loadVersionInfo();
  }, []);

  const loadVersionInfo = async () => {
    try {
      const data = await api.checkVersion();
      setVersionInfo(data);
    } catch (error) {
      console.error('Failed to load version info:', error);
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
        if (result.updateMethod === 'npm') {
          toast.success(result.message || 'Updated via npm! Restart the server to apply.');
        } else {
          toast.success(`Updated! Files: ${result.updated?.join(', ') || 'all'}. Restart the server to apply.`);
        }
        loadVersionInfo();
      } else {
        toast.error('Update failed: ' + result.error);
      }
    } catch (error) {
      toast.error('Update failed: ' + error.message);
    } finally {
      setUpdating(false);
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

  const toggleTool = (tool) => {
    const currentTools = config?.enabledTools || ['claude'];
    if (currentTools.includes(tool)) {
      // Don't allow disabling all tools
      if (currentTools.length > 1) {
        updateConfig('enabledTools', currentTools.filter(t => t !== tool));
      }
    } else {
      updateConfig('enabledTools', [...currentTools, tool]);
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
          <h2 className="text-lg font-semibold text-foreground">claude-config Preferences</h2>
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
                    <label className="text-sm font-medium text-foreground">Antigravity</label>
                    <p className="text-xs text-muted-foreground">
                      Google's AI coding assistant • Output: <code className="text-xs">~/.gemini/antigravity/mcp_config.json</code>
                    </p>
                  </div>
                </div>
                <Switch
                  checked={(config?.enabledTools || ['claude']).includes('antigravity')}
                  onCheckedChange={() => toggleTool('antigravity')}
                />
              </div>

              <p className="text-xs text-muted-foreground italic">
                Note: Antigravity does not support environment variable interpolation (<code>$&#123;VAR&#125;</code>).
                Variables are resolved to actual values when generating its config.
              </p>
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
                <code className="text-xs text-muted-foreground">{versionInfo?.installDir || '~/.claude-config'}</code>
              </div>

              <div className="border-t border-border pt-3 mt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Documentation</span>
                  <a
                    href="https://github.com/regression-io/claude-config"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    GitHub
                  </a>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  After updating, restart the server with <code className="bg-muted-foreground/10 px-1 rounded">claude-config ui</code>
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
    </div>
  );
}
