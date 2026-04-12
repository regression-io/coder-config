import React, { useState, useEffect, useCallback } from 'react';
import {
  GitBranch, Play, Square, Copy, ChevronDown, ChevronRight,
  Plus, Trash2, Loader2, CheckCircle2, XCircle, Settings,
  Save, Upload, Zap
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api";

const TASK_TYPES = [
  { key: 'default', label: 'Default', description: 'General purpose tasks' },
  { key: 'background', label: 'Background', description: 'Background processing' },
  { key: 'think', label: 'Think', description: 'Deep reasoning tasks' },
  { key: 'longContext', label: 'Long Context', description: 'Large context windows' },
  { key: 'webSearch', label: 'Web Search', description: 'Web search tasks' },
  { key: 'image', label: 'Image', description: 'Image processing tasks' },
];

export default function RouterView() {
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState({});
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  // Provider dialog
  const [addProviderOpen, setAddProviderOpen] = useState(false);
  const [providerForm, setProviderForm] = useState({
    name: '', api_base_url: '', api_key: '', models: ''
  });
  const [savingProvider, setSavingProvider] = useState(false);

  // Preset dialog
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  // Collapsible state
  const [providersOpen, setProvidersOpen] = useState(true);
  const [presetsOpen, setPresetsOpen] = useState(false);

  // Long context threshold
  const [longContextThreshold, setLongContextThreshold] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [s, c, p] = await Promise.all([
        api.getRouterStatus(),
        api.getRouterConfig(),
        api.getRouterPresets(),
      ]);
      setStatus(s);
      setConfig(c);
      setPresets(p.presets || []);
      // Extract longContext threshold if present
      if (c?.Rules?.longContext?.threshold) {
        setLongContextThreshold(String(c.Rules.longContext.threshold));
      }
    } catch (e) {
      // CCR may not be installed
      setStatus({ installed: false, running: false, configExists: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Build provider,model options from config
  const providerModelOptions = [];
  if (config?.Providers) {
    for (const provider of config.Providers) {
      for (const model of (provider.models || [])) {
        providerModelOptions.push(`${provider.name},${model}`);
      }
    }
  }

  const handleToggleProxy = async () => {
    setToggling(true);
    try {
      if (status?.running) {
        await api.stopRouter();
        toast.success('Router proxy stopped');
      } else {
        await api.startRouter();
        toast.success('Router proxy started');
      }
      await loadData();
    } catch (e) {
      toast.error('Failed to toggle proxy: ' + e.message);
    } finally {
      setToggling(false);
    }
  };

  const handleCopyActivation = () => {
    navigator.clipboard.writeText('eval "$(coder-config router activate)"');
    toast.success('Activation command copied to clipboard');
  };

  const handleSetRule = async (task, providerModel) => {
    try {
      await api.setRouterRule(task, providerModel);
      toast.success(`Rule updated for ${task}`);
      await loadData();
    } catch (e) {
      toast.error('Failed to set rule: ' + e.message);
    }
  };

  const handleAddProvider = async () => {
    if (!providerForm.name || !providerForm.api_base_url) {
      toast.error('Name and API base URL are required');
      return;
    }
    setSavingProvider(true);
    try {
      const models = providerForm.models
        .split(',')
        .map(m => m.trim())
        .filter(Boolean);
      await api.addRouterProvider(providerForm.name, {
        api_base_url: providerForm.api_base_url,
        api_key: providerForm.api_key,
        models,
      });
      toast.success(`Provider "${providerForm.name}" added`);
      setAddProviderOpen(false);
      setProviderForm({ name: '', api_base_url: '', api_key: '', models: '' });
      await loadData();
    } catch (e) {
      toast.error('Failed to add provider: ' + e.message);
    } finally {
      setSavingProvider(false);
    }
  };

  const handleRemoveProvider = async (name) => {
    try {
      await api.removeRouterProvider(name);
      toast.success(`Provider "${name}" removed`);
      await loadData();
    } catch (e) {
      toast.error('Failed to remove provider: ' + e.message);
    }
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      toast.error('Preset name is required');
      return;
    }
    try {
      await api.saveRouterPreset(presetName.trim());
      toast.success(`Preset "${presetName}" saved`);
      setSavePresetOpen(false);
      setPresetName('');
      await loadData();
    } catch (e) {
      toast.error('Failed to save preset: ' + e.message);
    }
  };

  const handleLoadPreset = async (name) => {
    try {
      await api.loadRouterPreset(name);
      toast.success(`Preset "${name}" loaded`);
      await loadData();
    } catch (e) {
      toast.error('Failed to load preset: ' + e.message);
    }
  };

  const getRuleValue = (taskKey) => {
    const rules = config?.Rules || {};
    const rule = rules[taskKey];
    if (!rule) return null;
    if (typeof rule === 'string') return rule;
    if (rule.provider && rule.model) return `${rule.provider},${rule.model}`;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <GitBranch className="w-6 h-6" />
            Code Router
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Route AI requests to different providers based on task type
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <Zap className="w-4 h-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Status Bar */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Installation:</span>
              {status?.installed ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Installed
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                  <XCircle className="w-3 h-3 mr-1" />
                  Not Found
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Proxy:</span>
              {status?.running ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Running
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                  <XCircle className="w-3 h-3 mr-1" />
                  Stopped
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyActivation}
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy Activation
            </Button>
            <Button
              size="sm"
              disabled={!status?.installed || toggling}
              onClick={handleToggleProxy}
              variant={status?.running ? 'destructive' : 'default'}
            >
              {toggling ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : status?.running ? (
                <Square className="w-4 h-4 mr-1" />
              ) : (
                <Play className="w-4 h-4 mr-1" />
              )}
              {status?.running ? 'Stop' : 'Start'}
            </Button>
          </div>
        </div>
      </div>

      {/* Routing Rules */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Routing Rules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {TASK_TYPES.map(({ key, label, description }) => {
            const currentValue = getRuleValue(key);
            return (
              <div
                key={key}
                className="rounded-md border border-border bg-background p-3 space-y-2"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">{label}</div>
                  <div className="text-xs text-muted-foreground">{description}</div>
                </div>
                <Select
                  value={currentValue || '__none__'}
                  onValueChange={(val) => handleSetRule(key, val === '__none__' ? '' : val)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Not set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not set</SelectItem>
                    {providerModelOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {key === 'longContext' && (
                  <Input
                    type="number"
                    placeholder="Token threshold"
                    className="h-8 text-xs"
                    value={longContextThreshold}
                    onChange={(e) => {
                      setLongContextThreshold(e.target.value);
                    }}
                    onBlur={async () => {
                      if (longContextThreshold) {
                        try {
                          const newConfig = { ...config };
                          if (!newConfig.Rules) newConfig.Rules = {};
                          if (!newConfig.Rules.longContext) newConfig.Rules.longContext = {};
                          newConfig.Rules.longContext.threshold = parseInt(longContextThreshold, 10);
                          await api.saveRouterConfig(newConfig);
                          toast.success('Long context threshold updated');
                          await loadData();
                        } catch (e) {
                          toast.error('Failed to update threshold: ' + e.message);
                        }
                      }
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Providers */}
      <Collapsible open={providersOpen} onOpenChange={setProvidersOpen}>
        <div className="rounded-lg border border-border bg-card">
          <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors rounded-t-lg">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              {providersOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              Providers
              <Badge variant="secondary" className="ml-2">
                {(config?.Providers || []).length}
              </Badge>
            </h3>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-3">
              {(config?.Providers || []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No providers configured</p>
              ) : (
                (config?.Providers || []).map((provider) => (
                  <div
                    key={provider.name}
                    className="rounded-md border border-border bg-background p-3 flex items-start justify-between"
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-foreground">{provider.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{provider.api_base_url}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {(provider.models || []).length} model{(provider.models || []).length !== 1 ? 's' : ''}
                        </Badge>
                        {provider.transformers && provider.transformers.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {provider.transformers.length} transformer{provider.transformers.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      {(provider.models || []).length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {provider.models.join(', ')}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => handleRemoveProvider(provider.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddProviderOpen(true)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Provider
              </Button>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Presets */}
      <Collapsible open={presetsOpen} onOpenChange={setPresetsOpen}>
        <div className="rounded-lg border border-border bg-card">
          <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors rounded-t-lg">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              {presetsOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              Presets
              <Badge variant="secondary" className="ml-2">
                {presets.length}
              </Badge>
            </h3>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-3">
              {presets.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No saved presets</p>
              ) : (
                presets.map((preset) => (
                  <div
                    key={preset.name}
                    className="rounded-md border border-border bg-background p-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground">{preset.name}</div>
                      {preset.date && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(preset.date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLoadPreset(preset.name)}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Load
                    </Button>
                  </div>
                ))
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSavePresetOpen(true)}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-1" />
                Save Current
              </Button>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Add Provider Dialog */}
      <Dialog open={addProviderOpen} onOpenChange={setAddProviderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Provider</DialogTitle>
            <DialogDescription>
              Configure a new AI provider for the router.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Name</label>
              <Input
                placeholder="e.g. openai"
                value={providerForm.name}
                onChange={(e) => setProviderForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">API Base URL</label>
              <Input
                placeholder="https://api.openai.com/v1"
                value={providerForm.api_base_url}
                onChange={(e) => setProviderForm(f => ({ ...f, api_base_url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">API Key</label>
              <Input
                type="password"
                placeholder="sk-..."
                value={providerForm.api_key}
                onChange={(e) => setProviderForm(f => ({ ...f, api_key: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Models (comma-separated)</label>
              <Input
                placeholder="gpt-4o, gpt-4o-mini"
                value={providerForm.models}
                onChange={(e) => setProviderForm(f => ({ ...f, models: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddProviderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProvider} disabled={savingProvider}>
              {savingProvider && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Add Provider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Preset Dialog */}
      <Dialog open={savePresetOpen} onOpenChange={setSavePresetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Preset</DialogTitle>
            <DialogDescription>
              Save the current router configuration as a named preset.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Preset Name</label>
              <Input
                placeholder="e.g. cost-optimized"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSavePresetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset}>
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
