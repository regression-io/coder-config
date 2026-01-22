import React, { useState } from 'react';
import { Settings, Save, Loader2, Shield, Sparkles, Server, Plus, Trash2, ChevronDown, ChevronRight, Zap, History, BarChart3, Terminal } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const CODEX_MODELS = [
  { id: 'gpt-5.2-codex', name: 'GPT-5.2 Codex', description: 'Latest and most capable' },
  { id: 'gpt-5-codex', name: 'GPT-5 Codex', description: 'Previous generation' },
  { id: 'gpt-5', name: 'GPT-5', description: 'General purpose' },
  { id: 'o3-mini', name: 'o3-mini', description: 'Fast reasoning model' },
];

const APPROVAL_POLICIES = [
  { id: 'on-request', name: 'On Request', description: 'Ask before running commands (default)' },
  { id: 'untrusted', name: 'Untrusted', description: 'Ask for everything' },
  { id: 'on-failure', name: 'On Failure', description: 'Ask only when commands fail' },
  { id: 'never', name: 'Never', description: 'Never ask (use with caution)' },
];

const SANDBOX_MODES = [
  { id: 'read-only', name: 'Read Only', description: 'Can only read files (default)' },
  { id: 'workspace-write', name: 'Workspace Write', description: 'Can write within workspace' },
  { id: 'danger-full-access', name: 'Full Access', description: 'Full filesystem access (dangerous)' },
];

const REASONING_EFFORTS = [
  { id: 'minimal', name: 'Minimal', description: 'Fastest, least thorough' },
  { id: 'low', name: 'Low', description: 'Quick responses' },
  { id: 'medium', name: 'Medium', description: 'Balanced (default)' },
  { id: 'high', name: 'High', description: 'More thorough' },
  { id: 'xhigh', name: 'Extra High', description: 'Most thorough' },
];

const HISTORY_PERSISTENCE = [
  { id: 'save-all', name: 'Save All', description: 'Keep all session history' },
  { id: 'none', name: 'None', description: 'Do not persist history' },
];

export default function CodexSettingsEditor({ settings, rawToml, onSave, loading, settingsPath }) {
  const [localSettings, setLocalSettings] = useState(settings || {});
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('rich'); // 'rich' or 'toml'
  const [tomlText, setTomlText] = useState(rawToml || '');
  const [addMcpDialog, setAddMcpDialog] = useState({ open: false, name: '', json: '' });
  const [expandedMcps, setExpandedMcps] = useState({});

  const handleSave = async () => {
    setSaving(true);
    try {
      if (viewMode === 'toml') {
        await onSave(null, tomlText);
      } else {
        await onSave(localSettings);
      }
      toast.success('Settings saved');
    } catch (e) {
      toast.error('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateNestedSetting = (category, key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const getSetting = (key, defaultValue = '') => {
    return localSettings?.[key] ?? defaultValue;
  };

  const getNestedSetting = (category, key, defaultValue = false) => {
    return localSettings?.[category]?.[key] ?? defaultValue;
  };

  // MCP management
  const mcpServers = localSettings.mcp_servers || {};

  const addMcp = () => {
    const { name, json } = addMcpDialog;
    if (!name.trim()) {
      toast.error('Please enter a name for the MCP server');
      return;
    }

    let config;
    try {
      config = JSON.parse(json);
    } catch (e) {
      toast.error('Invalid JSON configuration');
      return;
    }

    if (!config.command) {
      toast.error('MCP config must have a "command" field');
      return;
    }

    setLocalSettings(prev => ({
      ...prev,
      mcp_servers: {
        ...prev.mcp_servers,
        [name.trim()]: config
      }
    }));

    setAddMcpDialog({ open: false, name: '', json: '' });
    toast.success(`Added MCP: ${name}`);
  };

  const removeMcp = (name) => {
    setLocalSettings(prev => {
      const { [name]: _, ...rest } = prev.mcp_servers || {};
      return { ...prev, mcp_servers: rest };
    });
    toast.success(`Removed MCP: ${name}`);
  };

  const toggleMcpExpanded = (name) => {
    setExpandedMcps(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              Codex CLI Settings
              <Badge variant="outline" className="text-xs font-normal text-green-600 border-green-300 dark:border-green-700">
                <Sparkles className="w-3 h-3 mr-1" />
                OpenAI
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              Stored in: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{settingsPath}</code>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-1">
            <button
              className={`px-3 py-1 text-sm rounded-md transition-colors ${viewMode === 'rich' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setViewMode('rich')}
            >
              Settings
            </button>
            <button
              className={`px-3 py-1 text-sm rounded-md transition-colors ${viewMode === 'toml' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setViewMode('toml')}
            >
              TOML
            </button>
          </div>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      {viewMode === 'toml' ? (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <Textarea
            value={tomlText}
            onChange={(e) => setTomlText(e.target.value)}
            className="font-mono text-sm min-h-[500px] border-0 rounded-none resize-none"
            placeholder="# Codex CLI config.toml"
          />
        </div>
      ) : (
      <>

      {/* Model Section */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-green-500" />
          Model
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Default Model</label>
              <p className="text-xs text-muted-foreground">Model used for Codex CLI sessions</p>
            </div>
            <Select
              value={getSetting('model', '')}
              onValueChange={(value) => updateSetting('model', value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {CODEX_MODELS.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span>{model.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Reasoning Effort</label>
              <p className="text-xs text-muted-foreground">How thoroughly the model should reason</p>
            </div>
            <Select
              value={getSetting('model_reasoning_effort', 'medium')}
              onValueChange={(value) => updateSetting('model_reasoning_effort', value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONING_EFFORTS.map(effort => (
                  <SelectItem key={effort.id} value={effort.id}>
                    {effort.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-500" />
          Security
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Approval Policy</label>
              <p className="text-xs text-muted-foreground">When to ask for command approval</p>
            </div>
            <Select
              value={getSetting('approval_policy', 'on-request')}
              onValueChange={(value) => updateSetting('approval_policy', value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPROVAL_POLICIES.map(policy => (
                  <SelectItem key={policy.id} value={policy.id}>
                    {policy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Sandbox Mode</label>
              <p className="text-xs text-muted-foreground">Filesystem and network access level</p>
            </div>
            <Select
              value={getSetting('sandbox_mode', 'read-only')}
              onValueChange={(value) => updateSetting('sandbox_mode', value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SANDBOX_MODES.map(mode => (
                  <SelectItem key={mode.id} value={mode.id}>
                    {mode.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* MCP Servers Section */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Server className="w-4 h-4 text-green-500" />
            MCP Servers
            <Badge variant="secondary" className="text-xs">{Object.keys(mcpServers).length}</Badge>
          </h3>
          <Button size="sm" variant="outline" onClick={() => setAddMcpDialog({ open: true, name: '', json: '{\n  "command": "npx",\n  "args": ["-y", "@example/mcp-server"],\n  "enabled": true\n}' })}>
            <Plus className="w-4 h-4 mr-1" />
            Add MCP
          </Button>
        </div>
        <div className="space-y-2">
          {Object.keys(mcpServers).length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No MCP servers configured</p>
          ) : (
            Object.entries(mcpServers).map(([name, config]) => (
              <Collapsible key={name} open={expandedMcps[name]} onOpenChange={() => toggleMcpExpanded(name)}>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-background group">
                  <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
                    {expandedMcps[name] ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    <Server className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-sm">{name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{config.command}</span>
                    {config.enabled === false && <Badge variant="secondary" className="text-xs">Disabled</Badge>}
                  </CollapsibleTrigger>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                    onClick={() => removeMcp(name)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <CollapsibleContent>
                  <div className="mt-2 ml-6 p-3 rounded-lg bg-muted/50 border">
                    <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">
                      {JSON.stringify(config, null, 2)}
                    </pre>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-green-500" />
          Features
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Shell Snapshot</label>
              <p className="text-xs text-muted-foreground">Speed up repeated commands (Beta)</p>
            </div>
            <Switch
              checked={getNestedSetting('features', 'shell_snapshot', true)}
              onCheckedChange={(checked) => updateNestedSetting('features', 'shell_snapshot', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Web Search</label>
              <p className="text-xs text-muted-foreground">Allow the model to search the web</p>
            </div>
            <Switch
              checked={getNestedSetting('features', 'web_search_request', true)}
              onCheckedChange={(checked) => updateNestedSetting('features', 'web_search_request', checked)}
            />
          </div>
        </div>
      </div>

      {/* TUI Section */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-green-500" />
          Display
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Animations</label>
              <p className="text-xs text-muted-foreground">Enable UI animations</p>
            </div>
            <Switch
              checked={getNestedSetting('tui', 'animations', true)}
              onCheckedChange={(checked) => updateNestedSetting('tui', 'animations', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Notifications</label>
              <p className="text-xs text-muted-foreground">Show system notifications</p>
            </div>
            <Switch
              checked={getNestedSetting('tui', 'notifications', true)}
              onCheckedChange={(checked) => updateNestedSetting('tui', 'notifications', checked)}
            />
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <History className="w-4 h-4 text-green-500" />
          History
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Persistence</label>
              <p className="text-xs text-muted-foreground">How session history is saved</p>
            </div>
            <Select
              value={getNestedSetting('history', 'persistence', 'save-all')}
              onValueChange={(value) => updateNestedSetting('history', 'persistence', value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HISTORY_PERSISTENCE.map(opt => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-green-500" />
          Analytics
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Usage Metrics</label>
              <p className="text-xs text-muted-foreground">Send anonymous usage data to OpenAI</p>
            </div>
            <Switch
              checked={getNestedSetting('analytics', 'enabled', true)}
              onCheckedChange={(checked) => updateNestedSetting('analytics', 'enabled', checked)}
            />
          </div>
        </div>
      </div>
      </>
      )}

      {/* Add MCP Dialog */}
      <Dialog open={addMcpDialog.open} onOpenChange={(open) => setAddMcpDialog({ ...addMcpDialog, open })}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Add MCP Server</DialogTitle>
            <DialogDescription>
              Add a new MCP server to Codex CLI
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={addMcpDialog.name}
                onChange={(e) => setAddMcpDialog({ ...addMcpDialog, name: e.target.value })}
                placeholder="my-mcp-server"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Configuration (JSON)</label>
              <Textarea
                value={addMcpDialog.json}
                onChange={(e) => setAddMcpDialog({ ...addMcpDialog, json: e.target.value })}
                className="mt-1 font-mono text-sm"
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddMcpDialog({ open: false, name: '', json: '' })}>
              Cancel
            </Button>
            <Button onClick={addMcp}>
              <Plus className="w-4 h-4 mr-2" />
              Add MCP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
