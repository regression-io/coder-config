import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

/**
 * Shared Add MCP dialog used by both McpEditor and GlobalMcpEditor.
 * Parses JSON input and returns a { name: config } map via onAdd callback.
 */
export default function AddMcpDialog({ open, onClose, onAdd }) {
  const [json, setJson] = useState('');

  useEffect(() => {
    if (open) setJson('');
  }, [open]);

  const handleAdd = () => {
    if (!json.trim()) {
      toast.error('Please paste the MCP JSON configuration');
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(json);
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

    onAdd(mcpsToAdd);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-slate-950 max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add MCP to Config</DialogTitle>
          <DialogDescription>
            Paste the MCP JSON configuration to add to this config file.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            placeholder={'{\n  "my-mcp": {\n    "command": "npx",\n    "args": ["-y", "@example/mcp-server"],\n    "env": {\n      "API_KEY": "${API_KEY}"\n    }\n  }\n}'}
            className="font-mono text-sm bg-gray-50 dark:bg-slate-800"
            rows={12}
          />
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
            Accepts formats: <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">{'{ "name": { "command": "...", "args": [...] } }'}</code> or <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">{'{ "mcpServers": { ... } }'}</code>
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onClose(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add MCP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
