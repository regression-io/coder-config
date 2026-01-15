import React, { useState, useEffect } from 'react';
import { Wrench, Folder, Layout, FileText, Save, Loader2, RefreshCw, Download, FolderOpen } from 'lucide-react';
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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
          <Wrench className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">claude-config Preferences</h2>
          <p className="text-sm text-gray-500">
            Tool settings for this configuration manager
          </p>
        </div>
      </div>

      {/* Configuration Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-500">
              Stored in: <code className="bg-gray-100 px-2 py-0.5 rounded">{configPath}</code>
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </div>

        <div className="space-y-6">
          {/* Directories Section */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Folder className="w-4 h-4" />
              Directories
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">MCP Tools Directory</label>
                <p className="text-xs text-gray-500 mb-2">
                  Where local MCP tool repositories are stored for discovery
                </p>
                <div className="flex gap-2">
                  <Input
                    value={config?.toolsDir || ''}
                    onChange={(e) => updateConfig('toolsDir', e.target.value)}
                    placeholder="~/mcp-tools"
                    className="font-mono flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPicker({ open: true, field: 'toolsDir', type: 'directory' })}
                    title="Browse..."
                  >
                    <FolderOpen className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Global Registry Path</label>
                <p className="text-xs text-gray-500 mb-2">
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
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Layout className="w-4 h-4" />
              User Interface
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Default Port</label>
                <p className="text-xs text-gray-500 mb-2">
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
                  <label className="text-sm font-medium text-gray-700">Open Browser on Start</label>
                  <p className="text-xs text-gray-500">
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

          {/* About Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              About
            </h3>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Installed Version</span>
                <span className="font-medium font-mono">{versionInfo?.installedVersion || 'Loading...'}</span>
              </div>

              {versionInfo?.updateAvailable && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">Update Available!</p>
                      <p className="text-xs text-green-600">
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
                  <span className="text-gray-600">Latest Version</span>
                  <span className="font-mono text-green-600">{versionInfo.latestVersion} ✓</span>
                </div>
              )}

              {versionInfo?.sourcePath && !versionInfo?.updateAvailable && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Dev Source</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-gray-500">{versionInfo.sourcePath}</code>
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
                <span className="text-gray-600">Install Location</span>
                <code className="text-xs text-gray-500">{versionInfo?.installDir || '~/.claude-config'}</code>
              </div>

              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Documentation</span>
                  <a
                    href="https://github.com/regression-io/claude-config"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    GitHub
                  </a>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  After updating, restart the server with <code className="bg-gray-100 px-1 rounded">claude-config ui</code>
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
          if (picker.field) {
            updateConfig(picker.field, path);
          }
        }}
        type={picker.type}
        initialPath={config?.[picker.field] || '~'}
        title={picker.type === 'directory' ? 'Select Directory' : 'Select File'}
      />
    </div>
  );
}
