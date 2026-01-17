import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Puzzle, Plus, Trash2, RefreshCw, ExternalLink, Search,
  MoreVertical, Loader2, Check, Store, Package, Server, Globe,
  Building2, Filter, ChevronDown, Info, Terminal
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/api";

const CATEGORY_COLORS = {
  'development': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  'productivity': 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  'integration': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
  'external': 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  'lsp': 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800',
  'default': 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
};

export default function PluginsView() {
  const [loading, setLoading] = useState(true);
  const [pluginsData, setPluginsData] = useState({ allPlugins: [], categories: [], marketplaces: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showInternal, setShowInternal] = useState(true);
  const [showExternal, setShowExternal] = useState(true);
  const [showInstalled, setShowInstalled] = useState(true);
  const [showAvailable, setShowAvailable] = useState(true);
  const [sortBy, setSortBy] = useState('name');
  const [refreshing, setRefreshing] = useState(null);
  const [addMarketplaceDialog, setAddMarketplaceDialog] = useState({ open: false, repo: '' });

  // Load plugins
  const loadData = async () => {
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
    loadData();
  }, []);

  // Filter and sort plugins
  const filteredPlugins = useMemo(() => {
    let plugins = pluginsData.allPlugins || [];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      plugins = plugins.filter(p =>
        p.name?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
      );
    }

    // Filter by source type
    plugins = plugins.filter(p => {
      if (p.sourceType === 'external' && !showExternal) return false;
      if (p.sourceType === 'internal' && !showInternal) return false;
      return true;
    });

    // Filter by installed status
    plugins = plugins.filter(p => {
      if (p.installed && !showInstalled) return false;
      if (!p.installed && !showAvailable) return false;
      return true;
    });

    // Filter by category
    if (selectedCategories.length > 0) {
      plugins = plugins.filter(p => selectedCategories.includes(p.category));
    }

    // Sort
    plugins.sort((a, b) => {
      if (sortBy === 'installed') {
        if (a.installed && !b.installed) return -1;
        if (!a.installed && b.installed) return 1;
      }
      if (sortBy === 'category') {
        const catCompare = (a.category || 'zzz').localeCompare(b.category || 'zzz');
        if (catCompare !== 0) return catCompare;
      }
      return a.name.localeCompare(b.name);
    });

    return plugins;
  }, [pluginsData.allPlugins, searchQuery, showExternal, showInternal, showInstalled, showAvailable, selectedCategories, sortBy]);

  // Toggle category filter
  const toggleCategory = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Refresh marketplace
  const handleRefreshMarketplace = async (name) => {
    setRefreshing(name);
    try {
      const result = await api.refreshMarketplace(name);
      if (result.success) {
        toast.success(`Refreshed ${name}`);
        await loadData();
      } else {
        toast.error(result.error || 'Failed to refresh marketplace');
      }
    } catch (error) {
      toast.error('Failed to refresh: ' + error.message);
    } finally {
      setRefreshing(null);
    }
  };

  // Add marketplace
  const handleAddMarketplace = async () => {
    if (!addMarketplaceDialog.repo.trim()) {
      toast.error('Please enter a repository URL');
      return;
    }

    try {
      const result = await api.addMarketplace('', addMarketplaceDialog.repo.trim());
      if (result.success) {
        toast.success('Marketplace added');
        setAddMarketplaceDialog({ open: false, repo: '' });
        await loadData();
      } else {
        toast.error(result.error || 'Failed to add marketplace');
      }
    } catch (error) {
      toast.error('Failed to add marketplace: ' + error.message);
    }
  };

  const installedCount = (pluginsData.allPlugins || []).filter(p => p.installed).length;
  const availableCount = (pluginsData.allPlugins || []).filter(p => !p.installed).length;
  const internalCount = (pluginsData.allPlugins || []).filter(p => p.sourceType === 'internal').length;
  const externalCount = (pluginsData.allPlugins || []).filter(p => p.sourceType === 'external').length;
  const marketplaces = pluginsData.marketplaces || [];
  const categories = pluginsData.categories || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-800 dark:text-indigo-300">
          <p className="font-medium">Install plugins from Project Explorer</p>
          <p className="text-indigo-600 dark:text-indigo-400 mt-1">
            Use the <kbd className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900 rounded text-xs">+</kbd> menu on any project and select "Install Plugins" to add plugins with project-level scope control.
          </p>
        </div>
      </div>

      {/* Plugins Discovery Section */}
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Puzzle className="w-5 h-5 text-indigo-600" />
              Plugin Directory
              <Badge variant="outline" className="ml-2 font-normal">
                {filteredPlugins.length} of {pluginsData.allPlugins?.length || 0}
              </Badge>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Search and Sort */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search plugins..."
                className="pl-9 bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="installed">Installed first</SelectItem>
                <SelectItem value="category">Category</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Category Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
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
                <DropdownMenuLabel className="text-xs">Filter by category</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {categories.map(cat => (
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
                    <DropdownMenuItem onClick={() => setSelectedCategories([])}>
                      Clear filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Quick Filters */}
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Switch
                  checked={showInstalled}
                  onCheckedChange={setShowInstalled}
                  className="h-4 w-7 data-[state=checked]:bg-green-600"
                />
                <span className="text-gray-600 dark:text-slate-400">Installed ({installedCount})</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Switch
                  checked={showAvailable}
                  onCheckedChange={setShowAvailable}
                  className="h-4 w-7 data-[state=checked]:bg-blue-600"
                />
                <span className="text-gray-600 dark:text-slate-400">Available ({availableCount})</span>
              </label>
              <span className="text-gray-300 dark:text-slate-600">|</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Switch
                  checked={showInternal}
                  onCheckedChange={setShowInternal}
                  className="h-4 w-7 data-[state=checked]:bg-indigo-600"
                />
                <span className="text-gray-600 dark:text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Anthropic ({internalCount})
                </span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Switch
                  checked={showExternal}
                  onCheckedChange={setShowExternal}
                  className="h-4 w-7 data-[state=checked]:bg-orange-600"
                />
                <span className="text-gray-600 dark:text-slate-400 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Community ({externalCount})
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Plugins Grid */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlugins.map((plugin, index) => {
            const categoryColor = CATEGORY_COLORS[plugin.category] || CATEGORY_COLORS.default;
            const mcpCount = plugin.mcpServers ? Object.keys(plugin.mcpServers).length : 0;
            const lspCount = plugin.lspServers ? Object.keys(plugin.lspServers).length : 0;

            return (
              <motion.div
                key={`${plugin.name}@${plugin.marketplace}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.02, 0.3) }}
                className={`rounded-lg border p-4 transition-all hover:shadow-md ${
                  plugin.installed
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                    : 'bg-white border-gray-200 dark:bg-slate-900 dark:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{plugin.name}</h3>
                      {plugin.sourceType === 'external' && (
                        <Globe className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" title="Community plugin" />
                      )}
                    </div>
                    {plugin.installed && (
                      <Badge variant="outline" className="text-green-600 border-green-300 dark:text-green-400 dark:border-green-700 text-[10px]">
                        <Check className="w-2.5 h-2.5 mr-0.5" />
                        Installed
                      </Badge>
                    )}
                  </div>
                  {plugin.homepage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-60 hover:opacity-100"
                      onClick={() => window.open(plugin.homepage, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <p className="text-sm text-gray-600 dark:text-slate-400 mb-3 line-clamp-2">
                  {plugin.description || 'No description available'}
                </p>

                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {plugin.category && (
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${categoryColor}`}>
                      {plugin.category}
                    </Badge>
                  )}
                  {plugin.version && (
                    <span className="text-[10px] text-gray-400 dark:text-slate-500">v{plugin.version}</span>
                  )}
                </div>

                {/* Features */}
                {(mcpCount > 0 || lspCount > 0 || plugin.commands) && (
                  <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-slate-500 pt-2 border-t border-gray-100 dark:border-slate-800">
                    {lspCount > 0 && (
                      <span className="flex items-center gap-1 bg-cyan-50 dark:bg-cyan-900/20 px-1.5 py-0.5 rounded">
                        <Package className="w-3 h-3 text-cyan-600" />
                        {lspCount} LSP
                      </span>
                    )}
                    {mcpCount > 0 && (
                      <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                        <Server className="w-3 h-3 text-blue-600" />
                        {mcpCount} MCP
                      </span>
                    )}
                    {plugin.commands && (
                      <span className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">
                        <Terminal className="w-3 h-3 text-green-600" />
                        Commands
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}

          {filteredPlugins.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500 dark:text-slate-400">
              <Puzzle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No plugins found</p>
              <p className="text-sm mt-1">Try adjusting your filters or search query</p>
              {(selectedCategories.length > 0 || searchQuery) && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => { setSelectedCategories([]); setSearchQuery(''); }}
                  className="mt-2"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Marketplaces Section */}
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-purple-600" />
              Plugin Marketplaces
              <Badge variant="outline" className="ml-2 font-normal">{marketplaces.length}</Badge>
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddMarketplaceDialog({ open: true, repo: '' })}
              className="border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Marketplace
            </Button>
          </div>
        </div>

        <div className="p-4">
          {marketplaces.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {marketplaces.map((mp, index) => {
                const pluginCount = (mp.plugins?.length || 0) + (mp.externalPlugins?.length || 0);
                return (
                  <motion.div
                    key={mp.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-purple-900 dark:text-purple-200">{mp.name}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRefreshMarketplace(mp.name)}
                        disabled={refreshing === mp.name}
                        className="h-7 w-7 p-0"
                      >
                        <RefreshCw className={`w-4 h-4 text-purple-600 dark:text-purple-400 ${refreshing === mp.name ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <p className="text-sm text-purple-700 dark:text-purple-300 mb-2 truncate">
                      {typeof mp.source === 'string' ? mp.source : mp.source?.repo || 'Unknown source'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-purple-600 dark:text-purple-400">
                      <span>{pluginCount} plugins</span>
                      {mp.lastUpdated && (
                        <span>Updated: {new Date(mp.lastUpdated).toLocaleDateString()}</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-slate-400">
              <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No marketplaces configured.</p>
              <p className="text-sm mt-1">Add a marketplace to discover plugins.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Marketplace Dialog */}
      <Dialog open={addMarketplaceDialog.open} onOpenChange={(open) => setAddMarketplaceDialog({ ...addMarketplaceDialog, open })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-purple-600" />
              Add Plugin Marketplace
            </DialogTitle>
            <DialogDescription>
              Add a marketplace from a GitHub repository URL or local path.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Repository URL or Path</label>
              <Input
                value={addMarketplaceDialog.repo}
                onChange={(e) => setAddMarketplaceDialog({ ...addMarketplaceDialog, repo: e.target.value })}
                placeholder="owner/repo or full GitHub URL"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                Supported formats:
              </p>
              <ul className="text-xs text-gray-500 dark:text-slate-400 mt-1 space-y-1 ml-2">
                <li><code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">owner/repo</code> — GitHub shorthand</li>
                <li><code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">https://github.com/owner/repo</code> — Full URL</li>
                <li><code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">/local/path</code> — Local directory</li>
              </ul>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                Search GitHub for <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">claude-plugins</code> to find community marketplaces.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddMarketplaceDialog({ open: false, repo: '' })}>
              Cancel
            </Button>
            <Button onClick={handleAddMarketplace} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Marketplace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
