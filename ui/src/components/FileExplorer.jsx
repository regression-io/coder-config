import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import ClaudeSettingsEditor from './ClaudeSettingsEditor';
import GeminiSettingsEditor from './GeminiSettingsEditor';
import SyncDialog from './SyncDialog';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  File,
  FileJson,
  FileText,
  Settings,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Copy,
  Move,
  Trash2,
  Edit3,
  RefreshCw,
  Home,
  Server,
  BookOpen,
  Terminal,
  Sparkles,
  Save,
  X,
  GitBranch,
  ArrowLeftRight,
  FileCode,
  Layout,
  Brain,
} from 'lucide-react';

// File type icons and colors
const FILE_CONFIG = {
  mcps: {
    icon: Server,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label: 'MCP Servers',
  },
  settings: {
    icon: Settings,
    color: 'text-gray-600 dark:text-slate-400',
    bgColor: 'bg-gray-50 dark:bg-slate-800',
    label: 'Settings',
  },
  command: {
    icon: Terminal,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'Command',
  },
  rule: {
    icon: BookOpen,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    label: 'Rule',
  },
  workflow: {
    icon: GitBranch,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    label: 'Workflow',
  },
  claudemd: {
    icon: FileText,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    label: 'CLAUDE.md',
  },
  geminimd: {
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label: 'GEMINI.md',
  },
  env: {
    icon: FileCode,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    label: '.env',
  },
  memory: {
    icon: Brain,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    label: 'Memory',
  },
  folder: {
    icon: Folder,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    label: 'Folder',
  },
};

// Tree Item Component for files within expanded folder
function TreeItem({ item, level = 0, selectedPath, onSelect, onContextMenu, expandedFolders, onToggleFolder }) {
  const config = FILE_CONFIG[item.type] || FILE_CONFIG.folder;
  const Icon = config.icon;
  const isSelected = selectedPath === item.path;
  const isFolder = item.type === 'folder';
  const isExpanded = expandedFolders[item.path];

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm',
          'hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors',
          isSelected && 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/30'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => isFolder ? onToggleFolder(item.path) : onSelect(item)}
        onContextMenu={(e) => onContextMenu(e, item)}
      >
        {isFolder && (
          <span className="w-4 h-4 flex items-center justify-center">
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
        )}
        {!isFolder && <span className="w-4" />}
        <Icon className={cn('w-4 h-4', config.color)} />
        <span className="flex-1 truncate">{item.name}</span>
        {item.mcpCount > 0 && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {item.mcpCount}
          </Badge>
        )}
      </div>

      {isFolder && isExpanded && item.children && (
        <div>
          {item.children.map((child) => (
            <TreeItem
              key={child.path}
              item={child}
              level={level + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Folder Row Component - collapsible tree entry
function FolderRow({ folder, isExpanded, isHome, isProject, isSubproject, onToggle, onCreateFile, onSelectItem, selectedPath, onContextMenu, expandedFolders, onToggleFolder, templates, hasSubprojects, onAddSubproject, onRemoveSubproject }) {
  // Check what files already exist
  const hasMcps = folder.files?.some(f => f.name === 'mcps.json');
  const hasSettings = folder.files?.some(f => f.name === 'settings.json');
  const hasClaudeMd = folder.files?.some(f => f.name === 'CLAUDE.md' || f.name === 'CLAUDE.md (root)');
  const hasEnv = folder.files?.some(f => f.name === '.env');

  // Determine folder styling
  const getBgColor = () => {
    if (isHome) return 'bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30';
    if (isSubproject) return 'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30';
    if (isProject) return 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30';
    return 'bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700';
  };

  const getTextColor = () => {
    if (isHome) return 'text-indigo-700 dark:text-indigo-400';
    if (isSubproject) return 'text-amber-700 dark:text-amber-400';
    if (isProject) return 'text-green-700 dark:text-green-400';
    return 'text-gray-700 dark:text-slate-300';
  };

  const getIcon = () => {
    if (isHome) return Home;
    if (isExpanded) return FolderOpen;
    return Folder;
  };

  const Icon = getIcon();
  const displayLabel = isHome ? 'Home' : folder.label;

  // Count total files across all tool folders
  const totalFiles = (folder.files?.length || 0) + (folder.geminiFiles?.length || 0) + (folder.agentFiles?.length || 0);

  return (
    <div className="border-b border-gray-200 dark:border-slate-700">
      {/* Folder Header Row */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors',
          getBgColor()
        )}
        onClick={onToggle}
      >
        <span className="w-4 h-4 flex items-center justify-center text-gray-500">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
        <Icon className={cn('w-4 h-4', getTextColor())} />
        <span className={cn('flex-1 min-w-0 font-medium text-sm truncate', getTextColor())}>
          {displayLabel}
        </span>
        {/* + Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0 hover:bg-white/50 dark:hover:bg-slate-900/50">
              <Plus className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {/* Info badges row */}
            <div className="flex items-center gap-1 px-2 py-1.5 border-b mb-1">
              {isProject && hasSubprojects && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700">
                  root
                </Badge>
              )}
              {!folder.exists && !isHome && (
                <Badge variant="outline" className="text-[10px] px-1 py-0">no config</Badge>
              )}
              {folder.appliedTemplate?.template && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700">
                  {folder.appliedTemplate.template.split('/').pop()}
                </Badge>
              )}
              {!isSubproject && folder.exists && !folder.appliedTemplate?.template && totalFiles === 0 && (
                <span className="text-[10px] text-muted-foreground">configured</span>
              )}
            </div>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onCreateFile(folder.dir, 'mcps'); }}
              disabled={hasMcps}
              className={hasMcps ? 'opacity-50' : ''}
            >
              <Server className="w-4 h-4 mr-2" />
              mcps.json
              {hasMcps && <span className="ml-auto text-xs text-muted-foreground">exists</span>}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onCreateFile(folder.dir, 'settings'); }}
              disabled={hasSettings}
              className={hasSettings ? 'opacity-50' : ''}
            >
              <Settings className="w-4 h-4 mr-2" />
              settings.json
              {hasSettings && <span className="ml-auto text-xs text-muted-foreground">exists</span>}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onCreateFile(folder.dir, 'env'); }}
              disabled={hasEnv}
              className={hasEnv ? 'opacity-50' : ''}
            >
              <FileCode className="w-4 h-4 mr-2" />
              .env
              {hasEnv && <span className="ml-auto text-xs text-muted-foreground">exists</span>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateFile(folder.dir, 'command'); }}>
              <Terminal className="w-4 h-4 mr-2" />
              New Command
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateFile(folder.dir, 'rule'); }}>
              <BookOpen className="w-4 h-4 mr-2" />
              New Rule
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateFile(folder.dir, 'workflow'); }}>
              <GitBranch className="w-4 h-4 mr-2" />
              New Workflow
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateFile(folder.dir, 'memory'); }}>
              <Brain className="w-4 h-4 mr-2" />
              New Memory
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onCreateFile(folder.dir, 'claudemd'); }}
              disabled={hasClaudeMd}
              className={hasClaudeMd ? 'opacity-50' : ''}
            >
              <FileText className="w-4 h-4 mr-2" />
              CLAUDE.md
              {hasClaudeMd && <span className="ml-auto text-xs text-muted-foreground">exists</span>}
            </DropdownMenuItem>
            {/* Add Sub-project - for root project and sub-projects */}
            {(isProject || isSubproject) && onAddSubproject && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddSubproject(folder.dir); }}>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Add Sub-project
                </DropdownMenuItem>
              </>
            )}
            {/* Remove Sub-project - only for manually added sub-projects */}
            {folder.isManual && onRemoveSubproject && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onRemoveSubproject(folder.dir); }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Sub-project
                </DropdownMenuItem>
              </>
            )}
            {/* Only show Apply Template when no template applied yet */}
            {templates && templates.length > 0 && (isSubproject || !hasSubprojects) && !folder.appliedTemplate?.template && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Layout className="w-4 h-4 mr-2" />
                    Apply Template
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {templates.map((t) => {
                      const templateId = t.id || t.name;
                      return (
                        <DropdownMenuItem
                          key={templateId}
                          onClick={(e) => { e.stopPropagation(); onCreateFile(folder.dir, 'template', templateId); }}
                        >
                          {t.name}
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="text-xs text-muted-foreground">
                        Mark as Applied (migration)
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {templates.map((t) => {
                          const templateId = t.id || t.name;
                          return (
                            <DropdownMenuItem
                              key={templateId}
                              onClick={(e) => { e.stopPropagation(); onCreateFile(folder.dir, 'mark-template', templateId); }}
                            >
                              {t.name}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="bg-white dark:bg-slate-950 py-1">
          {/* Claude Code .claude files */}
          {folder.files && folder.files.length > 0 && (
            <div className="mb-1">
              <div className="px-4 py-1 text-[10px] font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Claude Code
              </div>
              {folder.files.map((file) => (
                <TreeItem
                  key={file.path}
                  item={file}
                  selectedPath={selectedPath}
                  onSelect={onSelectItem}
                  onContextMenu={onContextMenu}
                  expandedFolders={expandedFolders}
                  onToggleFolder={onToggleFolder}
                />
              ))}
            </div>
          )}

          {/* Gemini CLI .gemini files */}
          {folder.geminiFiles && folder.geminiFiles.length > 0 && (
            <div className="mb-1 border-t border-dashed border-gray-200 dark:border-slate-700 pt-1">
              <div className="px-4 py-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Gemini CLI
              </div>
              {folder.geminiFiles.map((file) => (
                <TreeItem
                  key={file.path}
                  item={file}
                  selectedPath={selectedPath}
                  onSelect={onSelectItem}
                  onContextMenu={onContextMenu}
                  expandedFolders={expandedFolders}
                  onToggleFolder={onToggleFolder}
                />
              ))}
            </div>
          )}

          {/* Antigravity .agent files */}
          {folder.agentFiles && folder.agentFiles.length > 0 && (
            <div className="mb-1 border-t border-dashed border-gray-200 dark:border-slate-700 pt-1">
              <div className="px-4 py-1 text-[10px] font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Antigravity
              </div>
              {folder.agentFiles.map((file) => (
                <TreeItem
                  key={file.path}
                  item={file}
                  selectedPath={selectedPath}
                  onSelect={onSelectItem}
                  onContextMenu={onContextMenu}
                  expandedFolders={expandedFolders}
                  onToggleFolder={onToggleFolder}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {(!folder.files || folder.files.length === 0) &&
           (!folder.geminiFiles || folder.geminiFiles.length === 0) &&
           (!folder.agentFiles || folder.agentFiles.length === 0) && (
            <div className="px-4 py-3 text-sm text-gray-400 dark:text-slate-500 italic text-center">
              No config files. Use + to create.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// MCP Editor Component
function McpEditor({ content, parsed, onSave, registry }) {
  const [localConfig, setLocalConfig] = useState(parsed || { include: [], mcpServers: {} });
  const [viewMode, setViewMode] = useState('rich');
  const [jsonText, setJsonText] = useState(JSON.stringify(parsed || {}, null, 2));
  const [hasChanges, setHasChanges] = useState(false);
  const [addDialog, setAddDialog] = useState({ open: false, json: '' });

  useEffect(() => {
    setLocalConfig(parsed || { include: [], mcpServers: {} });
    setJsonText(JSON.stringify(parsed || {}, null, 2));
    setHasChanges(false);
  }, [parsed]);

  const handleToggleInclude = (name) => {
    const newInclude = localConfig.include?.includes(name)
      ? localConfig.include.filter(n => n !== name)
      : [...(localConfig.include || []), name];
    setLocalConfig({ ...localConfig, include: newInclude });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (viewMode === 'json') {
      try {
        const parsed = JSON.parse(jsonText);
        onSave(JSON.stringify(parsed, null, 2));
      } catch (e) {
        toast.error('Invalid JSON');
        return;
      }
    } else {
      onSave(JSON.stringify(localConfig, null, 2));
    }
    setHasChanges(false);
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
      setHasChanges(true);

      const count = Object.keys(mcpsToAdd).length;
      toast.success(`Added ${count} MCP${count > 1 ? 's' : ''} - click Save to apply`);
      setAddDialog({ open: false, json: '' });
    } catch (error) {
      toast.error('Failed to add: ' + error.message);
    }
  };

  const registryMcps = registry?.mcpServers ? Object.keys(registry.mcpServers) : [];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b bg-gray-50 dark:bg-slate-800">
        <Tabs value={viewMode} onValueChange={setViewMode}>
          <TabsList className="h-8">
            <TabsTrigger value="rich" className="text-xs px-3">Rich Editor</TabsTrigger>
            <TabsTrigger value="json" className="text-xs px-3">JSON</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setAddDialog({ open: true, json: '' })}>
            <Plus className="w-4 h-4 mr-1" />
            Add MCP
          </Button>
          {hasChanges && (
            <Button size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {viewMode === 'rich' ? (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Registry MCPs</h3>
              <div className="space-y-2">
                {registryMcps.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-slate-400">No MCPs in registry</p>
                ) : (
                  registryMcps.map((name) => (
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
                  ))
                )}
              </div>
            </div>

            {Object.keys(localConfig.mcpServers || {}).length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Inline MCPs</h3>
                <div className="space-y-2">
                  {Object.entries(localConfig.mcpServers).map(([name, config]) => (
                    <div key={name} className="p-2 rounded border bg-white dark:bg-slate-950 group">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{name}</span>
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
                              setHasChanges(true);
                              toast.success(`Removed ${name} - click Save to apply`);
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
                </div>
              </div>
            )}
          </div>
        ) : (
          <Textarea
            className="w-full h-full min-h-[400px] font-mono text-sm border-0 rounded-none resize-none"
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setHasChanges(true);
            }}
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

// Markdown Editor Component
function MarkdownEditor({ content, onSave, fileType }) {
  const [text, setText] = useState(content || '');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setText(content || '');
    setHasChanges(false);
  }, [content]);

  const handleSave = () => {
    onSave(text);
    setHasChanges(false);
  };

  const config = FILE_CONFIG[fileType] || FILE_CONFIG.claudemd;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b bg-gray-50 dark:bg-slate-800">
        <div className="flex items-center gap-2">
          <config.icon className={cn('w-4 h-4', config.color)} />
          <span className="text-sm font-medium">{config.label}</span>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          )}
        </div>
      </div>
      <Textarea
        className="flex-1 w-full font-mono text-sm border-0 rounded-none resize-none p-4"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setHasChanges(true);
        }}
        placeholder={`Enter ${config.label.toLowerCase()} content...`}
      />
    </div>
  );
}

// Settings Editor Component
function SettingsEditor({ content, parsed, onSave, filePath }) {
  const handleSave = async (settings) => {
    const jsonContent = JSON.stringify(settings, null, 2);
    onSave(jsonContent);
  };

  const isGemini = filePath?.includes('.gemini') || filePath?.includes('/.gemini/');
  const isAntigravity = filePath?.includes('.agent') || filePath?.includes('/antigravity/');

  if (isGemini && !isAntigravity) {
    return (
      <div className="h-full overflow-auto p-4">
        <GeminiSettingsEditor
          settings={parsed || {}}
          onSave={handleSave}
          loading={false}
          settingsPath={filePath || '~/.gemini/settings.json'}
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <ClaudeSettingsEditor
        settings={parsed || {}}
        onSave={handleSave}
        loading={false}
        settingsPath={filePath || '~/.claude/settings.json'}
      />
    </div>
  );
}

// Move/Copy Dialog Component
function MoveCopyDialog({ open, onClose, item, intermediatePaths, onMove }) {
  const [mode, setMode] = useState('copy');
  const [selectedPath, setSelectedPath] = useState(null);
  const [customPath, setCustomPath] = useState('');
  const [merge, setMerge] = useState(false);

  const handleSubmit = () => {
    const targetDir = customPath.trim() || selectedPath;
    if (!targetDir) {
      toast.error('Please select or enter a target path');
      return;
    }
    onMove(item.path, targetDir, mode, merge);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'copy' ? 'Copy' : 'Move'} {item?.name}</DialogTitle>
          <DialogDescription>Select a destination for this file</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant={mode === 'copy' ? 'default' : 'outline'} size="sm" onClick={() => setMode('copy')}>
              <Copy className="w-4 h-4 mr-1" /> Copy
            </Button>
            <Button variant={mode === 'move' ? 'default' : 'outline'} size="sm" onClick={() => setMode('move')}>
              <Move className="w-4 h-4 mr-1" /> Move
            </Button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {intermediatePaths?.map((p) => (
              <div
                key={p.dir}
                className={cn(
                  'flex items-center justify-between p-2 rounded border cursor-pointer',
                  selectedPath === p.dir ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                )}
                onClick={() => { setSelectedPath(p.dir); setCustomPath(''); }}
              >
                <div className="flex items-center gap-2">
                  {p.isHome ? <Home className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                  <span className="text-sm">{p.label}</span>
                </div>
                {p.hasClaudeFolder ? (
                  <Badge variant="secondary" className="text-xs">exists</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">create</Badge>
                )}
              </div>
            ))}
          </div>
          <div>
            <label className="text-sm font-medium">Or enter custom path:</label>
            <Input
              className="mt-1 font-mono text-sm"
              placeholder="/path/to/directory"
              value={customPath}
              onChange={(e) => { setCustomPath(e.target.value); setSelectedPath(null); }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={merge} onCheckedChange={setMerge} />
            <span className="text-sm">Merge if target exists</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>{mode === 'copy' ? 'Copy' : 'Move'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Rename Dialog Component
function RenameDialog({ open, onClose, item, onRename }) {
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (item?.name) {
      setNewName(item.name.replace(/\.md$/, ''));
    }
  }, [item, open]);

  const handleRename = () => {
    if (!newName.trim()) {
      toast.error('Please enter a name');
      return;
    }
    onRename(item, newName.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename {item?.type}</DialogTitle>
        </DialogHeader>
        <div>
          <label className="text-sm font-medium">New name</label>
          <Input
            className="mt-1"
            placeholder="new-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">.md extension will be added automatically</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleRename}>Rename</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Create File Dialog Component
function CreateFileDialog({ open, onClose, dir, type, onCreate }) {
  const [name, setName] = useState('');

  useEffect(() => {
    setName('');
  }, [open]);

  const handleCreate = () => {
    if ((type === 'command' || type === 'rule' || type === 'workflow' || type === 'memory') && !name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    const finalName = type === 'command' || type === 'rule' || type === 'workflow' || type === 'memory'
      ? (name.endsWith('.md') ? name : `${name}.md`)
      : name;
    onCreate(dir, finalName, type);
  };

  const config = FILE_CONFIG[type] || {};
  const needsName = type === 'command' || type === 'rule' || type === 'workflow' || type === 'memory';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create {config.label || type}</DialogTitle>
        </DialogHeader>
        {needsName && (
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              className="mt-1"
              placeholder={type === 'command' ? 'my-command.md' : type === 'workflow' ? 'my-workflow.md' : type === 'memory' ? 'context.md' : 'my-rule.md'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main FileExplorer Component
export default function FileExplorer({ project, onRefresh }) {
  const [folders, setFolders] = useState([]);
  const [intermediatePaths, setIntermediatePaths] = useState([]);
  const [registry, setRegistry] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  // Remember last expanded folder in localStorage
  const [expandedFolder, setExpandedFolder] = useState(() => {
    try {
      return localStorage.getItem('claude-config-expanded-folder') || null;
    } catch { return null; }
  });
  const [expandedFolders, setExpandedFolders] = useState({}); // For nested folders within files
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [moveCopyDialog, setMoveCopyDialog] = useState({ open: false, item: null });
  const [createDialog, setCreateDialog] = useState({ open: false, dir: null, type: null });
  const [renameDialog, setRenameDialog] = useState({ open: false, item: null });
  const [syncDialog, setSyncDialog] = useState(false);
  const [addSubprojectDialog, setAddSubprojectDialog] = useState({ open: false, projectDir: null, path: '' });
  const [contextMenu, setContextMenu] = useState({ x: 0, y: 0, item: null });

  const [enabledTools, setEnabledTools] = useState(['claude']);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [foldersData, pathsData, registryData, configData, templatesData] = await Promise.all([
        api.getClaudeFolders(),
        api.getIntermediatePaths(),
        api.getRegistry(),
        api.getConfig(),
        api.getTemplates().catch(() => []),
      ]);
      setFolders(foldersData);
      setIntermediatePaths(pathsData);
      setRegistry(registryData);
      setTemplates(templatesData.templates || templatesData || []);
      setEnabledTools(configData.config?.enabledTools || ['claude']);

      // Auto-expand root project on first load (if no saved selection)
      if (foldersData.length > 0) {
        const savedFolder = localStorage.getItem('claude-config-expanded-folder');
        // Only auto-expand if no saved folder, or saved folder doesn't exist in current data
        if (!savedFolder || !foldersData.find(f => f.dir === savedFolder)) {
          const nonSubprojects = foldersData.filter(f => !f.isSubproject);
          const rootProject = nonSubprojects.length > 1 ? nonSubprojects[nonSubprojects.length - 1] : nonSubprojects[0];
          const defaultDir = rootProject?.dir || foldersData[0].dir;
          setExpandedFolder(defaultDir);
          try { localStorage.setItem('claude-config-expanded-folder', defaultDir); } catch { /* ignore */ }
        }
      }
    } catch (error) {
      toast.error('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    setSelectedItem(null);
    setFileContent(null);
  }, [loadData, project?.dir]);

  const handleToggleFolder = (dir) => {
    const newExpanded = expandedFolder === dir ? null : dir;
    setExpandedFolder(newExpanded);
    try {
      if (newExpanded) {
        localStorage.setItem('claude-config-expanded-folder', newExpanded);
      } else {
        localStorage.removeItem('claude-config-expanded-folder');
      }
    } catch { /* ignore */ }
  };

  const handleSelectItem = async (item) => {
    setSelectedItem(item);
    try {
      const data = await api.getClaudeFile(item.path);
      setFileContent(data);
    } catch (error) {
      toast.error('Failed to load file: ' + error.message);
    }
  };

  const handleSaveFile = async (content) => {
    if (!selectedItem) return;
    try {
      await api.saveClaudeFile(selectedItem.path, content);
      toast.success('Saved');
      const data = await api.getClaudeFile(selectedItem.path);
      setFileContent(data);
      loadData();
    } catch (error) {
      toast.error('Failed to save: ' + error.message);
    }
  };

  const handleToggleNestedFolder = (path) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const handleCreateFile = async (dir, type, templateId = null) => {
    if (type === 'template' && templateId) {
      // Apply template
      try {
        await api.applyTemplate(templateId, dir);
        toast.success(`Applied template: ${templateId}`);
        loadData();
      } catch (error) {
        toast.error('Failed to apply template: ' + error.message);
      }
      return;
    }

    if (type === 'mark-template' && templateId) {
      // Mark template as applied (for migration, doesn't copy files)
      try {
        await api.markTemplateApplied(templateId, dir);
        toast.success(`Marked template: ${templateId}`);
        loadData();
      } catch (error) {
        toast.error('Failed to mark template: ' + error.message);
      }
      return;
    }

    if (type === 'command' || type === 'rule' || type === 'workflow' || type === 'memory') {
      setCreateDialog({ open: true, dir, type });
    } else {
      const fileName = type === 'mcps' ? 'mcps.json' :
                       type === 'settings' ? 'settings.json' :
                       type === 'env' ? '.env' :
                       type === 'claudemd' ? 'CLAUDE.md' : 'CLAUDE.md';
      doCreateFile(dir, fileName, type);
    }
  };

  const doCreateFile = async (dir, name, type) => {
    try {
      const result = await api.createClaudeFile(dir, name, type);
      toast.success('Created');
      setCreateDialog({ open: false, dir: null, type: null });
      await loadData();
      if (result.path) {
        const newItem = {
          path: result.path,
          name: name,
          type: type === 'command' ? 'command' : type === 'rule' ? 'rule' : type === 'workflow' ? 'workflow' : 'file'
        };
        setSelectedItem(newItem);
        setFileContent(result.content || '');
      }
    } catch (error) {
      toast.error('Failed to create: ' + error.message);
    }
  };

  const handleRename = async (item, newName) => {
    try {
      const result = await api.renameClaudeFile(item.path, newName);
      if (result.success) {
        toast.success('Renamed');
        setRenameDialog({ open: false, item: null });
        await loadData();
        setSelectedItem({ ...item, path: result.newPath, name: newName.endsWith('.md') ? newName : `${newName}.md` });
      } else {
        toast.error(result.error || 'Failed to rename');
      }
    } catch (error) {
      toast.error('Failed to rename: ' + error.message);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete ${item.name}?`)) return;
    try {
      await api.deleteClaudeFile(item.path);
      toast.success('Deleted');
      if (selectedItem?.path === item.path) {
        setSelectedItem(null);
        setFileContent(null);
      }
      loadData();
    } catch (error) {
      toast.error('Failed to delete: ' + error.message);
    }
  };

  const handleMove = async (sourcePath, targetDir, mode, merge) => {
    try {
      await api.moveClaudeItem(sourcePath, targetDir, mode, merge);
      toast.success(mode === 'copy' ? 'Copied' : 'Moved');
      setMoveCopyDialog({ open: false, item: null });
      loadData();
    } catch (error) {
      toast.error('Failed: ' + error.message);
    }
  };

  const handleAddSubproject = async () => {
    const subPath = addSubprojectDialog.path.trim();
    if (!subPath) {
      toast.error('Please enter a folder path');
      return;
    }
    try {
      const result = await api.addManualSubproject(addSubprojectDialog.projectDir, subPath);
      if (result.success) {
        toast.success(`Added sub-project: ${subPath.split('/').pop()}`);
        setAddSubprojectDialog({ open: false, projectDir: null, path: '' });
        loadData();
      } else {
        toast.error(result.error || 'Failed to add sub-project');
      }
    } catch (error) {
      toast.error('Failed to add sub-project: ' + error.message);
    }
  };

  const handleRemoveSubproject = async (subprojectDir) => {
    // Find the root project dir
    const rootProject = folders.find(f => !f.isSubproject && !f.isHome);
    if (!rootProject) return;

    try {
      const result = await api.removeManualSubproject(rootProject.dir, subprojectDir);
      if (result.success) {
        toast.success('Removed sub-project');
        loadData();
      } else {
        toast.error(result.error || 'Failed to remove sub-project');
      }
    } catch (error) {
      toast.error('Failed to remove sub-project: ' + error.message);
    }
  };

  const renderEditor = () => {
    if (!selectedItem || !fileContent) {
      return (
        <div className="h-full flex items-center justify-center text-gray-500 dark:text-slate-400">
          <div className="text-center">
            <File className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Select a file to edit</p>
          </div>
        </div>
      );
    }

    switch (selectedItem.type) {
      case 'mcps':
        return (
          <McpEditor
            content={fileContent.content}
            parsed={fileContent.parsed}
            onSave={handleSaveFile}
            registry={registry}
          />
        );
      case 'settings':
        return (
          <SettingsEditor
            content={fileContent.content}
            parsed={fileContent.parsed}
            onSave={handleSaveFile}
            filePath={selectedItem?.path}
          />
        );
      case 'command':
      case 'rule':
      case 'workflow':
      case 'claudemd':
      case 'env':
        return (
          <MarkdownEditor
            content={fileContent.content}
            onSave={handleSaveFile}
            fileType={selectedItem.type}
          />
        );
      default:
        return (
          <MarkdownEditor
            content={fileContent.content}
            onSave={handleSaveFile}
            fileType="claudemd"
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Determine folder types
  const hasSubprojects = folders.some(f => f.isSubproject);
  const getIsHome = (folder, index) => index === 0;
  const getIsProject = (folder, index) => {
    const firstSubprojectIndex = folders.findIndex(f => f.isSubproject);
    return !folder.isSubproject && (
      firstSubprojectIndex >= 0 ? index === firstSubprojectIndex - 1 : index === folders.length - 1
    );
  };

  return (
    <div className="h-full flex">
      {/* Left Panel - Tree View */}
      <div className="w-72 border-r flex flex-col bg-white dark:bg-slate-950">
        <div className="flex items-center justify-between p-3 border-b">
          <h2 className="font-semibold text-sm">Project Config</h2>
          <div className="flex gap-1">
            {enabledTools.includes('claude') && enabledTools.includes('antigravity') && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setSyncDialog(true)}
                title="Sync rules between tools"
              >
                <ArrowLeftRight className="w-4 h-4 mr-1" />
                Sync
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={loadData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          {folders.map((folder, index) => (
            <FolderRow
              key={folder.dir}
              folder={folder}
              isExpanded={expandedFolder === folder.dir}
              isHome={getIsHome(folder, index)}
              isProject={getIsProject(folder, index)}
              isSubproject={folder.isSubproject}
              onToggle={() => handleToggleFolder(folder.dir)}
              onCreateFile={handleCreateFile}
              onSelectItem={handleSelectItem}
              selectedPath={selectedItem?.path}
              onContextMenu={handleContextMenu}
              expandedFolders={expandedFolders}
              onToggleFolder={handleToggleNestedFolder}
              templates={templates}
              hasSubprojects={hasSubprojects}
              onAddSubproject={(projectDir) => setAddSubprojectDialog({ open: true, projectDir, path: '' })}
              onRemoveSubproject={handleRemoveSubproject}
            />
          ))}
        </ScrollArea>
      </div>

      {/* Right Panel - Editor */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-slate-900">
        {selectedItem && (
          <div className="flex items-center justify-between px-4 py-2 border-b bg-white dark:bg-slate-950">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 dark:text-slate-400 font-mono truncate max-w-md">
                {selectedItem.path}
              </span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setMoveCopyDialog({ open: true, item: selectedItem })}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(selectedItem)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
        <div className="flex-1">
          {renderEditor()}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.item && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu({ x: 0, y: 0, item: null })} />
          <div
            className="fixed z-50 bg-white dark:bg-slate-950 rounded-md shadow-lg border py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {(contextMenu.item?.type === 'rule' || contextMenu.item?.type === 'command' || contextMenu.item?.type === 'workflow') && (
              <button
                className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center"
                onClick={() => { setRenameDialog({ open: true, item: contextMenu.item }); setContextMenu({ x: 0, y: 0, item: null }); }}
              >
                <Edit3 className="w-4 h-4 mr-2" /> Rename
              </button>
            )}
            <button
              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center"
              onClick={() => { setMoveCopyDialog({ open: true, item: contextMenu.item }); setContextMenu({ x: 0, y: 0, item: null }); }}
            >
              <Copy className="w-4 h-4 mr-2" /> Copy to...
            </button>
            <button
              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center"
              onClick={() => { setMoveCopyDialog({ open: true, item: contextMenu.item }); setContextMenu({ x: 0, y: 0, item: null }); }}
            >
              <Move className="w-4 h-4 mr-2" /> Move to...
            </button>
            <div className="border-t my-1" />
            <button
              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center text-red-600"
              onClick={() => { handleDelete(contextMenu.item); setContextMenu({ x: 0, y: 0, item: null }); }}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </button>
          </div>
        </>
      )}

      {/* Dialogs */}
      <MoveCopyDialog
        open={moveCopyDialog.open}
        onClose={() => setMoveCopyDialog({ open: false, item: null })}
        item={moveCopyDialog.item}
        intermediatePaths={intermediatePaths}
        onMove={handleMove}
      />
      <CreateFileDialog
        open={createDialog.open}
        onClose={() => setCreateDialog({ open: false, dir: null, type: null })}
        dir={createDialog.dir}
        type={createDialog.type}
        onCreate={doCreateFile}
      />
      <RenameDialog
        open={renameDialog.open}
        onClose={() => setRenameDialog({ open: false, item: null })}
        item={renameDialog.item}
        onRename={handleRename}
      />
      <SyncDialog
        open={syncDialog}
        onOpenChange={setSyncDialog}
        projectDir={project?.dir}
        onSynced={loadData}
      />
      {/* Add Sub-project Dialog */}
      <Dialog open={addSubprojectDialog.open} onOpenChange={(open) => setAddSubprojectDialog({ ...addSubprojectDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Sub-project</DialogTitle>
            <DialogDescription>
              Enter the path to a folder you want to manage as a sub-project.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="/path/to/project or ~/projects/my-app"
              value={addSubprojectDialog.path}
              onChange={(e) => setAddSubprojectDialog({ ...addSubprojectDialog, path: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSubproject()}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Use ~ for home directory. The folder must exist.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSubprojectDialog({ open: false, projectDir: null, path: '' })}>
              Cancel
            </Button>
            <Button onClick={handleAddSubproject}>
              <FolderPlus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
