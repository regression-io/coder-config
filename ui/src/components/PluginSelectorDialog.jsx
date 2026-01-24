import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Puzzle, Search, Check, X, Loader2, Server, Package, ExternalLink,
  Filter, ChevronDown, Globe, Building2, Sparkles
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { ScrollArea } from './ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './ui/dropdown-menu';
import { toast } from 'sonner';
import api from '@/lib/api';

const CATEGORY_COLORS = {
  'development': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'productivity': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'integration': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'external': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'lsp': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  'default': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

function PluginCard({ plugin, onToggle, isToggling, projectDir }) {
  const categoryColor = CATEGORY_COLORS[plugin.category] || CATEGORY_COLORS.default;
  const hasFeatures = plugin.mcpServers || plugin.lspServers || plugin.commands;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`
        relative p-3 rounded-lg border transition-all
        ${plugin.installed
          ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
          : 'bg-white border-gray-200 dark:bg-slate-900 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
        }
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900 dark:text-white truncate">{plugin.name}</h4>
            {plugin.sourceType === 'external' && (
              <Globe className="w-3 h-3 text-orange-500 flex-shrink-0" title="Community plugin" />
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2 mb-2">
            {plugin.description || 'No description'}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {plugin.category && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${categoryColor}`}>
                {plugin.category}
              </Badge>
            )}
            {plugin.lspServers && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
                <Package className="w-2.5 h-2.5 mr-0.5" />
                LSP
              </Badge>
            )}
            {plugin.mcpServers && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <Server className="w-2.5 h-2.5 mr-0.5" />
                MCP
              </Badge>
            )}
            {plugin.version && (
              <span className="text-[10px] text-gray-400 dark:text-slate-500">v{plugin.version}</span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0">
          <Switch
            checked={plugin.installed}
            onCheckedChange={() => onToggle(plugin)}
            disabled={isToggling === plugin.name}
            className="data-[state=checked]:bg-green-600"
          />
        </div>
      </div>
      {isToggling === plugin.name && (
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 rounded-lg flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        </div>
      )}
    </motion.div>
  );
}

export default function PluginSelectorDialog({ open, onOpenChange, projectDir, projectName }) {
  const [loading, setLoading] = useState(true);
  const [pluginsData, setPluginsData] = useState({ allPlugins: [], categories: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [scope, setScope] = useState('project');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showExternal, setShowExternal] = useState(true);
  const [showInternal, setShowInternal] = useState(true);
  const [isToggling, setIsToggling] = useState(null);

  // Load plugins
  const loadPlugins = async () => {
    setLoading(true);
    try {
      const data = await api.getPlugins();
      setPluginsData(data);
    } catch (error) {
      toast.error('Failed to load plugins: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadPlugins();
      setSearchQuery('');
    }
  }, [open]);

  // Filter and sort plugins
  const filteredPlugins = useMemo(() => {
    let plugins = pluginsData.allPlugins || [];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      plugins = plugins.filter(p =>
        p.name?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    // Filter by source type
    plugins = plugins.filter(p => {
      if (p.sourceType === 'external' && !showExternal) return false;
      if (p.sourceType === 'internal' && !showInternal) return false;
      return true;
    });

    // Filter by category
    if (selectedCategories.length > 0) {
      plugins = plugins.filter(p => selectedCategories.includes(p.category));
    }

    // Sort: installed first, then alphabetically
    plugins.sort((a, b) => {
      if (a.installed && !b.installed) return -1;
      if (!a.installed && b.installed) return 1;
      return a.name.localeCompare(b.name);
    });

    return plugins;
  }, [pluginsData.allPlugins, searchQuery, showExternal, showInternal, selectedCategories]);

  // Toggle category filter
  const toggleCategory = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Install/uninstall plugin
  const handleToggle = async (plugin) => {
    setIsToggling(plugin.name);
    try {
      if (plugin.installed) {
        const result = await api.uninstallPlugin(`${plugin.name}@${plugin.marketplace}`);
        if (result.success) {
          toast.success(`Uninstalled ${plugin.name}`);
        } else {
          toast.error(result.error || 'Failed to uninstall');
        }
      } else {
        const result = await api.installPlugin(plugin.name, plugin.marketplace, scope, projectDir);
        if (result.success) {
          toast.success(`Installed ${plugin.name} (${scope})`);
        } else {
          toast.error(result.error || 'Failed to install');
        }
      }
      await loadPlugins();
    } catch (error) {
      toast.error('Operation failed: ' + error.message);
    } finally {
      setIsToggling(null);
    }
  };

  const installedCount = filteredPlugins.filter(p => p.installed).length;
  const availableCount = filteredPlugins.filter(p => !p.installed).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b dark:border-slate-800">
          <DialogTitle className="flex items-center gap-2">
            <Puzzle className="w-5 h-5 text-indigo-600" />
            Install Plugins
            {projectName && (
              <Badge variant="outline" className="ml-2 font-normal">
                {projectName}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Enable plugins for enhanced Claude Code capabilities
          </DialogDescription>
        </DialogHeader>

        {/* Controls */}
        <div className="px-6 py-3 border-b dark:border-slate-800 space-y-3 bg-gray-50 dark:bg-slate-900/50">
          {/* Search and Scope */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search plugins..."
                className="pl-9 h-9 bg-white dark:bg-slate-800"
              />
            </div>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="w-36 h-9 bg-white dark:bg-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="project">
                  <span className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" />
                    Project
                  </span>
                </SelectItem>
                <SelectItem value="user">
                  <span className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    Global
                  </span>
                </SelectItem>
                <SelectItem value="local">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    Local
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <Filter className="w-3 h-3" />
                  Category
                  {selectedCategories.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                      {selectedCategories.length}
                    </Badge>
                  )}
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel className="text-xs">Categories</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(pluginsData.categories || []).map(cat => (
                  <DropdownMenuCheckboxItem
                    key={cat}
                    checked={selectedCategories.includes(cat)}
                    onCheckedChange={() => toggleCategory(cat)}
                  >
                    {cat}
                  </DropdownMenuCheckboxItem>
                ))}
                {selectedCategories.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={false}
                      onCheckedChange={() => setSelectedCategories([])}
                    >
                      Clear all
                    </DropdownMenuCheckboxItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-3 ml-auto text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Switch
                  checked={showInternal}
                  onCheckedChange={setShowInternal}
                  className="h-4 w-7 data-[state=checked]:bg-blue-600"
                />
                <span className="text-gray-600 dark:text-slate-400">Anthropic</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Switch
                  checked={showExternal}
                  onCheckedChange={setShowExternal}
                  className="h-4 w-7 data-[state=checked]:bg-orange-600"
                />
                <span className="text-gray-600 dark:text-slate-400">Community</span>
              </label>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-green-600" />
              {installedCount} installed
            </span>
            <span>{availableCount} available</span>
            <span className="ml-auto">{filteredPlugins.length} shown</span>
          </div>
        </div>

        {/* Plugin List */}
        <ScrollArea className="flex-1 min-h-0 px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : filteredPlugins.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-slate-400">
              <Puzzle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No plugins found</p>
              {searchQuery && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="mt-2"
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <AnimatePresence mode="popLayout">
                {filteredPlugins.map(plugin => (
                  <PluginCard
                    key={`${plugin.name}@${plugin.marketplace}`}
                    plugin={plugin}
                    onToggle={handleToggle}
                    isToggling={isToggling}
                    projectDir={projectDir}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-3 border-t dark:border-slate-800 flex items-center justify-between bg-gray-50 dark:bg-slate-900/50">
          <p className="text-xs text-gray-500 dark:text-slate-500">
            Plugins extend Claude Code with LSP servers, MCP tools, and commands
          </p>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
