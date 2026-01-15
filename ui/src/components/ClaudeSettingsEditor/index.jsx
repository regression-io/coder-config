import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Settings, Zap, Code, Server, Eye, EyeOff,
  Save, RefreshCw, Check, ChevronDown, HelpCircle, Info,
  Download, Upload, AlertTriangle, Terminal, Globe, FileText
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
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import PermissionsEditor from "@/components/PermissionsEditor";

// Model options based on Claude Code docs
const MODEL_OPTIONS = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    description: 'Best balance of speed and capability',
    tier: 'sonnet',
    recommended: true
  },
  {
    id: 'claude-opus-4-5-20251101',
    name: 'Claude Opus 4.5',
    description: 'Most capable, best for complex tasks',
    tier: 'opus'
  },
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    description: 'Fastest, best for simple tasks',
    tier: 'haiku'
  }
];

// Environment variable options
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
    placeholder: 'claude-haiku-4-20241022'
  }
];

export default function ClaudeSettingsEditor({
  settings: initialSettings,
  onSave,
  loading,
  settingsPath = '~/.claude/settings.json'
}) {
  const [settings, setSettings] = useState({});
  const [activeTab, setActiveTab] = useState('permissions');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState(null);

  // Sync with prop
  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
      setJsonText(JSON.stringify(initialSettings, null, 2));
      setHasChanges(false);
    }
  }, [initialSettings]);

  // Sync JSON text when settings change
  useEffect(() => {
    if (!showJson) {
      setJsonText(JSON.stringify(settings, null, 2));
    }
  }, [settings, showJson]);

  // Update a setting
  const updateSetting = useCallback((key, value) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      // Remove key if value is empty/null/undefined
      if (value === '' || value === null || value === undefined) {
        delete updated[key];
      }
      return updated;
    });
    setHasChanges(true);
  }, []);

  // Update permissions
  const handlePermissionsChange = useCallback((permissions) => {
    setSettings(prev => ({ ...prev, permissions }));
    setHasChanges(true);
  }, []);

  // Handle JSON editor changes
  const handleJsonChange = (text) => {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      setSettings(parsed);
      setJsonError(null);
      setHasChanges(true);
    } catch (e) {
      setJsonError(e.message);
    }
  };

  // Save changes
  const handleSave = async () => {
    if (!onSave) return;
    if (jsonError) {
      toast.error('Fix JSON errors before saving');
      return;
    }

    setSaving(true);
    try {
      await onSave(settings);
      setHasChanges(false);
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Reset changes
  const handleReset = () => {
    if (initialSettings) {
      setSettings(initialSettings);
      setJsonText(JSON.stringify(initialSettings, null, 2));
      setJsonError(null);
      setHasChanges(false);
      toast.info('Changes reset');
    }
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
          {hasChanges && (
            <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
              Unsaved changes
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

          {hasChanges && (
            <>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !!jsonError}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Path info */}
      <p className="text-sm text-gray-500 dark:text-slate-400">
        Settings file: <code className="bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">{settingsPath}</code>
      </p>

      {/* Loading State */}
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
            {jsonError && (
              <Badge variant="destructive" className="text-xs">
                {jsonError}
              </Badge>
            )}
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
          <TabsList className="grid w-full grid-cols-4">
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
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="pt-4">
            <PermissionsEditor
              permissions={settings.permissions}
              onSave={handlePermissionsChange}
              loading={false}
            />
          </TabsContent>

          {/* Model Tab */}
          <TabsContent value="model" className="space-y-6 pt-4">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Default Model</Label>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
                  Select the default model for Claude Code sessions
                </p>

                <div className="grid gap-3">
                  {MODEL_OPTIONS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => updateSetting('model', model.id)}
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
                              <Badge variant="secondary" className="text-xs">
                                Recommended
                              </Badge>
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

              {/* Custom model ID */}
              <div>
                <Label>Custom Model ID</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
                  Override with a specific model ID (for AWS Bedrock, etc.)
                </p>
                <Input
                  value={settings.model || ''}
                  onChange={(e) => updateSetting('model', e.target.value)}
                  placeholder="claude-sonnet-4-20250514"
                  className="font-mono"
                />
              </div>
            </div>
          </TabsContent>

          {/* Behavior Tab */}
          <TabsContent value="behavior" className="space-y-6 pt-4">
            <div className="space-y-4">
              {/* Auto-approve settings */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                <div>
                  <Label>Auto-accept Edits</Label>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Automatically accept file edits without confirmation
                  </p>
                </div>
                <Switch
                  checked={settings.autoAcceptEdits ?? false}
                  onCheckedChange={(checked) => updateSetting('autoAcceptEdits', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                <div>
                  <Label>Verbose Output</Label>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Show detailed output for operations
                  </p>
                </div>
                <Switch
                  checked={settings.verbose ?? false}
                  onCheckedChange={(checked) => updateSetting('verbose', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                <div>
                  <Label>Enable MCP Servers</Label>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Allow Claude Code to use MCP server connections
                  </p>
                </div>
                <Switch
                  checked={settings.enableMcp ?? true}
                  onCheckedChange={(checked) => updateSetting('enableMcp', checked)}
                />
              </div>

              {/* API Settings */}
              <div className="space-y-2">
                <Label>API Base URL</Label>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Custom API endpoint (for proxies or enterprise deployments)
                </p>
                <Input
                  value={settings.apiBaseUrl || ''}
                  onChange={(e) => updateSetting('apiBaseUrl', e.target.value)}
                  placeholder="https://api.anthropic.com"
                  className="font-mono"
                />
              </div>
            </div>
          </TabsContent>

          {/* Advanced Tab */}
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
                  Configure model-related environment variables
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
                  Scripts to run before/after tool executions (JSON format)
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
  "preToolExecution": "~/.claude/hooks/pre.sh",
  "postToolExecution": "~/.claude/hooks/post.sh"
}`}
                  className="font-mono text-sm min-h-[120px]"
                />
              </div>

              {/* Custom settings */}
              <div>
                <Label className="text-base font-medium">Custom Settings</Label>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
                  Add any additional settings as JSON key-value pairs
                </p>
                <Textarea
                  value={(() => {
                    const knownFields = ['permissions', 'model', 'autoAcceptEdits', 'verbose', 'enableMcp', 'apiBaseUrl', 'env', 'hooks'];
                    const custom = Object.keys(settings)
                      .filter(k => !knownFields.includes(k))
                      .reduce((obj, k) => ({ ...obj, [k]: settings[k] }), {});
                    return Object.keys(custom).length ? JSON.stringify(custom, null, 2) : '';
                  })()}
                  onChange={(e) => {
                    try {
                      const custom = e.target.value ? JSON.parse(e.target.value) : {};
                      // Merge custom settings, preserving known fields
                      const knownFields = ['permissions', 'model', 'autoAcceptEdits', 'verbose', 'enableMcp', 'apiBaseUrl', 'env', 'hooks'];
                      const preserved = knownFields.reduce((obj, k) => {
                        if (settings[k] !== undefined) obj[k] = settings[k];
                        return obj;
                      }, {});
                      setSettings({ ...preserved, ...custom });
                      setHasChanges(true);
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
