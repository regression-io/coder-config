import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Globe, Server, Plus, Save, Trash2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

/**
 * Editor for global MCPs in ~/.claude.json
 * Only edits the mcpServers section, preserves rest of the file
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
  const saveConfig = async (newMcpServers) => {
    setSaving(true);
    try {
      const newConfig = { ...fullConfig, mcpServers: newMcpServers };
      await onSave(JSON.stringify(newConfig, null, 2));
      setFullConfig(newConfig);
      toast.success('Global MCPs saved');
    } catch (e) {
      toast.error('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMcp = (name) => {
    const newServers = { ...mcpServers };
    delete newServers[name];
    setMcpServers(newServers);
    setJsonText(JSON.stringify(newServers, null, 2));
    saveConfig(newServers);
  };

  const handleAddFromRegistry = (name) => {
    if (!registry?.mcpServers?.[name]) {
      toast.error(`MCP "${name}" not found in registry`);
      return;
    }
    const newServers = { ...mcpServers, [name]: registry.mcpServers[name] };
    setMcpServers(newServers);
    setJsonText(JSON.stringify(newServers, null, 2));
    saveConfig(newServers);
  };

  const handleAddCustom = () => {
    try {
      const customConfig = JSON.parse(addDialog.json);
      if (!customConfig.name || !customConfig.config) {
        toast.error('JSON must have "name" and "config" fields');
        return;
      }
      const newServers = { ...mcpServers, [customConfig.name]: customConfig.config };
      setMcpServers(newServers);
      setJsonText(JSON.stringify(newServers, null, 2));
      saveConfig(newServers);
      setAddDialog({ open: false, json: '' });
    } catch (e) {
      toast.error('Invalid JSON: ' + e.message);
    }
  };

  const handleJsonSave = () => {
    try {
      const newServers = JSON.parse(jsonText);
      setMcpServers(newServers);
      saveConfig(newServers);
    } catch (e) {
      toast.error('Invalid JSON: ' + e.message);
    }
  };

  // Get MCPs from registry that aren't already in global config
  const availableFromRegistry = registry?.mcpServers
    ? Object.keys(registry.mcpServers).filter(name => !mcpServers[name])
    : [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-orange-500" />
          <span className="font-medium">Global MCPs</span>
          <Badge variant="outline" className="text-xs">~/.claude.json</Badge>
        </div>
        <Tabs value={viewMode} onValueChange={setViewMode}>
          <TabsList className="h-7">
            <TabsTrigger value="rich" className="text-xs px-2 h-6">Visual</TabsTrigger>
            <TabsTrigger value="json" className="text-xs px-2 h-6">JSON</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1">
        {viewMode === 'rich' ? (
          <div className="p-4 space-y-4">
            {/* Info banner */}
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
              <div className="text-sm text-orange-700 dark:text-orange-300">
                <strong>Global MCPs</strong> are available in all projects. They're stored in <code className="bg-orange-500/20 px-1 rounded">~/.claude.json</code>.
              </div>
            </div>

            {/* Active Global MCPs */}
            <div>
              <h3 className="text-sm font-medium mb-2">Active Global MCPs ({Object.keys(mcpServers).length})</h3>
              {Object.keys(mcpServers).length === 0 ? (
                <p className="text-sm text-muted-foreground">No global MCPs configured</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(mcpServers).map(([name, config]) => (
                    <div key={name} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {config.type || 'stdio'}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMcp(name)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add from Registry */}
            {availableFromRegistry.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Add from Registry</h3>
                <div className="flex flex-wrap gap-2">
                  {availableFromRegistry.slice(0, 10).map(name => (
                    <Button
                      key={name}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddFromRegistry(name)}
                      className="text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {name}
                    </Button>
                  ))}
                  {availableFromRegistry.length > 10 && (
                    <Badge variant="secondary">+{availableFromRegistry.length - 10} more</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Add Custom */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddDialog({ open: true, json: '{\n  "name": "my-mcp",\n  "config": {\n    "command": "npx",\n    "args": ["-y", "@example/mcp-server"]\n  }\n}' })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Custom MCP
            </Button>
          </div>
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
            <Button onClick={handleJsonSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        )}
      </ScrollArea>

      {/* Add Custom MCP Dialog */}
      <Dialog open={addDialog.open} onOpenChange={(open) => setAddDialog({ ...addDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom MCP</DialogTitle>
            <DialogDescription>
              Enter the MCP configuration as JSON with "name" and "config" fields.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={addDialog.json}
            onChange={(e) => setAddDialog({ ...addDialog, json: e.target.value })}
            className="font-mono text-sm h-48"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog({ open: false, json: '' })}>
              Cancel
            </Button>
            <Button onClick={handleAddCustom}>
              Add MCP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
