import React, { useState } from 'react';
import { Settings, Save, Loader2, Terminal, Shield, Globe, Server, Plus, Trash2, ChevronDown, ChevronRight, Rocket } from 'lucide-react';
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

const TERMINAL_POLICIES = [
  { id: 'off', name: 'Off', description: 'Never auto-execute; requires allow list' },
  { id: 'auto', name: 'Auto', description: 'Safety model determines execution' },
  { id: 'turbo', name: 'Turbo', description: 'Auto-execute unless in deny list', dangerous: true },
];

const REVIEW_POLICIES = [
  { id: 'always-proceed', name: 'Always Proceed', description: 'Agent never requests review' },
  { id: 'agent-decides', name: 'Agent Decides', description: 'Agent determines when review is needed' },
  { id: 'request-review', name: 'Request Review', description: 'Agent always requests review' },
];

const JS_POLICIES = [
  { id: 'always-proceed', name: 'Always Proceed', description: 'Maximum autonomy', dangerous: true },
  { id: 'request-review', name: 'Request Review', description: 'Ask before browser JavaScript' },
  { id: 'disabled', name: 'Disabled', description: 'Never run browser JavaScript' },
];

export default function AntigravitySettingsEditor({ settings, onSave, loading, settingsPath }) {
  const [localSettings, setLocalSettings] = useState(settings || {});
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('rich');
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

  const updateSetting = (key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getSetting = (key, defaultValue) => {
    return localSettings?.[key] ?? defaultValue;
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

    if (!config.command) {
      toast.error('MCP config must have a "command" field');
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
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              Antigravity Settings
              <Badge variant="outline" className="text-xs font-normal text-purple-600 border-purple-300 dark:border-purple-700">
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

      {/* Security Policies */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-500" />
          Security Policies
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Terminal Command Execution</label>
              <p className="text-xs text-muted-foreground">Control how the agent executes shell commands</p>
            </div>
            <Select
              value={getSetting('terminalPolicy', 'auto')}
              onValueChange={(value) => updateSetting('terminalPolicy', value)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TERMINAL_POLICIES.map(policy => (
                  <SelectItem key={policy.id} value={policy.id}>
                    <div className="flex items-center gap-2">
                      <span>{policy.name}</span>
                      {policy.dangerous && <Badge variant="destructive" className="text-xs">Risk</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Review Policy</label>
              <p className="text-xs text-muted-foreground">When the agent should request human review</p>
            </div>
            <Select
              value={getSetting('reviewPolicy', 'agent-decides')}
              onValueChange={(value) => updateSetting('reviewPolicy', value)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REVIEW_POLICIES.map(policy => (
                  <SelectItem key={policy.id} value={policy.id}>{policy.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">JavaScript Execution</label>
              <p className="text-xs text-muted-foreground">Control browser JavaScript execution</p>
            </div>
            <Select
              value={getSetting('jsPolicy', 'request-review')}
              onValueChange={(value) => updateSetting('jsPolicy', value)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JS_POLICIES.map(policy => (
                  <SelectItem key={policy.id} value={policy.id}>
                    <div className="flex items-center gap-2">
                      <span>{policy.name}</span>
                      {policy.dangerous && <Badge variant="destructive" className="text-xs">Risk</Badge>}
                    </div>
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
            <Server className="w-4 h-4 text-purple-500" />
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
                    <Server className="w-4 h-4 text-purple-500" />
                    <span className="font-medium text-sm">{name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{config.command}</span>
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

      {/* Browser Settings */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-purple-500" />
          Browser Settings
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">URL Allowlist</label>
            <p className="text-xs text-muted-foreground mb-2">Domains the agent can visit (one per line)</p>
            <Textarea
              value={getSetting('browserAllowlist', '')}
              onChange={(e) => updateSetting('browserAllowlist', e.target.value)}
              placeholder="github.com&#10;stackoverflow.com&#10;docs.python.org"
              className="font-mono text-sm"
              rows={4}
            />
          </div>
        </div>
      </div>

      {/* Agent Mode */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-purple-500" />
          Agent Behavior
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Default Mode</label>
              <p className="text-xs text-muted-foreground">Planning mode uses structured plans; Fast mode executes directly</p>
            </div>
            <Select
              value={getSetting('agentMode', 'planning')}
              onValueChange={(value) => updateSetting('agentMode', value)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="fast">Fast</SelectItem>
              </SelectContent>
            </Select>
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
              Add a new MCP server to Antigravity
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
