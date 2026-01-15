import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Plus, Save, Trash2, Edit3, ExternalLink, Search,
  Folder, MoreVertical, Loader2, Github, Star, Globe, Wand2, Clipboard
} from 'lucide-react';
import TerminalComponent from "@/components/Terminal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import api from "@/lib/api";

// Helper to get/set localStorage with JSON
const getStoredState = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(`claude-config-${key}`);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setStoredState = (key, value) => {
  try {
    localStorage.setItem(`claude-config-${key}`, JSON.stringify(value));
  } catch {
    // Ignore storage errors
  }
};

export default function RegistryView({ registry, searchQuery, setSearchQuery, onUpdate }) {
  const [searchMode, setSearchModeState] = useState(() => getStoredState('registrySearchMode', 'local'));
  const setSearchMode = (mode) => {
    setSearchModeState(mode);
    setStoredState('registrySearchMode', mode);
  };
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [editDialog, setEditDialog] = useState({ open: false, name: '', mcp: null, isNew: false });
  const [mcpForm, setMcpForm] = useState({ name: '', command: 'npx', args: '', env: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [discoveredTools, setDiscoveredTools] = useState([]);
  const [toolsDir, setToolsDir] = useState('');
  const [importDialog, setImportDialog] = useState({ open: false, url: '', showTerminal: false, localTool: null, pastedConfig: '', mode: 'url' });
  const [folderPath, setFolderPath] = useState('');

  const mcps = Object.entries(registry.mcpServers || {});
  const filtered = mcps.filter(([name]) =>
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Load discovered tools from ~/reg/tools
  useEffect(() => {
    const loadTools = async () => {
      try {
        const result = await api.getMcpTools();
        setDiscoveredTools(result.tools || []);
        setToolsDir(result.dir || '');
      } catch (e) {
        console.error('Failed to load MCP tools:', e);
      }
    };
    loadTools();
  }, []);

  // Filter discovered tools that aren't already in registry
  const filteredTools = discoveredTools.filter(tool =>
    !registry.mcpServers?.[tool.name] &&
    tool.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open edit dialog with existing MCP (for editing only)
  const openEditDialog = (name, mcp) => {
    setMcpForm({
      name,
      command: mcp.command || 'npx',
      args: JSON.stringify(mcp.args || [], null, 2),
      env: JSON.stringify(mcp.env || {}, null, 2),
      description: mcp.description || ''
    });
    setEditDialog({ open: true, name, mcp, isNew: false });
  };

  // Open add dialog - now uses simple JSON paste
  const [addDialog, setAddDialog] = useState({ open: false, json: '' });

  const openAddDialog = () => {
    setAddDialog({ open: true, json: '' });
  };

  // Add MCP from pasted JSON
  const handleAddFromJson = async () => {
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

      // Determine format and extract MCPs
      let mcpsToAdd = {};
      if (parsed.mcpServers && typeof parsed.mcpServers === 'object') {
        // Format: { "mcpServers": { "name": {...} } }
        mcpsToAdd = parsed.mcpServers;
      } else if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        const keys = Object.keys(parsed);
        if (keys.includes('command')) {
          toast.error('JSON is missing the MCP name. Expected: { "name": { "command": "...", "args": [...] } }');
          return;
        }
        // Format: { "name": { "command": "...", "args": [...] } }
        mcpsToAdd = parsed;
      }

      if (Object.keys(mcpsToAdd).length === 0) {
        toast.error('No MCP configurations found in the JSON');
        return;
      }

      // Validate required fields
      for (const [name, mcp] of Object.entries(mcpsToAdd)) {
        if (!mcp.command) {
          toast.error(`MCP "${name}" is missing required "command" field`);
          return;
        }
      }

      // Add to registry
      const updatedRegistry = { ...registry };
      if (!updatedRegistry.mcpServers) updatedRegistry.mcpServers = {};

      for (const [name, mcp] of Object.entries(mcpsToAdd)) {
        updatedRegistry.mcpServers[name] = mcp;
      }

      await api.updateRegistry(updatedRegistry);
      const count = Object.keys(mcpsToAdd).length;
      toast.success(`Added ${count} MCP${count > 1 ? 's' : ''} to registry!`);
      setAddDialog({ open: false, json: '' });
      onUpdate();
    } catch (error) {
      toast.error('Failed to add: ' + error.message);
    }
  };

  // Add from search result - populate JSON paste dialog
  const addFromSearch = (result) => {
    const mcpName = result.name
      .replace('@modelcontextprotocol/server-', '')
      .replace('mcp-server-', '')
      .replace('mcp-', '')
      .replace(/-/g, '_');

    const mcpConfig = {
      [mcpName]: {
        command: result.suggestedCommand || 'npx',
        args: result.suggestedArgs || ['-y', result.name],
        ...(result.description && { description: result.description })
      }
    };

    setAddDialog({ open: true, json: JSON.stringify(mcpConfig, null, 2) });
  };

  // Add discovered tool from local ~/reg/tools directory - populate JSON paste dialog
  const addFromDiscovered = (tool) => {
    // Generate command based on tool type
    let command, args;
    if (tool.type === 'python') {
      command = 'uv';
      args = ['run', '--directory', tool.path, 'python', tool.entryPoint || 'mcp_server.py'];
    } else {
      command = 'node';
      args = [tool.path + '/index.js'];
    }

    const mcpConfig = {
      [tool.name]: {
        command,
        args,
        ...(tool.description && { description: tool.description })
      }
    };

    setAddDialog({ open: true, json: JSON.stringify(mcpConfig, null, 2) });
  };

  // Start importing from URL
  const startImport = () => {
    if (!importDialog.url.trim()) {
      toast.error('Please enter a URL');
      return;
    }
    setImportDialog(prev => ({ ...prev, showTerminal: true }));
  };

  // Get import command for Claude Code
  const getImportCommand = () => {
    // Local tool import - use single quotes and escape properly for zsh
    if (importDialog.localTool) {
      const tool = importDialog.localTool;
      // Use a simpler prompt that avoids special characters
      const prompt = `Analyze the MCP server at ${tool.path}. Read the README and source files to understand how to run it. Output a JSON config block with name, command, args array, and description for the MCP registry. Be specific about the exact command needed.`;
      return `cd '${tool.path}' && claude '${prompt}'`;
    }

    // URL import
    const url = importDialog.url.trim();
    const prompt = `Clone ${url} into ~/reg/tools. Read the README, determine if Python or Node MCP server, and output a JSON config block with name, command, args, and description.`;
    return `cd ~/reg/tools && claude '${prompt}'`;
  };

  // Start importing local tool with Claude
  const importLocalTool = (tool) => {
    setImportDialog({ open: true, url: '', showTerminal: true, localTool: tool, pastedConfig: '' });
  };

  // Handle import terminal exit
  const handleImportExit = (exitCode) => {
    if (exitCode === 0) {
      toast.success('Import completed! Paste the JSON config below to add it to the registry.');
      // Refresh discovered tools
      api.getMcpTools().then(result => {
        setDiscoveredTools(result.tools || []);
      });
    }
    // Don't close the dialog - let user paste the config
  };

  // Add pasted config to registry
  const handleAddPastedConfig = async () => {
    if (!importDialog.pastedConfig.trim()) {
      toast.error('Please paste the JSON config first');
      return;
    }

    try {
      // Try to parse as full config format: { "mcpServers": { "name": {...} } }
      // or as simple format: { "name": { "command": "...", "args": [...] } }
      let parsed;
      try {
        parsed = JSON.parse(importDialog.pastedConfig);
      } catch (e) {
        toast.error('Invalid JSON format');
        return;
      }

      // Determine the format and extract MCPs
      let mcpsToAdd = {};
      if (parsed.mcpServers && typeof parsed.mcpServers === 'object') {
        // Full format: { "mcpServers": { "name": {...} } }
        mcpsToAdd = parsed.mcpServers;
      } else if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        // Check if it looks like a direct MCP config (has "command" key but no name wrapper)
        const keys = Object.keys(parsed);
        if (keys.includes('command')) {
          toast.error('JSON is missing the MCP name. Expected format: { "name": { "command": "...", "args": [...] } }');
          return;
        } else {
          // Simple format: { "name": { "command": "...", "args": [...] } }
          mcpsToAdd = parsed;
        }
      }

      if (Object.keys(mcpsToAdd).length === 0) {
        toast.error('No MCP configurations found in the pasted JSON');
        return;
      }

      // Validate each MCP has required fields
      for (const [name, mcp] of Object.entries(mcpsToAdd)) {
        if (!mcp.command) {
          toast.error(`MCP "${name}" is missing required "command" field`);
          return;
        }
      }

      // Add to registry
      const updatedRegistry = { ...registry };
      if (!updatedRegistry.mcpServers) updatedRegistry.mcpServers = {};

      for (const [name, mcp] of Object.entries(mcpsToAdd)) {
        updatedRegistry.mcpServers[name] = mcp;
      }

      await api.updateRegistry(updatedRegistry);
      const count = Object.keys(mcpsToAdd).length;
      toast.success(`Added ${count} MCP${count > 1 ? 's' : ''} to registry!`);
      setImportDialog({ open: false, url: '', showTerminal: false, localTool: null, pastedConfig: '', mode: 'url' });
      onUpdate();
    } catch (error) {
      toast.error('Failed to add config: ' + error.message);
    }
  };

  // Save MCP edit to registry
  const handleSave = async () => {
    setSaving(true);
    try {
      let args, env;
      try {
        args = JSON.parse(mcpForm.args);
        env = JSON.parse(mcpForm.env);
      } catch (e) {
        toast.error('Invalid JSON in args or env');
        setSaving(false);
        return;
      }

      const updatedRegistry = { ...registry };
      if (!updatedRegistry.mcpServers) updatedRegistry.mcpServers = {};

      const mcpData = {
        command: mcpForm.command,
        args,
        ...(Object.keys(env).length > 0 && { env }),
        ...(mcpForm.description && { description: mcpForm.description })
      };

      updatedRegistry.mcpServers[editDialog.name] = mcpData;

      await api.updateRegistry(updatedRegistry);
      toast.success('MCP updated');
      setEditDialog({ open: false, name: '', mcp: null, isNew: false });
      onUpdate();
    } catch (error) {
      toast.error('Failed to save: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete MCP from registry
  const handleDelete = async (name) => {
    try {
      const updatedRegistry = { ...registry };
      delete updatedRegistry.mcpServers[name];
      await api.updateRegistry(updatedRegistry);
      toast.success(`Removed ${name} from registry`);
      onUpdate();
    } catch (error) {
      toast.error('Failed to delete: ' + error.message);
    }
  };

  // Remote search
  const handleRemoteSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = searchMode === 'github'
        ? await api.searchGithub(searchQuery)
        : await api.searchNpm(searchQuery);
      setSearchResults(results.results || []);
    } catch (error) {
      toast.error('Search failed: ' + error.message);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Trigger search when mode changes or enter is pressed
  useEffect(() => {
    if (searchMode !== 'local') {
      setSearchResults([]);
    }
  }, [searchMode]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              MCP Registry
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportDialog({ open: true, url: '', showTerminal: false, localTool: null, pastedConfig: '', mode: 'folder' })}
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                <Folder className="w-4 h-4 mr-2" />
                Import Folder
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportDialog({ open: true, url: '', showTerminal: false, localTool: null, pastedConfig: '', mode: 'url' })}
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Import URL
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openAddDialog}
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add MCP
              </Button>
            </div>
          </div>

          {/* Search Mode Tabs */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={searchMode === 'local' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchMode('local')}
              className={searchMode === 'local' ? 'bg-blue-600' : ''}
            >
              <Package className="w-4 h-4 mr-2" />
              Registry ({mcps.length})
            </Button>
            <Button
              variant={searchMode === 'tools' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchMode('tools')}
              className={searchMode === 'tools' ? 'bg-purple-600' : ''}
            >
              <Folder className="w-4 h-4 mr-2" />
              Tools ({discoveredTools.length})
            </Button>
            <Button
              variant={searchMode === 'github' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchMode('github')}
              className={searchMode === 'github' ? 'bg-gray-800' : ''}
            >
              <Github className="w-4 h-4 mr-2" />
              GitHub
            </Button>
            <Button
              variant={searchMode === 'npm' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchMode('npm')}
              className={searchMode === 'npm' ? 'bg-red-600' : ''}
            >
              <Globe className="w-4 h-4 mr-2" />
              npm
            </Button>
          </div>

          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !['local', 'tools'].includes(searchMode) && handleRemoteSearch()}
                placeholder={searchMode === 'local' ? 'Filter registry...' : searchMode === 'tools' ? 'Filter discovered tools...' : `Search ${searchMode} for MCPs...`}
                className="pl-9 bg-white border-gray-300"
              />
            </div>
            {!['local', 'tools'].includes(searchMode) && (
              <Button onClick={handleRemoteSearch} disabled={searching}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </Button>
            )}
          </div>
        </div>

        {/* Local Registry */}
        {searchMode === 'local' && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(([name, mcp], index) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{name}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => openEditDialog(name, mcp)}>
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(name)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-sm text-gray-600 mb-3">{mcp.description || 'MCP server'}</p>
                <code className="text-xs text-gray-500 block truncate bg-gray-50 px-2 py-1 rounded">
                  {mcp.command} {mcp.args?.join(' ')}
                </code>
                {mcp.env && Object.keys(mcp.env).length > 0 && (
                  <div className="mt-2 text-xs text-amber-600">
                    Requires: {Object.keys(mcp.env).join(', ')}
                  </div>
                )}
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                {searchQuery ? 'No MCPs match your search.' : 'Registry is empty. Add MCPs or search online.'}
              </div>
            )}
          </div>
        )}

        {/* Discovered Tools from ~/reg/tools */}
        {searchMode === 'tools' && (
          <div className="p-4">
            {toolsDir && (
              <div className="mb-4 text-sm text-gray-500 flex items-center gap-2">
                <Folder className="w-4 h-4" />
                Scanning: {toolsDir}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTools.map((tool, index) => (
                <motion.div
                  key={tool.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-purple-50 rounded-lg border border-purple-200 p-4 hover:border-purple-400 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-purple-900">{tool.name}</h3>
                    <Badge variant="outline" className="text-purple-600 border-purple-300">
                      {tool.type === 'python' ? 'Python' : 'Node'}
                    </Badge>
                  </div>
                  <p className="text-sm text-purple-700 mb-3">{tool.description || 'MCP tool'}</p>
                  <code className="text-xs text-purple-600 block truncate bg-purple-100 px-2 py-1 rounded mb-3">
                    {tool.path}
                  </code>
                  {tool.framework && (
                    <div className="text-xs text-purple-500 mb-3">Framework: {tool.framework}</div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addFromDiscovered(tool)}
                      className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-100"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Quick
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => importLocalTool(tool)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Wand2 className="w-4 h-4 mr-1" />
                      Smart
                    </Button>
                  </div>
                </motion.div>
              ))}
              {filteredTools.length === 0 && discoveredTools.length > 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  All discovered tools are already in the registry.
                </div>
              )}
              {discoveredTools.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  No MCP tools found in {toolsDir}. Create one using the Developer &gt; Create MCP view.
                </div>
              )}
            </div>
          </div>
        )}

        {/* GitHub/npm Search Results */}
        {!['local', 'tools'].includes(searchMode) && (
          <div className="p-4">
            {searching ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                <p className="text-gray-500 mt-2">Searching {searchMode}...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((result, index) => (
                  <motion.div
                    key={result.name || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm">{result.name}</h3>
                      {result.stars !== undefined && (
                        <div className="flex items-center gap-1 text-xs text-amber-600">
                          <Star className="w-3 h-3" />
                          {result.stars}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{result.description || 'No description'}</p>
                    <code className="text-xs text-gray-500 block truncate bg-gray-50 px-2 py-1 rounded mb-3">
                      {result.suggestedCommand} {result.suggestedArgs?.join(' ')}
                    </code>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => addFromSearch(result)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add to Registry
                      </Button>
                      {result.url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(result.url, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No results found. Try a different search term.' : `Enter a search term to find MCPs on ${searchMode}.`}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add MCP Dialog - Simple JSON paste */}
      <Dialog open={addDialog.open} onOpenChange={(open) => setAddDialog({ ...addDialog, open })}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add MCP to Registry</DialogTitle>
            <DialogDescription>
              Paste the MCP JSON configuration block to add to your registry.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              value={addDialog.json}
              onChange={(e) => setAddDialog({ ...addDialog, json: e.target.value })}
              placeholder={'{\n  "my-mcp": {\n    "command": "npx",\n    "args": ["-y", "@example/mcp-server"],\n    "env": {\n      "API_KEY": "${API_KEY}"\n    }\n  }\n}'}
              className="font-mono text-sm bg-gray-50"
              rows={12}
            />
            <p className="text-xs text-gray-500 mt-2">
              Accepts formats: <code className="bg-gray-100 px-1 rounded">{'{ "name": { "command": "...", "args": [...] } }'}</code> or <code className="bg-gray-100 px-1 rounded">{'{ "mcpServers": { ... } }'}</code>
            </p>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddDialog({ open: false, json: '' })}>
              Cancel
            </Button>
            <Button onClick={handleAddFromJson} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add to Registry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit MCP Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit MCP: {editDialog.name}</DialogTitle>
            <DialogDescription>
              Edit the MCP server configuration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Input
                value={mcpForm.description}
                onChange={(e) => setMcpForm({ ...mcpForm, description: e.target.value })}
                placeholder="What does this MCP do?"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Command</label>
              <Input
                value={mcpForm.command}
                onChange={(e) => setMcpForm({ ...mcpForm, command: e.target.value })}
                placeholder="npx"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Args (JSON array)</label>
              <Textarea
                value={mcpForm.args}
                onChange={(e) => setMcpForm({ ...mcpForm, args: e.target.value })}
                placeholder='["-y", "@modelcontextprotocol/server-xxx"]'
                className="mt-1 font-mono text-sm"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Environment Variables (JSON object)</label>
              <Textarea
                value={mcpForm.env}
                onChange={(e) => setMcpForm({ ...mcpForm, env: e.target.value })}
                placeholder='{"API_KEY": "${API_KEY}"}'
                className="mt-1 font-mono text-sm"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">Use ${`{VAR_NAME}`} syntax for variables from .env file</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditDialog({ ...editDialog, open: false })}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog (URL, Folder, or Local Tool) */}
      <Dialog open={importDialog.open} onOpenChange={(open) => setImportDialog({ open, url: '', showTerminal: false, localTool: null, pastedConfig: '', mode: 'url' })}>
        <DialogContent className={`bg-white ${importDialog.showTerminal ? 'max-w-4xl h-[80vh] max-h-[800px]' : 'max-w-lg'}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {importDialog.localTool ? (
                <><Wand2 className="w-5 h-5 text-purple-600" /> Configure {importDialog.localTool.name}</>
              ) : importDialog.mode === 'folder' ? (
                <><Folder className="w-5 h-5 text-green-600" /> Import MCP from Folder</>
              ) : (
                <><ExternalLink className="w-5 h-5 text-purple-600" /> Import MCP from URL</>
              )}
            </DialogTitle>
            <DialogDescription>
              {importDialog.localTool
                ? `Claude Code will analyze ${importDialog.localTool.name} and generate the correct configuration.`
                : importDialog.mode === 'folder'
                ? 'Enter the path to a local MCP server folder. Claude Code will analyze it and generate the configuration.'
                : 'Enter a GitHub repository URL. Claude Code will clone it, read the README, and help configure it.'
              }
            </DialogDescription>
          </DialogHeader>

          {!importDialog.showTerminal && !importDialog.localTool ? (
            <>
              <div className="py-4">
                {importDialog.mode === 'folder' ? (
                  <>
                    <label className="text-sm font-medium text-gray-700">Folder Path</label>
                    <Input
                      value={folderPath}
                      onChange={(e) => setFolderPath(e.target.value)}
                      placeholder="/path/to/mcp-server or ~/projects/my-mcp"
                      className="mt-1 font-mono"
                      onKeyDown={(e) => e.key === 'Enter' && folderPath.trim() && setImportDialog({ ...importDialog, showTerminal: true, localTool: { name: folderPath.split('/').pop(), path: folderPath } })}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Enter the full path to an existing MCP server project
                    </p>
                  </>
                ) : (
                  <>
                    <label className="text-sm font-medium text-gray-700">Repository URL</label>
                    <Input
                      value={importDialog.url}
                      onChange={(e) => setImportDialog({ ...importDialog, url: e.target.value })}
                      placeholder="https://github.com/user/mcp-server-example"
                      className="mt-1"
                      onKeyDown={(e) => e.key === 'Enter' && startImport()}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      The repository will be cloned to {toolsDir || '~/mcp-tools'}
                    </p>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setImportDialog({ open: false, url: '', showTerminal: false, localTool: null, pastedConfig: '', mode: 'url' })}>
                  Cancel
                </Button>
                {importDialog.mode === 'folder' ? (
                  <Button
                    onClick={() => folderPath.trim() && setImportDialog({ ...importDialog, showTerminal: true, localTool: { name: folderPath.split('/').pop(), path: folderPath } })}
                    disabled={!folderPath.trim()}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Analyze with Claude
                  </Button>
                ) : (
                  <Button onClick={startImport} className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Wand2 className="w-4 h-4 mr-2" />
                    Import with Claude
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {importDialog.localTool && (
                <div className="mb-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 text-sm">
                    <Folder className="w-4 h-4 text-purple-600" />
                    <code className="text-purple-700">{importDialog.localTool.path}</code>
                  </div>
                </div>
              )}
              <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden" style={{ minHeight: '200px' }}>
                <TerminalComponent
                  cwd={importDialog.localTool?.path || toolsDir || '~/reg/tools'}
                  initialCommand={getImportCommand()}
                  onExit={handleImportExit}
                  height="100%"
                />
              </div>

              {/* Config paste area */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Clipboard className="w-4 h-4" />
                  Paste MCP Config JSON
                </label>
                <p className="text-xs text-gray-500 mt-1 mb-2">
                  Copy the JSON config from the terminal output above and paste it here to add to your registry.
                </p>
                <Textarea
                  value={importDialog.pastedConfig}
                  onChange={(e) => setImportDialog({ ...importDialog, pastedConfig: e.target.value })}
                  placeholder={'{\n  "mcpServers": {\n    "example": {\n      "command": "npx",\n      "args": ["-y", "@example/mcp-server"]\n    }\n  }\n}'}
                  className="font-mono text-sm bg-white"
                  rows={6}
                />
              </div>

              <div className="mt-4 flex justify-between">
                <Button variant="outline" onClick={() => setImportDialog({ open: false, url: '', showTerminal: false, localTool: null, pastedConfig: '', mode: 'url' })}>
                  Close
                </Button>
                <Button
                  onClick={handleAddPastedConfig}
                  disabled={!importDialog.pastedConfig.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Registry
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
