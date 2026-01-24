import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Server, Plus, Save, Trash2, Ban, Link2, AlertCircle, Zap, GitBranch } from 'lucide-react';
import api from '@/lib/api';

export default function McpEditor({ content, parsed, onSave, registry, configDir }) {
  const [localConfig, setLocalConfig] = useState(parsed || { include: [], exclude: [], mcpServers: {} });
  const [viewMode, setViewMode] = useState('rich');
  const [jsonText, setJsonText] = useState(JSON.stringify(parsed || {}, null, 2));
  const [saving, setSaving] = useState(false);
  const [addDialog, setAddDialog] = useState({ open: false, json: '' });
  const [inheritedMcps, setInheritedMcps] = useState([]);
  const [needsApply, setNeedsApply] = useState(false);
  const [applying, setApplying] = useState(false);
  const [cascading, setCascading] = useState(false);

  // Detect if this is a parent-level config (global ~ or workspace level)
  const isParentConfig = configDir === process.env.HOME ||
    (configDir && !configDir.includes('/') && configDir !== '.');

  useEffect(() => {
    setLocalConfig(parsed || { include: [], exclude: [], mcpServers: {} });
    setJsonText(JSON.stringify(parsed || {}, null, 2));
  }, [parsed]);

  // Fetch inherited MCPs when configDir changes
  useEffect(() => {
    if (configDir) {
      api.getInheritedMcps(configDir).then(data => {
        setInheritedMcps(data.inherited || []);
        setNeedsApply(data.needsApply || false);
      }).catch(() => {
        setInheritedMcps([]);
        setNeedsApply(false);
      });
    } else {
      setInheritedMcps([]);
      setNeedsApply(false);
    }
  }, [configDir, parsed]);

  // Auto-save helper
  const autoSave = async (config) => {
    setSaving(true);
    try {
      await onSave(JSON.stringify(config, null, 2));
    } catch (e) {
      toast.error('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleInclude = (name) => {
    const newInclude = localConfig.include?.includes(name)
      ? localConfig.include.filter(n => n !== name)
      : [...(localConfig.include || []), name];
    const newConfig = { ...localConfig, include: newInclude };
    setLocalConfig(newConfig);
    setJsonText(JSON.stringify(newConfig, null, 2));
    autoSave(newConfig);
  };

  const handleToggleExclude = (name) => {
    const currentExclude = localConfig.exclude || [];
    const isExcluded = currentExclude.includes(name);
    const newExclude = isExcluded
      ? currentExclude.filter(n => n !== name)
      : [...currentExclude, name];

    // Clean up empty exclude array
    const newConfig = newExclude.length > 0
      ? { ...localConfig, exclude: newExclude }
      : { ...localConfig };
    if (newExclude.length === 0) {
      delete newConfig.exclude;
    }

    setLocalConfig(newConfig);
    setJsonText(JSON.stringify(newConfig, null, 2));
    autoSave(newConfig);
    toast.success(isExcluded ? `Unblocked ${name}` : `Blocked ${name}`);
  };

  // Manual save only needed for JSON editor mode
  const handleSaveJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setLocalConfig(parsed);
      autoSave(parsed);
    } catch (e) {
      toast.error('Invalid JSON');
    }
  };

  const handleAddMcp = () => {
    if (!addDialog.json.trim()) {
      toast.error('Please paste the MCP JSON configuration');
      return;
    }

    try {
      let parsed;
      try {
        parsed = JSON.parse(addDialog.json);
      } catch (e) {
        toast.error('Invalid JSON format');
        return;
      }

      let mcpsToAdd = {};
      if (parsed.mcpServers && typeof parsed.mcpServers === 'object') {
        mcpsToAdd = parsed.mcpServers;
      } else if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        const keys = Object.keys(parsed);
        if (keys.includes('command')) {
          toast.error('JSON is missing the MCP name. Expected: { "name": { "command": "...", "args": [...] } }');
          return;
        }
        mcpsToAdd = parsed;
      }

      if (Object.keys(mcpsToAdd).length === 0) {
        toast.error('No MCP configurations found in the JSON');
        return;
      }

      for (const [name, mcp] of Object.entries(mcpsToAdd)) {
        if (!mcp.command) {
          toast.error(`MCP "${name}" is missing required "command" field`);
          return;
        }
      }

      const newMcpServers = { ...(localConfig.mcpServers || {}), ...mcpsToAdd };
      const newConfig = { ...localConfig, mcpServers: newMcpServers };
      setLocalConfig(newConfig);
      setJsonText(JSON.stringify(newConfig, null, 2));
      autoSave(newConfig);

      const count = Object.keys(mcpsToAdd).length;
      toast.success(`Added ${count} MCP${count > 1 ? 's' : ''}`);
      setAddDialog({ open: false, json: '' });
    } catch (error) {
      toast.error('Failed to add: ' + error.message);
    }
  };

  const registryMcps = registry?.mcpServers ? Object.keys(registry.mcpServers) : [];

  const handleApply = async () => {
    if (!configDir) return;
    setApplying(true);
    try {
      const result = await api.applyConfig(configDir);
      if (result.success) {
        toast.success('Generated .mcp.json');
        setNeedsApply(false);
      } else {
        toast.error(result.error || 'Failed to apply');
      }
    } catch (e) {
      toast.error('Failed to apply: ' + e.message);
    } finally {
      setApplying(false);
    }
  };

  const handleCascade = async () => {
    if (!configDir) return;
    setCascading(true);
    try {
      const result = await api.applyCascade(configDir);
      if (result.success) {
        const msg = `Applied to ${result.applied} project${result.applied !== 1 ? 's' : ''}`;
        toast.success(msg);
        setNeedsApply(false);
      } else if (result.applied === 0 && result.skipped > 0) {
        toast.info(`No projects needed updates (${result.skipped} skipped)`);
      } else {
        toast.error('Failed to cascade apply');
      }
    } catch (e) {
      toast.error('Failed to cascade: ' + e.message);
    } finally {
      setCascading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b bg-gray-50 dark:bg-slate-800">
        <Tabs value={viewMode} onValueChange={setViewMode}>
          <TabsList className="h-8">
            <TabsTrigger value="rich" className="text-xs px-3">Rich Editor</TabsTrigger>
            <TabsTrigger value="json" className="text-xs px-3">JSON</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2 items-center">
          {saving && (
            <Badge variant="outline" className="text-xs text-blue-600">
              Saving...
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={() => setAddDialog({ open: true, json: '' })}>
            <Plus className="w-4 h-4 mr-1" />
            Add MCP
          </Button>
          {viewMode === 'json' && (
            <Button size="sm" onClick={handleSaveJson} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />
              Apply JSON
            </Button>
          )}
        </div>
      </div>

      {needsApply && (
        <div className="mx-3 mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-800 dark:text-amber-200">
              No <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">.mcp.json</code> generated yet. Apply to enable MCPs for Claude Code.
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleApply}
              disabled={applying || cascading}
              className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900"
            >
              {applying ? (
                <span className="animate-pulse">Applying...</span>
              ) : (
                <>
                  <Zap className="w-3 h-3 mr-1" />
                  Apply
                </>
              )}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCascade}
                  disabled={applying || cascading}
                  className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
                >
                  {cascading ? (
                    <span className="animate-pulse">Cascading...</span>
                  ) : (
                    <>
                      <GitBranch className="w-3 h-3 mr-1" />
                      Cascade
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Apply to this config and all child projects</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        {viewMode === 'rich' ? (
          <TooltipProvider>
          <div className="p-4 space-y-2">
            {/* Inline MCPs - shown first as they're project-specific */}
            {Object.entries(localConfig.mcpServers || {}).map(([name, config]) => (
              <div key={`inline-${name}`} className="p-2 rounded border bg-white dark:bg-slate-950 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">{name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">inline</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        const { [name]: _, ...rest } = localConfig.mcpServers;
                        const newConfig = { ...localConfig, mcpServers: rest };
                        setLocalConfig(newConfig);
                        setJsonText(JSON.stringify(newConfig, null, 2));
                        autoSave(newConfig);
                        toast.success(`Removed ${name}`);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-mono">
                  {config.command} {config.args?.join(' ')}
                </p>
              </div>
            ))}

            {/* Inherited MCPs */}
            {inheritedMcps.map((mcp) => {
              const isExcluded = localConfig.exclude?.includes(mcp.name);
              return (
                <Tooltip key={`inherited-${mcp.name}`}>
                  <TooltipTrigger asChild>
                    <div className={`flex items-center justify-between p-2 rounded border ${
                      isExcluded
                        ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                        : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Server className={`w-4 h-4 ${isExcluded ? 'text-red-400' : 'text-gray-400'}`} />
                        <span className={`text-sm ${isExcluded ? 'text-red-500 line-through' : 'text-gray-500 dark:text-slate-400'}`}>
                          {mcp.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-300 dark:border-slate-600">
                          from {mcp.source}
                        </Badge>
                      </div>
                      <Switch
                        checked={!isExcluded}
                        onCheckedChange={() => {
                          if (!isExcluded) {
                            toast.warning(`Blocking "${mcp.name}" inherited from ${mcp.source}`);
                          }
                          handleToggleExclude(mcp.name);
                        }}
                        className="data-[state=checked]:bg-gray-400 dark:data-[state=checked]:bg-slate-600"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Inherited from <strong>{mcp.source}</strong></p>
                    <p className="text-xs text-gray-400">{isExcluded ? 'Blocked at this level' : 'Toggle off to block'}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}

            {/* Registry MCPs (not inherited) */}
            {registryMcps.map((name) => {
              // Skip if this MCP is already shown as inherited or inline
              const isInherited = inheritedMcps.some(m => m.name === name);
              const isInline = localConfig.mcpServers?.[name];
              if (isInherited || isInline) return null;
              return (
                <div key={name} className="flex items-center justify-between p-2 rounded border bg-white dark:bg-slate-950">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-500" />
                    <span className="text-sm">{name}</span>
                  </div>
                  <Switch
                    checked={localConfig.include?.includes(name)}
                    onCheckedChange={() => handleToggleInclude(name)}
                  />
                </div>
              );
            })}

            {/* Empty state */}
            {registryMcps.length === 0 && inheritedMcps.length === 0 && Object.keys(localConfig.mcpServers || {}).length === 0 && (
              <p className="text-sm text-gray-500 dark:text-slate-400">No MCPs configured. Click "Add MCP" to add one.</p>
            )}
          </div>
          </TooltipProvider>
        ) : (
          <Textarea
            className="w-full h-full min-h-[400px] font-mono text-sm border-0 rounded-none resize-none"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
          />
        )}
      </ScrollArea>

      <Dialog open={addDialog.open} onOpenChange={(open) => setAddDialog({ ...addDialog, open })}>
        <DialogContent className="bg-white dark:bg-slate-950 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add MCP to Config</DialogTitle>
            <DialogDescription>
              Paste the MCP JSON configuration to add to this config file.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={addDialog.json}
              onChange={(e) => setAddDialog({ ...addDialog, json: e.target.value })}
              placeholder={'{\n  "my-mcp": {\n    "command": "npx",\n    "args": ["-y", "@example/mcp-server"],\n    "env": {\n      "API_KEY": "${API_KEY}"\n    }\n  }\n}'}
              className="font-mono text-sm bg-gray-50 dark:bg-slate-800"
              rows={12}
            />
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
              Accepts formats: <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">{'{ "name": { "command": "...", "args": [...] } }'}</code> or <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">{'{ "mcpServers": { ... } }'}</code>
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddDialog({ open: false, json: '' })}>
              Cancel
            </Button>
            <Button onClick={handleAddMcp} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add MCP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
