import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Puzzle, Plus, Trash2, RefreshCw, ExternalLink, Search,
  MoreVertical, Loader2, Check, Store, Package, Server, Globe
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const CATEGORY_ICONS = {
  'mcp': Server,
  'lsp': Package,
  'tools': Puzzle,
  'default': Puzzle,
};

const CATEGORY_COLORS = {
  'mcp': 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800',
  'lsp': 'text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950/30 dark:border-purple-800',
  'tools': 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-800',
  'default': 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-700',
};

export default function PluginsView() {
  const [loading, setLoading] = useState(true);
  const [pluginsData, setPluginsData] = useState({ installed: {}, marketplaces: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('all'); // 'all', 'installed', 'available'
  const [installing, setInstalling] = useState(null);
  const [uninstalling, setUninstalling] = useState(null);
  const [refreshing, setRefreshing] = useState(null);
  const [addMarketplaceDialog, setAddMarketplaceDialog] = useState({ open: false, name: '', repo: '' });

  // Load plugins and marketplaces
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

  // Parse plugins from the data structure
  const parsePlugins = () => {
    const installed = [];
    const available = [];

    // Parse installed plugins from the installed object
    // Format: { "name@marketplace": [...] }
    if (pluginsData.installed) {
      for (const [key, value] of Object.entries(pluginsData.installed)) {
        const [name, marketplace] = key.split('@');
        installed.push({
          id: key,
          name,
          marketplace,
          isInstalled: true,
          installedInfo: value
        });
      }
    }

    // Parse available plugins from marketplaces
    if (pluginsData.marketplaces) {
      for (const mp of pluginsData.marketplaces) {
        if (mp.plugins) {
          for (const plugin of mp.plugins) {
            const id = `${plugin.name}@${mp.name}`;
            const isInstalled = !!pluginsData.installed?.[id];

            if (!isInstalled) {
              available.push({
                ...plugin,
                id,
                marketplace: mp.name,
                isInstalled: false
              });
            } else {
              // Update installed plugin with full metadata
              const installedPlugin = installed.find(p => p.id === id);
              if (installedPlugin) {
                Object.assign(installedPlugin, plugin);
              }
            }
          }
        }
      }
    }

    return { installed, available };
  };

  // Filter plugins based on search and view mode
  const filteredPlugins = () => {
    const { installed, available } = parsePlugins();
    let list = [];

    if (viewMode === 'installed' || viewMode === 'all') {
      list = [...list, ...installed];
    }

    if (viewMode === 'available' || viewMode === 'all') {
      list = [...list, ...available];
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
      );
    }

    return list;
  };

  // Install plugin
  const handleInstall = async (plugin) => {
    setInstalling(plugin.id);
    try {
      const result = await api.installPlugin(plugin.name, plugin.marketplace);
      if (result.success) {
        toast.success(`Installed ${plugin.name}`);
        await loadData();
      } else {
        toast.error(result.error || 'Failed to install plugin');
      }
    } catch (error) {
      toast.error('Failed to install: ' + error.message);
    } finally {
      setInstalling(null);
    }
  };

  // Uninstall plugin
  const handleUninstall = async (plugin) => {
    setUninstalling(plugin.id);
    try {
      const result = await api.uninstallPlugin(plugin.id);
      if (result.success) {
        toast.success(`Uninstalled ${plugin.name}`);
        await loadData();
      } else {
        toast.error(result.error || 'Failed to uninstall plugin');
      }
    } catch (error) {
      toast.error('Failed to uninstall: ' + error.message);
    } finally {
      setUninstalling(null);
    }
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
    if (!addMarketplaceDialog.name.trim() || !addMarketplaceDialog.repo.trim()) {
      toast.error('Please enter both name and repository URL');
      return;
    }

    try {
      const result = await api.addMarketplace(
        addMarketplaceDialog.name.trim(),
        addMarketplaceDialog.repo.trim()
      );
      if (result.success) {
        toast.success(`Added marketplace: ${addMarketplaceDialog.name}`);
        setAddMarketplaceDialog({ open: false, name: '', repo: '' });
        await loadData();
      } else {
        toast.error(result.error || 'Failed to add marketplace');
      }
    } catch (error) {
      toast.error('Failed to add marketplace: ' + error.message);
    }
  };

  const filtered = filteredPlugins();
  const { installed, available } = parsePlugins();
  const installedCount = installed.length;
  const availableCount = available.length;
  const marketplaces = pluginsData.marketplaces || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plugins Section */}
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Puzzle className="w-5 h-5 text-indigo-600" />
              Claude Code Plugins
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

          {/* View Mode Tabs */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={viewMode === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('all')}
              className={viewMode === 'all' ? 'bg-indigo-600' : ''}
            >
              <Puzzle className="w-4 h-4 mr-2" />
              All ({installedCount + availableCount})
            </Button>
            <Button
              variant={viewMode === 'installed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('installed')}
              className={viewMode === 'installed' ? 'bg-green-600' : ''}
            >
              <Check className="w-4 h-4 mr-2" />
              Installed ({installedCount})
            </Button>
            <Button
              variant={viewMode === 'available' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('available')}
              className={viewMode === 'available' ? 'bg-blue-600' : ''}
            >
              <Store className="w-4 h-4 mr-2" />
              Available ({availableCount > 0 ? availableCount : 0})
            </Button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plugins..."
              className="pl-9 bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700"
            />
          </div>
        </div>

        {/* Plugins Grid */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((plugin, index) => {
            const CategoryIcon = CATEGORY_ICONS[plugin.category] || CATEGORY_ICONS.default;
            const categoryColor = CATEGORY_COLORS[plugin.category] || CATEGORY_COLORS.default;
            const isInstallingThis = installing === plugin.id;
            const isUninstallingThis = uninstalling === plugin.id;

            return (
              <motion.div
                key={plugin.id || `${plugin.name}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`rounded-lg border p-4 hover:shadow-md transition-all group ${
                  plugin.isInstalled
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                    : 'bg-white border-gray-200 dark:bg-slate-900 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{plugin.name}</h3>
                    {plugin.isInstalled && (
                      <Badge variant="outline" className="text-green-600 border-green-300 dark:text-green-400 dark:border-green-700">
                        <Check className="w-3 h-3 mr-1" />
                        Installed
                      </Badge>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {plugin.isInstalled ? (
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleUninstall(plugin)}
                          disabled={isUninstallingThis}
                        >
                          {isUninstallingThis ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 mr-2" />
                          )}
                          Uninstall
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => handleInstall(plugin)}
                          disabled={isInstallingThis}
                        >
                          {isInstallingThis ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4 mr-2" />
                          )}
                          Install
                        </DropdownMenuItem>
                      )}
                      {plugin.url && (
                        <DropdownMenuItem onClick={() => window.open(plugin.url, '_blank')}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Source
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="text-sm text-gray-600 dark:text-slate-400 mb-3 line-clamp-2">
                  {plugin.description || 'No description available'}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {plugin.category && (
                      <Badge variant="outline" className={categoryColor}>
                        <CategoryIcon className="w-3 h-3 mr-1" />
                        {plugin.category}
                      </Badge>
                    )}
                    {plugin.version && (
                      <span className="text-xs text-gray-500 dark:text-slate-500">v{plugin.version}</span>
                    )}
                  </div>

                  {plugin.marketplace && (
                    <span className="text-xs text-gray-400 dark:text-slate-500">{plugin.marketplace}</span>
                  )}
                </div>

                {/* Features preview */}
                {(plugin.mcpServers?.length > 0 || plugin.lspServers?.length > 0) && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-500">
                      {plugin.mcpServers?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Server className="w-3 h-3" />
                          {plugin.mcpServers.length} MCP
                        </span>
                      )}
                      {plugin.lspServers?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {plugin.lspServers.length} LSP
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick action button */}
                {!plugin.isInstalled && (
                  <Button
                    size="sm"
                    onClick={() => handleInstall(plugin)}
                    disabled={isInstallingThis}
                    className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {isInstallingThis ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Install
                  </Button>
                )}
              </motion.div>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-slate-400">
              {searchQuery
                ? 'No plugins match your search.'
                : viewMode === 'installed'
                ? 'No plugins installed yet.'
                : 'No plugins available. Add a marketplace to discover plugins.'}
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
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddMarketplaceDialog({ open: true, name: '', repo: '' })}
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
              {marketplaces.map((mp, index) => (
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
                    <span>{mp.plugins?.length || 0} plugins</span>
                    {mp.lastUpdated && (
                      <span>Updated: {new Date(mp.lastUpdated).toLocaleDateString()}</span>
                    )}
                  </div>
                </motion.div>
              ))}
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
              Add a new plugin marketplace repository. Marketplaces are Git repositories containing plugin definitions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Marketplace Name</label>
              <Input
                value={addMarketplaceDialog.name}
                onChange={(e) => setAddMarketplaceDialog({ ...addMarketplaceDialog, name: e.target.value })}
                placeholder="my-plugins"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Repository URL</label>
              <Input
                value={addMarketplaceDialog.repo}
                onChange={(e) => setAddMarketplaceDialog({ ...addMarketplaceDialog, repo: e.target.value })}
                placeholder="https://github.com/user/claude-plugins"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                The repository should contain a <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">.claude-plugin/marketplace.json</code> manifest
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddMarketplaceDialog({ open: false, name: '', repo: '' })}>
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
