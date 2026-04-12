import React, { useState } from 'react';
import { Settings, Save, Loader2, Palette, Monitor, Terminal, Shield, Sparkles, Server, Plus, Trash2, ChevronDown, ChevronRight, FileText, Clock } from 'lucide-react';
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

const THEMES = [
  { id: 'Default', name: 'Default' },
  { id: 'GitHub', name: 'GitHub' },
  { id: 'Monokai', name: 'Monokai' },
  { id: 'SolarizedDark', name: 'Solarized Dark' },
  { id: 'SolarizedLight', name: 'Solarized Light' },
];

const GEMINI_MODELS = [
  { id: 'auto', name: 'Auto', description: 'CLI picks best model per task' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', description: 'Latest, thinking + multimodal' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Thinking + multimodal tools' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Fast with thinking' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Previous generation capable' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Previous generation fast' },
];

export default function GeminiSettingsEditor({ settings, onSave, loading, settingsPath }) {
  const [localSettings, setLocalSettings] = useState(settings || {});
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('rich'); // 'rich' or 'json'
  const [jsonText, setJsonText] = useState(JSON.stringify(settings || {}, null, 2));
  const [addMcpDialog, setAddMcpDialog] = useState({ open: false, name: '', json: '' });
  const [expandedMcps, setExpandedMcps] = useState({});

  const handleSave = async () => {
    setSaving(true);
    try {
      if (viewMode === 'json') {
        try {
          const parsed = JSON.parse(jsonText);
          await onSave(parsed);
          setLocalSettings(parsed);
        } catch (e) {
          toast.error('Invalid JSON');
          setSaving(false);
          return;
        }
      } else {
        await onSave(localSettings);
        setJsonText(JSON.stringify(localSettings, null, 2));
      }
      toast.success('Settings saved');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (category, key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const getSetting = (category, key, defaultValue = false) => {
    return localSettings?.[category]?.[key] ?? defaultValue;
  };

  // MCP management
  const mcpServers = localSettings.mcpServers || {};

  const addMcp = () => {
    const { name, json } = addMcpDialog;
    if (!name.trim()) {
      toast.error('Please enter a name for the MCP');
      return;
    }

    let config;
    try {
      config = JSON.parse(json);
    } catch (e) {
      toast.error('Invalid JSON configuration');
      return;
    }

    if (!config.command && !config.url && !config.httpUrl && !config.tcp) {
      toast.error('MCP config must have a "command" (stdio), "url" (SSE), "httpUrl" (HTTP), or "tcp" (WebSocket) field');
      return;
    }

    setLocalSettings(prev => ({
      ...prev,
      mcpServers: {
        ...prev.mcpServers,
        [name.trim()]: config
      }
    }));

    setAddMcpDialog({ open: false, name: '', json: '' });
    toast.success(`Added MCP: ${name}`);
  };

  const removeMcp = (name) => {
    setLocalSettings(prev => {
      const { [name]: _, ...rest } = prev.mcpServers || {};
      return { ...prev, mcpServers: rest };
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
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              Gemini CLI Settings
              <Badge variant="outline" className="text-xs font-normal text-blue-600 border-blue-300 dark:border-blue-700">
                <Sparkles className="w-3 h-3 mr-1" />
                Google
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
              className={`px-3 py-1 text-sm rounded-md transition-colors ${viewMode === 'json' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => {
                setJsonText(JSON.stringify(localSettings, null, 2));
                setViewMode('json');
              }}
            >
              JSON
            </button>
          </div>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      {viewMode === 'json' ? (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <Textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="font-mono text-sm min-h-[500px] border-0 rounded-none resize-none"
            placeholder="{ }"
          />
        </div>
      ) : (
      <>

      {/* MCP Servers Section */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-500" />
            MCP Servers
            <Badge variant="secondary" className="text-xs">{Object.keys(mcpServers).length}</Badge>
          </h3>
          <Button size="sm" variant="outline" onClick={() => setAddMcpDialog({ open: true, name: '', json: '{\n  "command": "npx",\n  "args": ["-y", "@example/mcp-server"]\n}' })}>
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
                    <Server className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-sm">{name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{config.url || config.httpUrl || config.tcp ? `${config.type || 'http'}: ${config.url || config.httpUrl || config.tcp}` : config.command}</span>
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

      {/* Model Section */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500" />
          Model
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Default Model</label>
              <p className="text-xs text-muted-foreground">Model used for Gemini CLI sessions</p>
            </div>
            <Select
              value={getSetting('model', 'name', '')}
              onValueChange={(value) => updateSetting('model', 'name', value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {GEMINI_MODELS.map(model => (
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
              <label className="text-sm font-medium text-foreground">Preview Features</label>
              <p className="text-xs text-muted-foreground">Enable access to experimental models and features</p>
            </div>
            <Switch
              checked={getSetting('general', 'previewFeatures', false)}
              onCheckedChange={(checked) => updateSetting('general', 'previewFeatures', checked)}
            />
          </div>
        </div>
      </div>

      {/* Theme Section */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Palette className="w-4 h-4 text-blue-500" />
          Appearance
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Theme</label>
              <p className="text-xs text-muted-foreground">Color theme for the CLI interface</p>
            </div>
            <Select
              value={getSetting('ui', 'theme', 'Default')}
              onValueChange={(value) => updateSetting('ui', 'theme', value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THEMES.map(theme => (
                  <SelectItem key={theme.id} value={theme.id}>{theme.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Output Format</label>
              <p className="text-xs text-muted-foreground">Format for CLI output</p>
            </div>
            <Select
              value={getSetting('output', 'format', 'text')}
              onValueChange={(value) => updateSetting('output', 'format', value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* UI Display Options */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-blue-500" />
          Display Options
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Dynamic Window Title</label>
              <p className="text-xs text-muted-foreground">Update title with status icons (Ready, Working, etc.)</p>
            </div>
            <Switch
              checked={getSetting('ui', 'dynamicWindowTitle', true)}
              onCheckedChange={(checked) => updateSetting('ui', 'dynamicWindowTitle', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Show Line Numbers</label>
              <p className="text-xs text-muted-foreground">Display line numbers in chat</p>
            </div>
            <Switch
              checked={getSetting('ui', 'showLineNumbers', true)}
              onCheckedChange={(checked) => updateSetting('ui', 'showLineNumbers', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Show Citations</label>
              <p className="text-xs text-muted-foreground">Display citations for generated text</p>
            </div>
            <Switch
              checked={getSetting('ui', 'showCitations', false)}
              onCheckedChange={(checked) => updateSetting('ui', 'showCitations', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Hide Context Summary</label>
              <p className="text-xs text-muted-foreground">Hide GEMINI.md and MCP servers above input</p>
            </div>
            <Switch
              checked={getSetting('ui', 'hideContextSummary', false)}
              onCheckedChange={(checked) => updateSetting('ui', 'hideContextSummary', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Hide Footer</label>
              <p className="text-xs text-muted-foreground">Remove footer entirely from the UI</p>
            </div>
            <Switch
              checked={getSetting('ui', 'hideFooter', false)}
              onCheckedChange={(checked) => updateSetting('ui', 'hideFooter', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Screen Reader Mode</label>
              <p className="text-xs text-muted-foreground">Render output in plain-text for accessibility</p>
            </div>
            <Switch
              checked={localSettings?.ui?.accessibility?.screenReader ?? false}
              onCheckedChange={(checked) => setLocalSettings(prev => ({
                ...prev,
                ui: {
                  ...prev.ui,
                  accessibility: { ...prev.ui?.accessibility, screenReader: checked }
                }
              }))}
            />
          </div>
        </div>
      </div>

      {/* General Settings */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-500" />
          General
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Vim Mode</label>
              <p className="text-xs text-muted-foreground">Enable Vim keybindings in the prompt editor</p>
            </div>
            <Switch
              checked={getSetting('general', 'vimMode', false)}
              onCheckedChange={(checked) => updateSetting('general', 'vimMode', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Auto Update</label>
              <p className="text-xs text-muted-foreground">Allow automatic updates to Gemini CLI</p>
            </div>
            <Switch
              checked={getSetting('general', 'enableAutoUpdate', true)}
              onCheckedChange={(checked) => updateSetting('general', 'enableAutoUpdate', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Checkpointing</label>
              <p className="text-xs text-muted-foreground">Enable session recovery support</p>
            </div>
            <Switch
              checked={localSettings?.general?.checkpointing?.enabled ?? false}
              onCheckedChange={(checked) => setLocalSettings(prev => ({
                ...prev,
                general: {
                  ...prev.general,
                  checkpointing: { ...prev.general?.checkpointing, enabled: checked }
                }
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Respect .gitignore</label>
              <p className="text-xs text-muted-foreground">Exclude files matching .gitignore patterns</p>
            </div>
            <Switch
              checked={getSetting('general', 'respectGitignore', true)}
              onCheckedChange={(checked) => updateSetting('general', 'respectGitignore', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Approval Mode</label>
              <p className="text-xs text-muted-foreground">How tool executions are approved</p>
            </div>
            <Select
              value={getSetting('general', 'defaultApprovalMode', 'default')}
              onValueChange={(value) => updateSetting('general', 'defaultApprovalMode', value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="auto_edit">Auto Edit</SelectItem>
                <SelectItem value="plan">Plan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Notifications</label>
              <p className="text-xs text-muted-foreground">Enable run-event notifications</p>
            </div>
            <Switch
              checked={getSetting('general', 'enableNotifications', false)}
              onCheckedChange={(checked) => updateSetting('general', 'enableNotifications', checked)}
            />
          </div>
        </div>
      </div>

      {/* Context Settings */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" />
          Context (GEMINI.md)
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Context File Names</label>
            <p className="text-xs text-muted-foreground mb-2">
              File names Gemini CLI looks for as instruction files (comma-separated). Default: GEMINI.md
            </p>
            <Input
              value={(() => {
                const fn = localSettings?.context?.fileName;
                if (Array.isArray(fn)) return fn.join(', ');
                return fn || '';
              })()}
              onChange={(e) => {
                const val = e.target.value;
                const arr = val ? val.split(',').map(s => s.trim()).filter(Boolean) : undefined;
                setLocalSettings(prev => ({
                  ...prev,
                  context: {
                    ...prev.context,
                    fileName: arr && arr.length === 1 ? arr[0] : arr
                  }
                }));
              }}
              placeholder="GEMINI.md"
              className="font-mono text-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Include Directory Tree</label>
              <p className="text-xs text-muted-foreground">Include directory tree in initial request context</p>
            </div>
            <Switch
              checked={localSettings?.context?.includeDirectoryTree ?? true}
              onCheckedChange={(checked) => setLocalSettings(prev => ({
                ...prev,
                context: { ...prev.context, includeDirectoryTree: checked }
              }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Memory Boundary Markers</label>
            <p className="text-xs text-muted-foreground mb-2">
              Stops GEMINI.md upward traversal at directories containing these markers (comma-separated)
            </p>
            <Input
              value={(localSettings?.context?.memoryBoundaryMarkers || []).join(', ')}
              onChange={(e) => {
                const arr = e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : undefined;
                setLocalSettings(prev => ({
                  ...prev,
                  context: { ...prev.context, memoryBoundaryMarkers: arr }
                }));
              }}
              placeholder=".git"
              className="font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Include Directories</label>
            <p className="text-xs text-muted-foreground mb-2">
              Additional workspace directories to include (comma-separated)
            </p>
            <Input
              value={(localSettings?.context?.includeDirectories || []).join(', ')}
              onChange={(e) => {
                const arr = e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : undefined;
                setLocalSettings(prev => ({
                  ...prev,
                  context: { ...prev.context, includeDirectories: arr }
                }));
              }}
              placeholder="~/shared-libs, ../common"
              className="font-mono text-sm"
            />
          </div>
        </div>
      </div>

      {/* Session Retention */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />
          Session Retention
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Enable Session Retention</label>
              <p className="text-xs text-muted-foreground">Save session history for later resumption</p>
            </div>
            <Switch
              checked={localSettings?.general?.sessionRetention?.enabled ?? true}
              onCheckedChange={(checked) => setLocalSettings(prev => ({
                ...prev,
                general: {
                  ...prev.general,
                  sessionRetention: { ...prev.general?.sessionRetention, enabled: checked }
                }
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Max Age</label>
              <p className="text-xs text-muted-foreground">How long to keep sessions (e.g. 30d, 7d, 24h)</p>
            </div>
            <Input
              value={localSettings?.general?.sessionRetention?.maxAge || ''}
              onChange={(e) => setLocalSettings(prev => ({
                ...prev,
                general: {
                  ...prev.general,
                  sessionRetention: { ...prev.general?.sessionRetention, maxAge: e.target.value || undefined }
                }
              }))}
              placeholder="30d"
              className="font-mono text-sm w-24"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Max Sessions</label>
              <p className="text-xs text-muted-foreground">Maximum number of sessions to keep</p>
            </div>
            <Input
              type="number"
              value={localSettings?.general?.sessionRetention?.maxCount ?? ''}
              onChange={(e) => setLocalSettings(prev => ({
                ...prev,
                general: {
                  ...prev.general,
                  sessionRetention: { ...prev.general?.sessionRetention, maxCount: e.target.value ? Number(e.target.value) : undefined }
                }
              }))}
              placeholder="unlimited"
              className="font-mono text-sm w-24"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Min Retention</label>
              <p className="text-xs text-muted-foreground">Minimum time to keep sessions before cleanup (e.g. 1d)</p>
            </div>
            <Input
              value={localSettings?.general?.sessionRetention?.minRetention || ''}
              onChange={(e) => setLocalSettings(prev => ({
                ...prev,
                general: {
                  ...prev.general,
                  sessionRetention: { ...prev.general?.sessionRetention, minRetention: e.target.value || undefined }
                }
              }))}
              placeholder="1d"
              className="font-mono text-sm w-24"
            />
          </div>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-500" />
          Privacy
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Usage Statistics</label>
              <p className="text-xs text-muted-foreground">Allow collection of anonymous usage data</p>
            </div>
            <Switch
              checked={getSetting('privacy', 'usageStatisticsEnabled', true)}
              onCheckedChange={(checked) => updateSetting('privacy', 'usageStatisticsEnabled', checked)}
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
              Add a new MCP server to Gemini CLI
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
