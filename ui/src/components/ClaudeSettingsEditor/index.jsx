import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, Settings, Zap, Code, Eye,
  RefreshCw, Check, AlertTriangle, Terminal, Lock
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs, TabsList, TabsTrigger, TabsContent
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger, TooltipProvider
} from "@/components/ui/tooltip";
import {
  Alert, AlertDescription
} from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import PermissionsEditor from "@/components/PermissionsEditor";

const MODEL_OPTIONS = [
  {
    id: 'claude-opus-4-7',
    name: 'Claude Opus 4.7',
    description: 'Most capable; 1M context, adaptive thinking, Jan 2026 knowledge',
    tier: 'opus',
    recommended: true
  },
  {
    id: 'claude-opus-4-6',
    name: 'Claude Opus 4.6',
    description: 'Previous Opus; supports Fast mode',
    tier: 'opus'
  },
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    description: 'Fast output, great balance of speed and capability',
    tier: 'sonnet'
  },
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    description: 'Fastest, best for simple tasks',
    tier: 'haiku'
  }
];

// Deprecated model IDs — warn users to migrate
const DEPRECATED_MODELS = {
  'claude-3-haiku-20240307': { replacement: 'claude-haiku-4-5-20251001', retires: '2026-04-19' },
  'claude-sonnet-4-20250514': { replacement: 'claude-sonnet-4-6', retires: '2026-06-15' },
  'claude-opus-4-20250514': { replacement: 'claude-opus-4-7', retires: '2026-06-15' },
  'claude-sonnet-4-5-20250929': { replacement: 'claude-sonnet-4-6', retires: null },
};

const EFFORT_LEVELS = [
  { value: 'low', label: 'Low', description: 'Faster, less thorough' },
  { value: 'medium', label: 'Medium', description: 'Balanced' },
  { value: 'high', label: 'High', description: 'Always thinks (adaptive default)' },
  { value: 'xhigh', label: 'Extra High', description: 'Deep thinking — Opus 4.7 only' },
];

const PERMISSION_MODES = [
  { value: 'default', label: 'Default', description: 'Ask for most tool uses' },
  { value: 'plan', label: 'Plan', description: 'Read-only, no edits allowed' },
  { value: 'acceptEdits', label: 'Accept Edits', description: 'Auto-approve file edits' },
  { value: 'auto', label: 'Auto', description: 'AI classifies safe vs risky actions' },
  { value: 'dontAsk', label: "Don't Ask", description: 'Auto-approve most actions' },
  { value: 'bypassPermissions', label: 'Bypass Permissions', description: 'No restrictions (dangerous)' },
];

const TEAMMATE_MODES = [
  { value: 'auto', label: 'Auto' },
  { value: 'in-process', label: 'In-process' },
  { value: 'tmux', label: 'Tmux' },
];

const ENV_VARIABLES = [
  {
    key: 'ANTHROPIC_SMALL_FAST_MODEL',
    label: 'Small/Fast Model',
    description: 'Model for background tasks and quick operations',
    placeholder: 'claude-haiku-4-5-20251001'
  },
  {
    key: 'CLAUDE_CODE_SUBAGENT_MODEL',
    label: 'Subagent Model',
    description: 'Model used for subagent/background processing',
    placeholder: 'claude-haiku-4-5-20251001'
  },
  {
    key: 'MAX_THINKING_TOKENS',
    label: 'Max Thinking Tokens',
    description: 'Legacy extended-thinking budget (0 to disable). Ignored by Opus 4.7 — use Effort Level instead.',
    placeholder: '5000'
  },
  {
    key: 'CLAUDE_CODE_MAX_OUTPUT_TOKENS',
    label: 'Max Output Tokens',
    description: 'Maximum output tokens per response (32000-64000)',
    placeholder: '32000'
  },
  {
    key: 'BASH_DEFAULT_TIMEOUT_MS',
    label: 'Bash Default Timeout (ms)',
    description: 'Default timeout for bash commands',
    placeholder: '120000'
  },
  {
    key: 'BASH_MAX_TIMEOUT_MS',
    label: 'Bash Max Timeout (ms)',
    description: 'Maximum allowed timeout for bash commands',
    placeholder: '600000'
  },
  {
    key: 'CLAUDE_AUTOCOMPACT_PCT_OVERRIDE',
    label: 'Auto-compact Threshold (%)',
    description: 'Context usage percentage to trigger auto-compaction (1-100)',
    placeholder: '75'
  },
  {
    key: 'MCP_TIMEOUT',
    label: 'MCP Startup Timeout (ms)',
    description: 'Timeout for MCP server startup',
    placeholder: '10000'
  },
  {
    key: 'MCP_TOOL_TIMEOUT',
    label: 'MCP Tool Timeout (ms)',
    description: 'Timeout for MCP tool execution',
    placeholder: '30000'
  },
];

const KNOWN_FIELDS = [
  'permissions', 'model', 'modelOverrides', 'effortLevel', 'availableModels',
  'alwaysThinkingEnabled', 'showThinkingSummaries', 'enableAllProjectMcpServers',
  'respectGitignore', 'cleanupPeriodDays', 'plansDirectory',
  'disableAllHooks', 'language', 'teammateMode', 'outputStyle',
  'attribution', 'sandbox', 'env', 'hooks', 'voiceEnabled',
  'autoMemoryEnabled', 'autoMemoryDirectory', 'defaultShell',
  'worktree', 'autoUpdatesChannel', 'prefersReducedMotion',
  'claudeMdExcludes', 'disableSkillShellExecution',
  // Added for Claude Code + Opus 4.7 era
  'allowedMcpServers', 'deniedMcpServers',
  'disabledMcpjsonServers', 'enabledMcpjsonServers',
  'allowManagedMcpServersOnly', 'allowManagedHooksOnly',
  'allowManagedPermissionRulesOnly',
  'allowedHttpHookUrls', 'httpHookAllowedEnvVars',
  'disableAutoMode', 'useAutoModeDuringPlan',
  'forceLoginMethod', 'forceLoginOrgUUID', 'forceRemoteSettingsRefresh',
  'strictKnownMarketplaces', 'blockedMarketplaces',
  'spinnerVerbs', 'spinnerTipsOverride', 'statusLine',
];

function ToggleRow({ label, description, checked, onCheckedChange }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-slate-700">
      <div>
        <Label>{label}</Label>
        <p className="text-sm text-gray-500 dark:text-slate-400">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function ClaudeSettingsEditor({
  settings: initialSettings,
  onSave,
  loading,
  settingsPath = '~/.claude/settings.json',
  mcpServers = {}
}) {
  const [settings, setSettings] = useState({});
  const [activeTab, setActiveTab] = useState('permissions');
  const [saving, setSaving] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
      setJsonText(JSON.stringify(initialSettings, null, 2));
    }
  }, [initialSettings]);

  useEffect(() => {
    if (!showJson) {
      setJsonText(JSON.stringify(settings, null, 2));
    }
  }, [settings, showJson]);

  const autoSave = useCallback(async (newSettings) => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(newSettings);
    } catch (error) {
      toast.error('Failed to save: ' + error.message);
    } finally {
      setSaving(false);
    }
  }, [onSave]);

  const debouncedAutoSave = useCallback((newSettings) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => autoSave(newSettings), 800);
  }, [autoSave]);

  const updateSetting = useCallback((key, value, immediate = false) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      if (value === '' || value === null || value === undefined) delete updated[key];
      if (immediate) autoSave(updated);
      else debouncedAutoSave(updated);
      return updated;
    });
  }, [autoSave, debouncedAutoSave]);

  // Update a field inside a nested object (e.g. permissions.defaultMode, sandbox.enabled)
  const updateNestedSetting = useCallback((topKey, field, value, immediate = true) => {
    setSettings(prev => {
      const parent = { ...(prev[topKey] || {}), [field]: value };
      if (value === '' || value === null || value === undefined) delete parent[field];
      const updated = { ...prev };
      if (Object.keys(parent).length) updated[topKey] = parent;
      else delete updated[topKey];
      if (immediate) autoSave(updated);
      else debouncedAutoSave(updated);
      return updated;
    });
  }, [autoSave, debouncedAutoSave]);

  // Update a deeply nested field (e.g. sandbox.network.allowedDomains)
  const updateDeepNestedSetting = useCallback((topKey, midKey, field, value, immediate = true) => {
    setSettings(prev => {
      const top = { ...(prev[topKey] || {}) };
      const mid = { ...(top[midKey] || {}), [field]: value };
      if (value === '' || value === null || value === undefined) delete mid[field];
      if (Object.keys(mid).length) top[midKey] = mid;
      else delete top[midKey];
      const updated = { ...prev };
      if (Object.keys(top).length) updated[topKey] = top;
      else delete updated[topKey];
      if (immediate) autoSave(updated);
      else debouncedAutoSave(updated);
      return updated;
    });
  }, [autoSave, debouncedAutoSave]);

  const handlePermissionsChange = useCallback(async (permissions) => {
    const newSettings = { ...settings, permissions };
    setSettings(newSettings);
    await autoSave(newSettings);
  }, [settings, autoSave]);

  const handleJsonChange = (text) => {
    setJsonText(text);
    try {
      JSON.parse(text);
      setJsonError(null);
    } catch (e) {
      setJsonError(e.message);
    }
  };

  const handleApplyJson = async () => {
    if (jsonError) {
      toast.error('Fix JSON errors before saving');
      return;
    }
    try {
      const parsed = JSON.parse(jsonText);
      setSettings(parsed);
      await autoSave(parsed);
      toast.success('Settings applied');
    } catch (e) {
      toast.error('Invalid JSON');
    }
  };

  // Parse comma-separated string to array, or undefined if empty
  const csvToArray = (str) => {
    const arr = str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];
    return arr.length ? arr : undefined;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
            <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Claude Code Settings</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Configure Claude Code behavior globally
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saving && (
            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              Saving...
            </Badge>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowJson(!showJson)}
                >
                  {showJson ? <Eye className="w-4 h-4" /> : <Code className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showJson ? 'Show UI' : 'Show JSON'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <p className="text-sm text-gray-500 dark:text-slate-400">
        Settings file: <code className="bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">{settingsPath}</code>
      </p>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {/* JSON Editor View */}
      {!loading && showJson && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Raw JSON</Label>
            <div className="flex items-center gap-2">
              {jsonError && (
                <Badge variant="destructive" className="text-xs">
                  {jsonError}
                </Badge>
              )}
              <Button
                size="sm"
                onClick={handleApplyJson}
                disabled={saving || !!jsonError}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Check className="w-4 h-4 mr-1" />
                Apply JSON
              </Button>
            </div>
          </div>
          <Textarea
            value={jsonText}
            onChange={(e) => handleJsonChange(e.target.value)}
            className={cn(
              "font-mono text-sm min-h-[400px]",
              jsonError && "border-red-300 focus:border-red-500"
            )}
          />
        </div>
      )}

      {/* UI Editor View */}
      {!loading && !showJson && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="model" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Model
            </TabsTrigger>
            <TabsTrigger value="behavior" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Behavior
            </TabsTrigger>
            <TabsTrigger value="sandbox" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Sandbox
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* ──────────────── Permissions Tab ──────────────── */}
          <TabsContent value="permissions" className="space-y-6 pt-4">
            <PermissionsEditor
              permissions={settings.permissions}
              onSave={handlePermissionsChange}
              loading={false}
              mcpServers={mcpServers}
            />

            <div className="space-y-4 pt-2">
              <Label className="text-base font-medium">Permission Defaults</Label>

              <div className="space-y-2">
                <Label className="text-sm">Default Permission Mode</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">Starting permission mode for new sessions</p>
                <Select
                  value={settings.permissions?.defaultMode || 'default'}
                  onValueChange={(v) => updateNestedSetting('permissions', 'defaultMode', v === 'default' ? undefined : v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERMISSION_MODES.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ToggleRow
                label="Disable Bypass Permissions Mode"
                description="Prevent using dangerously-skip-permissions flag"
                checked={settings.permissions?.disableBypassPermissionsMode === 'disable'}
                onCheckedChange={(checked) =>
                  updateNestedSetting('permissions', 'disableBypassPermissionsMode', checked ? 'disable' : undefined)
                }
              />

              <div className="space-y-2">
                <Label className="text-sm">Additional Directories</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">Extra paths Claude can access (comma-separated)</p>
                <Input
                  value={(settings.permissions?.additionalDirectories || []).join(', ')}
                  onChange={(e) => updateNestedSetting('permissions', 'additionalDirectories', csvToArray(e.target.value), false)}
                  placeholder="~/other-project, /shared/docs"
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </TabsContent>

          {/* ──────────────── Model Tab ──────────────── */}
          <TabsContent value="model" className="space-y-6 pt-4">
            <div className="space-y-6">
              {/* Model selection cards */}
              <div>
                <Label className="text-base font-medium">Default Model</Label>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
                  Select the default model for Claude Code sessions
                </p>
                <div className="grid gap-3">
                  {MODEL_OPTIONS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => updateSetting('model', model.id, true)}
                      className={cn(
                        "w-full p-4 rounded-lg border text-left transition-all",
                        settings.model === model.id
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50"
                          : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{model.name}</span>
                            {model.recommended && (
                              <Badge variant="secondary" className="text-xs">Recommended</Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                model.tier === 'opus' && "border-purple-300 text-purple-700",
                                model.tier === 'sonnet' && "border-blue-300 text-blue-700",
                                model.tier === 'haiku' && "border-green-300 text-green-700"
                              )}
                            >
                              {model.tier}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{model.description}</p>
                        </div>
                        {settings.model === model.id && (
                          <Check className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Deprecated model warning */}
              {settings.model && DEPRECATED_MODELS[settings.model] && (
                <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    <strong>{settings.model}</strong> is deprecated
                    {DEPRECATED_MODELS[settings.model].retires && ` (retires ${DEPRECATED_MODELS[settings.model].retires})`}.
                    Migrate to <code>{DEPRECATED_MODELS[settings.model].replacement}</code>.
                  </AlertDescription>
                </Alert>
              )}

              {/* Effort Level */}
              <div>
                <Label className="text-base font-medium">Effort Level</Label>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
                  Reasoning effort (adaptive thinking). Opus 4.7 supports <code>xhigh</code>; <code>budget_tokens</code>/manual thinking is deprecated.
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {EFFORT_LEVELS.map(level => (
                    <button
                      key={level.value}
                      onClick={() => updateSetting('effortLevel', level.value, true)}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all",
                        settings.effortLevel === level.value
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50"
                          : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                      )}
                    >
                      <span className="font-medium text-sm">{level.label}</span>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{level.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Extended Thinking */}
              <ToggleRow
                label="Always Enable Extended Thinking"
                description="Enable extended thinking by default for all conversations"
                checked={settings.alwaysThinkingEnabled ?? false}
                onCheckedChange={(checked) => updateSetting('alwaysThinkingEnabled', checked, true)}
              />

              {/* Available Models */}
              <div className="space-y-2">
                <Label>Restrict Available Models</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Comma-separated list of model aliases users can select (empty = all)
                </p>
                <Input
                  value={(settings.availableModels || []).join(', ')}
                  onChange={(e) => updateSetting('availableModels', csvToArray(e.target.value))}
                  placeholder="opus, sonnet, haiku"
                  className="font-mono text-sm"
                />
              </div>

              {/* Custom model ID */}
              <div className="space-y-2">
                <Label>Custom Model ID</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Override with a specific model ID (for AWS Bedrock, etc.)
                </p>
                <Input
                  value={settings.model || ''}
                  onChange={(e) => updateSetting('model', e.target.value)}
                  placeholder="claude-opus-4-7"
                  className="font-mono"
                />
              </div>
            </div>
          </TabsContent>

          {/* ──────────────── Behavior Tab ──────────────── */}
          <TabsContent value="behavior" className="space-y-6 pt-4">
            <div className="space-y-4">
              {/* Session Behavior */}
              <Label className="text-base font-medium">Session Behavior</Label>

              <ToggleRow
                label="Respect .gitignore"
                description="Honor .gitignore patterns when searching files"
                checked={settings.respectGitignore ?? true}
                onCheckedChange={(checked) => updateSetting('respectGitignore', checked, true)}
              />

              <ToggleRow
                label="Show Thinking Summaries"
                description="Display summaries of extended thinking"
                checked={settings.showThinkingSummaries ?? false}
                onCheckedChange={(checked) => updateSetting('showThinkingSummaries', checked, true)}
              />

              <ToggleRow
                label="Voice Dictation"
                description="Enable push-to-talk voice input"
                checked={settings.voiceEnabled ?? false}
                onCheckedChange={(checked) => updateSetting('voiceEnabled', checked, true)}
              />

              <ToggleRow
                label="Reduced Motion"
                description="Reduce UI animations"
                checked={settings.prefersReducedMotion ?? false}
                onCheckedChange={(checked) => updateSetting('prefersReducedMotion', checked, true)}
              />

              {/* Memory */}
              <Label className="text-base font-medium pt-2">Memory</Label>

              <ToggleRow
                label="Auto Memory"
                description="Allow Claude to automatically save notes across sessions"
                checked={settings.autoMemoryEnabled ?? true}
                onCheckedChange={(checked) => updateSetting('autoMemoryEnabled', checked, true)}
              />

              <div className="space-y-2">
                <Label className="text-sm">Auto Memory Directory</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">Custom path for auto-memory storage</p>
                <Input
                  value={settings.autoMemoryDirectory || ''}
                  onChange={(e) => updateSetting('autoMemoryDirectory', e.target.value)}
                  placeholder="~/.claude/projects/<project>/memory"
                  className="font-mono text-sm"
                />
              </div>

              {/* MCP & Servers */}
              <Label className="text-base font-medium pt-2">MCP & Servers</Label>

              <ToggleRow
                label="Enable All Project MCP Servers"
                description="Auto-approve all MCP servers defined in project .mcp.json"
                checked={settings.enableAllProjectMcpServers ?? false}
                onCheckedChange={(checked) => updateSetting('enableAllProjectMcpServers', checked, true)}
              />

              {/* Hooks */}
              <Label className="text-base font-medium pt-2">Hooks</Label>

              <ToggleRow
                label="Disable All Hooks"
                description="Kill switch to disable all hook scripts"
                checked={settings.disableAllHooks ?? false}
                onCheckedChange={(checked) => updateSetting('disableAllHooks', checked, true)}
              />

              {/* Display & Language */}
              <Label className="text-base font-medium pt-2">Display</Label>

              <div className="space-y-2">
                <Label className="text-sm">Language</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">Response language preference</p>
                <Input
                  value={settings.language || ''}
                  onChange={(e) => updateSetting('language', e.target.value)}
                  placeholder="english"
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Output Style</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">Named output style for responses</p>
                <Input
                  value={settings.outputStyle || ''}
                  onChange={(e) => updateSetting('outputStyle', e.target.value)}
                  placeholder="concise"
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Teammate Mode</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">How agent team teammates are displayed</p>
                <Select
                  value={settings.teammateMode || 'auto'}
                  onValueChange={(v) => updateSetting('teammateMode', v === 'auto' ? undefined : v, true)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEAMMATE_MODES.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Default Shell</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">Shell used for bash commands</p>
                <Select
                  value={settings.defaultShell || 'bash'}
                  onValueChange={(v) => updateSetting('defaultShell', v === 'bash' ? undefined : v, true)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bash">Bash</SelectItem>
                    <SelectItem value="powershell">PowerShell</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Auto-updates Channel</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">Release channel for auto-updates</p>
                <Select
                  value={settings.autoUpdatesChannel || 'latest'}
                  onValueChange={(v) => updateSetting('autoUpdatesChannel', v === 'latest' ? undefined : v, true)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">Latest (default)</SelectItem>
                    <SelectItem value="stable">Stable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Worktree */}
              <Label className="text-base font-medium pt-2">Worktree</Label>

              <div className="space-y-2">
                <Label className="text-sm">Symlink Directories</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">Directories to symlink into worktrees (comma-separated)</p>
                <Input
                  value={(settings.worktree?.symlinkDirectories || []).join(', ')}
                  onChange={(e) => updateNestedSetting('worktree', 'symlinkDirectories', csvToArray(e.target.value), false)}
                  placeholder="node_modules, .venv"
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Sparse Paths</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">Git sparse-checkout paths for worktrees (comma-separated)</p>
                <Input
                  value={(settings.worktree?.sparsePaths || []).join(', ')}
                  onChange={(e) => updateNestedSetting('worktree', 'sparsePaths', csvToArray(e.target.value), false)}
                  placeholder="src/, lib/"
                  className="font-mono text-sm"
                />
              </div>

              {/* Paths & Cleanup */}
              <Label className="text-base font-medium pt-2">Paths & Cleanup</Label>

              <div className="space-y-2">
                <Label className="text-sm">Plans Directory</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">Directory where plan files are saved</p>
                <Input
                  value={settings.plansDirectory || ''}
                  onChange={(e) => updateSetting('plansDirectory', e.target.value)}
                  placeholder="./plans"
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Cleanup Period (days)</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">Auto-cleanup interval for old session data (min: 1)</p>
                <Input
                  type="number"
                  min="1"
                  value={settings.cleanupPeriodDays ?? ''}
                  onChange={(e) => updateSetting('cleanupPeriodDays', e.target.value ? Math.max(1, Number(e.target.value)) : undefined)}
                  placeholder="30"
                  className="font-mono text-sm w-32"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">CLAUDE.md Excludes</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">Glob patterns to skip specific CLAUDE.md files (comma-separated)</p>
                <Input
                  value={(settings.claudeMdExcludes || []).join(', ')}
                  onChange={(e) => updateSetting('claudeMdExcludes', csvToArray(e.target.value))}
                  placeholder="packages/legacy/CLAUDE.md"
                  className="font-mono text-sm"
                />
              </div>

              <ToggleRow
                label="Disable Skill Shell Execution"
                description="Prevent skills/commands from running shell commands"
                checked={settings.disableSkillShellExecution ?? false}
                onCheckedChange={(checked) => updateSetting('disableSkillShellExecution', checked, true)}
              />

              {/* Attribution */}
              <Label className="text-base font-medium pt-2">Attribution</Label>

              <div className="space-y-2">
                <Label className="text-sm">Commit Attribution</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">Template appended to commit messages</p>
                <Textarea
                  value={settings.attribution?.commit || ''}
                  onChange={(e) => updateNestedSetting('attribution', 'commit', e.target.value || undefined, false)}
                  placeholder="Generated with AI&#10;&#10;Co-Authored-By: AI <ai@example.com>"
                  className="font-mono text-sm min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">PR Attribution</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">Template appended to pull request descriptions</p>
                <Textarea
                  value={settings.attribution?.pr || ''}
                  onChange={(e) => updateNestedSetting('attribution', 'pr', e.target.value || undefined, false)}
                  placeholder="Generated with Claude Code"
                  className="font-mono text-sm min-h-[60px]"
                />
              </div>
            </div>
          </TabsContent>

          {/* ──────────────── Sandbox Tab ──────────────── */}
          <TabsContent value="sandbox" className="space-y-6 pt-4">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Sandbox Configuration</Label>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Filesystem and network sandboxing for Claude Code commands
                </p>
              </div>

              <ToggleRow
                label="Enable Sandbox"
                description="Restrict filesystem and network access for bash commands"
                checked={settings.sandbox?.enabled ?? false}
                onCheckedChange={(checked) => updateNestedSetting('sandbox', 'enabled', checked)}
              />

              <ToggleRow
                label="Auto-allow Bash When Sandboxed"
                description="Automatically approve bash commands when sandbox is active"
                checked={settings.sandbox?.autoAllowBashIfSandboxed ?? true}
                onCheckedChange={(checked) => updateNestedSetting('sandbox', 'autoAllowBashIfSandboxed', checked)}
              />

              <ToggleRow
                label="Fail If Sandbox Unavailable"
                description="Exit if the sandbox environment cannot be started"
                checked={settings.sandbox?.failIfUnavailable ?? false}
                onCheckedChange={(checked) => updateNestedSetting('sandbox', 'failIfUnavailable', checked)}
              />

              {/* Filesystem */}
              <Label className="text-base font-medium pt-2">Filesystem Rules</Label>

              <div className="space-y-2">
                <Label className="text-sm">Allow Write</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">Additional writable paths (comma-separated)</p>
                <Input
                  value={(settings.sandbox?.filesystem?.allowWrite || []).join(', ')}
                  onChange={(e) => updateDeepNestedSetting('sandbox', 'filesystem', 'allowWrite', csvToArray(e.target.value), false)}
                  placeholder="/tmp/builds, ~/output"
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Deny Write</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">Blocked write paths (comma-separated)</p>
                <Input
                  value={(settings.sandbox?.filesystem?.denyWrite || []).join(', ')}
                  onChange={(e) => updateDeepNestedSetting('sandbox', 'filesystem', 'denyWrite', csvToArray(e.target.value), false)}
                  placeholder="~/.ssh, ~/.gnupg"
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Deny Read</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">Blocked read paths (comma-separated)</p>
                <Input
                  value={(settings.sandbox?.filesystem?.denyRead || []).join(', ')}
                  onChange={(e) => updateDeepNestedSetting('sandbox', 'filesystem', 'denyRead', csvToArray(e.target.value), false)}
                  placeholder="~/.ssh, ~/.gnupg, ~/.aws"
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Allow Read (within denied)</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">Re-allow specific paths within denyRead (comma-separated)</p>
                <Input
                  value={(settings.sandbox?.filesystem?.allowRead || []).join(', ')}
                  onChange={(e) => updateDeepNestedSetting('sandbox', 'filesystem', 'allowRead', csvToArray(e.target.value), false)}
                  placeholder="~/.ssh/known_hosts"
                  className="font-mono text-sm"
                />
              </div>

              {/* Network */}
              <Label className="text-base font-medium pt-2">Network Rules</Label>

              <div className="space-y-2">
                <Label className="text-sm">Allowed Domains</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Domains accessible in sandbox mode (comma-separated, supports wildcards)
                </p>
                <Input
                  value={(settings.sandbox?.network?.allowedDomains || []).join(', ')}
                  onChange={(e) => updateDeepNestedSetting('sandbox', 'network', 'allowedDomains', csvToArray(e.target.value), false)}
                  placeholder="github.com, *.npmjs.org, registry.yarnpkg.com"
                  className="font-mono text-sm"
                />
              </div>

              <ToggleRow
                label="Allow Local Port Binding"
                description="Allow sandboxed commands to bind to local ports"
                checked={settings.sandbox?.network?.allowLocalBinding ?? false}
                onCheckedChange={(checked) => updateDeepNestedSetting('sandbox', 'network', 'allowLocalBinding', checked)}
              />

              <ToggleRow
                label="Allow All Unix Sockets"
                description="Allow sandboxed commands to use any Unix socket"
                checked={settings.sandbox?.network?.allowAllUnixSockets ?? false}
                onCheckedChange={(checked) => updateDeepNestedSetting('sandbox', 'network', 'allowAllUnixSockets', checked)}
              />

              <div className="space-y-2">
                <Label className="text-sm">Allowed Unix Sockets</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Specific Unix sockets accessible in sandbox (comma-separated)
                </p>
                <Input
                  value={(settings.sandbox?.network?.allowUnixSockets || []).join(', ')}
                  onChange={(e) => updateDeepNestedSetting('sandbox', 'network', 'allowUnixSockets', csvToArray(e.target.value), false)}
                  placeholder="~/.ssh/agent-socket"
                  className="font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">HTTP Proxy Port</Label>
                  <Input
                    type="number"
                    value={settings.sandbox?.network?.httpProxyPort ?? ''}
                    onChange={(e) => updateDeepNestedSetting('sandbox', 'network', 'httpProxyPort', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="8080"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">SOCKS Proxy Port</Label>
                  <Input
                    type="number"
                    value={settings.sandbox?.network?.socksProxyPort ?? ''}
                    onChange={(e) => updateDeepNestedSetting('sandbox', 'network', 'socksProxyPort', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="8081"
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              {/* Advanced sandbox */}
              <Label className="text-base font-medium pt-2">Advanced</Label>

              <div className="space-y-2">
                <Label className="text-sm">Excluded Commands</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Commands excluded from sandbox restrictions (comma-separated)
                </p>
                <Input
                  value={(settings.sandbox?.excludedCommands || []).join(', ')}
                  onChange={(e) => updateNestedSetting('sandbox', 'excludedCommands', csvToArray(e.target.value), false)}
                  placeholder="git, docker"
                  className="font-mono text-sm"
                />
              </div>

              <ToggleRow
                label="Allow Unsandboxed Commands"
                description="Allow running commands outside the sandbox when needed"
                checked={settings.sandbox?.allowUnsandboxedCommands ?? false}
                onCheckedChange={(checked) => updateNestedSetting('sandbox', 'allowUnsandboxedCommands', checked)}
              />

              <ToggleRow
                label="Enable Weaker Nested Sandbox"
                description="Use less restrictive sandbox for Docker/WSL2 (Linux)"
                checked={settings.sandbox?.enableWeakerNestedSandbox ?? false}
                onCheckedChange={(checked) => updateNestedSetting('sandbox', 'enableWeakerNestedSandbox', checked)}
              />

              <ToggleRow
                label="Enable Weaker Network Isolation"
                description="Allow TLS trust service access in sandbox (macOS)"
                checked={settings.sandbox?.enableWeakerNetworkIsolation ?? false}
                onCheckedChange={(checked) => updateNestedSetting('sandbox', 'enableWeakerNetworkIsolation', checked)}
              />
            </div>
          </TabsContent>

          {/* ──────────────── Advanced Tab ──────────────── */}
          <TabsContent value="advanced" className="space-y-6 pt-4">
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Advanced settings for power users. Incorrect values may cause Claude Code to malfunction.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              {/* Environment Variables */}
              <div>
                <Label className="text-base font-medium">Environment Variables</Label>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
                  Configure model, timeout, and runtime environment variables
                </p>

                <div className="space-y-3">
                  {ENV_VARIABLES.map((envVar) => (
                    <div key={envVar.key} className="space-y-1">
                      <Label className="text-sm">{envVar.label}</Label>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{envVar.description}</p>
                      <Input
                        value={settings.env?.[envVar.key] || ''}
                        onChange={(e) => {
                          const env = { ...(settings.env || {}), [envVar.key]: e.target.value };
                          if (!e.target.value) delete env[envVar.key];
                          updateSetting('env', Object.keys(env).length ? env : undefined);
                        }}
                        placeholder={envVar.placeholder}
                        className="font-mono text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Hooks */}
              <div>
                <Label className="text-base font-medium">Hooks</Label>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
                  Scripts to run on events (JSON). Events: PreToolUse, PostToolUse, UserPromptSubmit,
                  SessionStart, SessionEnd, Stop, SubagentStart, SubagentStop, PermissionRequest,
                  FileChanged, CwdChanged, TaskCreated, TaskCompleted, Elicitation, ElicitationResult,
                  WorktreeCreate, WorktreeRemove. Types: command | http | prompt | agent.
                </p>
                <Textarea
                  value={settings.hooks ? JSON.stringify(settings.hooks, null, 2) : ''}
                  onChange={(e) => {
                    try {
                      const hooks = e.target.value ? JSON.parse(e.target.value) : undefined;
                      updateSetting('hooks', hooks);
                    } catch (err) {
                      // Allow invalid JSON while typing
                    }
                  }}
                  placeholder={`{
  "PreToolUse": [{ "matcher": "Bash", "hooks": [{ "type": "command", "command": "~/.claude/hooks/pre.sh" }] }],
  "PostToolUse": [{ "matcher": "Bash", "hooks": [{ "type": "command", "command": "~/.claude/hooks/post.sh" }] }]
}`}
                  className="font-mono text-sm min-h-[120px]"
                />
              </div>

              {/* MCP allow/deny */}
              <div>
                <Label className="text-base font-medium">MCP Server Allow/Deny</Label>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
                  Lock down which MCP servers Claude Code can use (deny wins over allow)
                </p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Allowed MCP Servers</Label>
                    <Input
                      value={(settings.allowedMcpServers || []).join(', ')}
                      onChange={(e) => updateSetting('allowedMcpServers', csvToArray(e.target.value))}
                      placeholder="github, filesystem"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Denied MCP Servers</Label>
                    <Input
                      value={(settings.deniedMcpServers || []).join(', ')}
                      onChange={(e) => updateSetting('deniedMcpServers', csvToArray(e.target.value))}
                      placeholder="untrusted-server"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Disabled .mcp.json Servers</Label>
                    <Input
                      value={(settings.disabledMcpjsonServers || []).join(', ')}
                      onChange={(e) => updateSetting('disabledMcpjsonServers', csvToArray(e.target.value))}
                      placeholder="server-name"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Enabled .mcp.json Servers</Label>
                    <Input
                      value={(settings.enabledMcpjsonServers || []).join(', ')}
                      onChange={(e) => updateSetting('enabledMcpjsonServers', csvToArray(e.target.value))}
                      placeholder="server-name"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* HTTP Hook Security */}
              <div>
                <Label className="text-base font-medium">HTTP Hook Security</Label>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
                  Whitelist targets and env vars exposed to HTTP hooks
                </p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Allowed HTTP Hook URLs</Label>
                    <Input
                      value={(settings.allowedHttpHookUrls || []).join(', ')}
                      onChange={(e) => updateSetting('allowedHttpHookUrls', csvToArray(e.target.value))}
                      placeholder="https://hooks.internal, https://ci.example.com"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">HTTP Hook Allowed Env Vars</Label>
                    <Input
                      value={(settings.httpHookAllowedEnvVars || []).join(', ')}
                      onChange={(e) => updateSetting('httpHookAllowedEnvVars', csvToArray(e.target.value))}
                      placeholder="CI, GITHUB_TOKEN"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Managed-mode lockdowns */}
              <div>
                <Label className="text-base font-medium">Managed-Mode Lockdowns</Label>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
                  For enterprise-managed settings. Forces only managed config to load.
                </p>
                <div className="space-y-2">
                  <ToggleRow
                    label="Allow Managed Hooks Only"
                    description="Only hooks from managed settings + SDK are loaded"
                    checked={settings.allowManagedHooksOnly ?? false}
                    onCheckedChange={(checked) => updateSetting('allowManagedHooksOnly', checked || undefined, true)}
                  />
                  <ToggleRow
                    label="Allow Managed MCP Servers Only"
                    description="Only MCP servers from managed settings are loaded"
                    checked={settings.allowManagedMcpServersOnly ?? false}
                    onCheckedChange={(checked) => updateSetting('allowManagedMcpServersOnly', checked || undefined, true)}
                  />
                  <ToggleRow
                    label="Allow Managed Permission Rules Only"
                    description="Only permission rules from managed settings apply"
                    checked={settings.allowManagedPermissionRulesOnly ?? false}
                    onCheckedChange={(checked) => updateSetting('allowManagedPermissionRulesOnly', checked || undefined, true)}
                  />
                  <ToggleRow
                    label="Disable Auto Mode"
                    description="Prevent Auto permission mode from activating"
                    checked={settings.disableAutoMode === 'disable'}
                    onCheckedChange={(checked) => updateSetting('disableAutoMode', checked ? 'disable' : undefined, true)}
                  />
                  <ToggleRow
                    label="Force Remote Settings Refresh"
                    description="Fail-closed on startup if remote managed settings cannot be fetched"
                    checked={settings.forceRemoteSettingsRefresh ?? false}
                    onCheckedChange={(checked) => updateSetting('forceRemoteSettingsRefresh', checked || undefined, true)}
                  />
                  <div className="space-y-2">
                    <Label className="text-sm">Force Login Method</Label>
                    <Select
                      value={settings.forceLoginMethod || 'none'}
                      onValueChange={(v) => updateSetting('forceLoginMethod', v === 'none' ? undefined : v, true)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">(not forced)</SelectItem>
                        <SelectItem value="claudeai">claude.ai only</SelectItem>
                        <SelectItem value="console">Console only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Force Login Org UUID(s)</Label>
                    <Input
                      value={(Array.isArray(settings.forceLoginOrgUUID)
                        ? settings.forceLoginOrgUUID
                        : settings.forceLoginOrgUUID ? [settings.forceLoginOrgUUID] : []).join(', ')}
                      onChange={(e) => {
                        const arr = csvToArray(e.target.value);
                        updateSetting('forceLoginOrgUUID', !arr ? undefined : (arr.length === 1 ? arr[0] : arr));
                      }}
                      placeholder="uuid-1, uuid-2"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Custom settings */}
              <div>
                <Label className="text-base font-medium">Custom Settings</Label>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
                  Any additional settings as JSON key-value pairs
                </p>
                <Textarea
                  value={(() => {
                    const custom = Object.keys(settings)
                      .filter(k => !KNOWN_FIELDS.includes(k))
                      .reduce((obj, k) => ({ ...obj, [k]: settings[k] }), {});
                    return Object.keys(custom).length ? JSON.stringify(custom, null, 2) : '';
                  })()}
                  onChange={(e) => {
                    try {
                      const custom = e.target.value ? JSON.parse(e.target.value) : {};
                      const preserved = KNOWN_FIELDS.reduce((obj, k) => {
                        if (settings[k] !== undefined) obj[k] = settings[k];
                        return obj;
                      }, {});
                      const updated = { ...preserved, ...custom };
                      setSettings(updated);
                      debouncedAutoSave(updated);
                    } catch (err) {
                      // Allow invalid JSON while typing
                    }
                  }}
                  placeholder={`{
  "customKey": "customValue"
}`}
                  className="font-mono text-sm min-h-[100px]"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
