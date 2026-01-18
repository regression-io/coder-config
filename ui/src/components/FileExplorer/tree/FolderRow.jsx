import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  Settings,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Home,
  Server,
  BookOpen,
  Terminal,
  Sparkles,
  GitBranch,
  FileText,
  FileCode,
  Brain,
  EyeOff,
  Puzzle,
} from 'lucide-react';
import TreeItem from './TreeItem';

export default function FolderRow({
  folder,
  isExpanded,
  isHome,
  isProject,
  isSubproject,
  depth = 0,
  onToggle,
  onCreateFile,
  onInstallPlugin,
  onSelectItem,
  selectedPath,
  onContextMenu,
  expandedFolders,
  onToggleFolder,
  hasSubprojects,
  onAddSubproject,
  onRemoveSubproject,
  onHideSubproject
}) {
  // Check what files already exist
  const hasMcps = folder.files?.some(f => f.name === 'mcps.json');
  const hasSettings = folder.files?.some(f => f.name === 'settings.json');
  const hasClaudeMd = folder.files?.some(f => f.name === 'CLAUDE.md' || f.name === 'CLAUDE.md (root)');
  const hasEnv = folder.files?.some(f => f.name === '.env');

  // Determine folder styling
  const getBgColor = () => {
    if (isHome) return 'bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30';
    if (isSubproject && depth > 1) return 'bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700';
    if (isSubproject) return 'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30';
    if (isProject) return 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30';
    return 'bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700';
  };

  const getTextColor = () => {
    if (isHome) return 'text-indigo-700 dark:text-indigo-400';
    if (isSubproject && depth > 1) return 'text-gray-600 dark:text-slate-400';
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
          'flex items-center gap-2 py-2 cursor-pointer transition-colors',
          getBgColor()
        )}
        style={{ paddingLeft: `${12 + (depth * 16)}px`, paddingRight: '24px' }}
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
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0 mr-1 hover:bg-white/50 dark:hover:bg-slate-900/50">
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
              {!isSubproject && folder.exists && totalFiles === 0 && (
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
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onInstallPlugin(folder.dir, folder.name || folder.dir.split('/').pop()); }}>
              <Puzzle className="w-4 h-4 mr-2" />
              Install Plugins
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
            {/* Hide Sub-project - for all sub-projects */}
            {isSubproject && onHideSubproject && (
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onHideSubproject(folder.dir); }}
              >
                <EyeOff className="w-4 h-4 mr-2" />
                Hide
              </DropdownMenuItem>
            )}
            {/* Remove Sub-project - only for manually added sub-projects */}
            {folder.isManual && onRemoveSubproject && (
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onRemoveSubproject(folder.dir); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </DropdownMenuItem>
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
