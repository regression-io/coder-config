import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Globe, Server, Plus, Save, Trash2, AlertCircle } from 'lucide-react';
import AddMcpDialog from './AddMcpDialog';

/**
 * Editor for global MCPs in ~/.claude.json
 * Matches McpEditor UI style but for global scope
 */
export default function GlobalMcpEditor({ content, parsed, onSave, registry }) {
  const [fullConfig, setFullConfig] = useState(parsed || {});
  const [mcpServers, setMcpServers] = useState(parsed?.mcpServers || {});
  const [viewMode, setViewMode] = useState('rich');
  const [jsonText, setJsonText] = useState(JSON.stringify(parsed?.mcpServers || {}, null, 2));
  const [saving, setSaving] = useState(false);
  const [addDialog, setAddDialog] = useState({ open: false, json: '' });

  useEffect(() => {
    setFullConfig(parsed || {});
    setMcpServers(parsed?.mcpServers || {});
    setJsonText(JSON.stringify(parsed?.mcpServers || {}, null, 2));
  }, [parsed]);

  // Save preserving the rest of ~/.claude.json
  const autoSave = async (newMcpServers) => {
    setSaving(true);
    try {
      const newConfig = { ...fullConfig, mcpServers: newMcpServers };
      await onSave(JSON.stringify(newConfig, null, 2));
      setFullConfig(newConfig);
    } catch (e) {
      toast.error('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Toggle MCP from registry (add/remove from global)
  const handleToggleMcp = (name) => {
    if (mcpServers[name]) {
      // Remove from global
      const { [name]: _, ...rest } = mcpServers;
      setMcpServers(rest);
      setJsonText(JSON.stringify(rest, null, 2));
      autoSave(rest);
      toast.success(`Removed ${name} from global MCPs`);
    } else if (registry?.mcpServers?.[name]) {
      // Add to global from registry
      const newServers = { ...mcpServers, [name]: registry.mcpServers[name] };
      setMcpServers(newServers);
      setJsonText(JSON.stringify(newServers, null, 2));
      autoSave(newServers);
      toast.success(`Added ${name} to global MCPs`);
    }
  };

  // Remove custom MCP
  const handleRemoveMcp = (name) => {
    const { [name]: _, ...rest } = mcpServers;
    setMcpServers(rest);
    setJsonText(JSON.stringify(rest, null, 2));
    autoSave(rest);
    toast.success(`Removed ${name}`);
  };

  // Add custom MCP from dialog
  const handleAddCustom = (mcpsToAdd) => {
    const newServers = { ...mcpServers, ...mcpsToAdd };
    setMcpServers(newServers);
    setJsonText(JSON.stringify(newServers, null, 2));
    autoSave(newServers);
    setAddDialog({ open: false, json: '' });

    const count = Object.keys(mcpsToAdd).length;
    toast.success(`Added ${count} MCP${count > 1 ? 's' : ''}`);
  };

  const handleSaveJson = () => {
    try {
      const newServers = JSON.parse(jsonText);
      setMcpServers(newServers);
      autoSave(newServers);
      toast.success('Saved');
    } catch (e) {
      toast.error('Invalid JSON: ' + e.message);
    }
  };

  const registryMcps = registry?.mcpServers ? Object.keys(registry.mcpServers) : [];

  // Custom MCPs are those in mcpServers but not in registry (or different config)
  const customMcps = Object.entries(mcpServers).filter(([name, config]) => {
    const registryConfig = registry?.mcpServers?.[name];
    if (!registryConfig) return true;
    // Check if config differs from registry
    return JSON.stringify(config) !== JSON.stringify(registryConfig);
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header - matches McpEditor */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50 dark:bg-slate-800">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium">Global MCPs</span>
          <Badge variant="outline" className="text-xs">~/.claude.json</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={setViewMode}>
            <TabsList className="h-8">
              <TabsTrigger value="rich" className="text-xs px-3">Rich Editor</TabsTrigger>
              <TabsTrigger value="json" className="text-xs px-3">JSON</TabsTrigger>
            </TabsList>
          </Tabs>
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

      {/* Info banner */}
      <div className="mx-3 mt-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
        <span className="text-sm text-orange-800 dark:text-orange-200">
          Global MCPs are available in <strong>all projects</strong>. They're stored in <code className="bg-orange-100 dark:bg-orange-900 px-1 rounded">~/.claude.json</code>.
        </span>
      </div>

      <ScrollArea className="flex-1">
        {viewMode === 'rich' ? (
          <TooltipProvider>
            <div className="p-4 space-y-2">
              {/* Custom/Inline MCPs first (not from registry) */}
              {customMcps.map(([name, config]) => (
                <div key={`custom-${name}`} className="p-2 rounded border bg-white dark:bg-slate-950 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">{name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">custom</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemoveMcp(name)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-mono">
                    {config.url ? `${config.type || 'http'}: ${config.url}` : `${config.command} ${config.args?.join(' ') || ''}`}
                  </p>
                </div>
              ))}

              {/* Registry MCPs with toggle switches */}
              {registryMcps.map((name) => {
                const isEnabled = !!mcpServers[name];
                const mcpConfig = registry.mcpServers[name];
                return (
                  <Tooltip key={`registry-${name}`}>
                    <TooltipTrigger asChild>
                      <div className={`flex items-center justify-between p-2 rounded border ${
                        isEnabled
                          ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                          : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Server className={`w-4 h-4 ${isEnabled ? 'text-green-500' : 'text-gray-400'}`} />
                          <span className={`text-sm ${isEnabled ? 'font-medium' : 'text-gray-500 dark:text-slate-400'}`}>
                            {name}
                          </span>
                          {mcpConfig.description && (
                            <span className="text-xs text-gray-400 dark:text-slate-500 hidden sm:inline">
                              — {mcpConfig.description}
                            </span>
                          )}
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => handleToggleMcp(name)}
                          className={isEnabled ? 'data-[state=checked]:bg-green-500' : ''}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono text-xs">{mcpConfig.url ? `${mcpConfig.type || 'http'}: ${mcpConfig.url}` : `${mcpConfig.command} ${mcpConfig.args?.join(' ') || ''}`}</p>
                      {mcpConfig.description && <p className="text-xs text-gray-400 mt-1">{mcpConfig.description}</p>}
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {registryMcps.length === 0 && customMcps.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No MCPs configured. Use the registry toggle or add a custom MCP.
                </p>
              )}
            </div>
          </TooltipProvider>
        ) : (
          <div className="p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Edit the mcpServers section (other ~/.claude.json settings are preserved)
            </p>
            <Textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="font-mono text-sm h-[400px]"
              placeholder="{}"
            />
          </div>
        )}
      </ScrollArea>

      <AddMcpDialog
        open={addDialog.open}
        onClose={(open) => setAddDialog({ ...addDialog, open })}
        onAdd={handleAddCustom}
      />
    </div>
  );
}
