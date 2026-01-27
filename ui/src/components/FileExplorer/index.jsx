import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import SyncDialog from '@/components/SyncDialog';
import PathPicker from '@/components/PathPicker';
import PluginSelectorDialog from '@/components/PluginSelectorDialog';
import TerminalDialog from '@/components/TerminalDialog';
import { toast } from 'sonner';
import {
  File,
  RefreshCw,
  Copy,
  Move,
  Trash2,
  Edit3,
  ArrowLeftRight,
} from 'lucide-react';

// Extracted components
import { FolderRow } from './tree';
import { McpEditor, MarkdownEditor, SettingsEditor } from './editors';
import { MoveCopyDialog, RenameDialog, CreateFileDialog } from './dialogs';

export default function FileExplorer({ project, onRefresh }) {
  const [folders, setFolders] = useState([]);
  const [intermediatePaths, setIntermediatePaths] = useState([]);
  const [registry, setRegistry] = useState(null);
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
  const [addSubprojectDialog, setAddSubprojectDialog] = useState({ open: false, projectDir: null });
  const [pluginDialog, setPluginDialog] = useState({ open: false, dir: null, name: null });
  const [terminalDialog, setTerminalDialog] = useState({ open: false, dir: null });
  const [contextMenu, setContextMenu] = useState({ x: 0, y: 0, item: null });

  const [enabledTools, setEnabledTools] = useState(['claude']);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [foldersData, pathsData, registryData, configData] = await Promise.all([
        api.getClaudeFolders(),
        api.getIntermediatePaths(),
        api.getRegistry(),
        api.getConfig(),
      ]);
      setFolders(foldersData);
      setIntermediatePaths(pathsData);
      setRegistry(registryData);
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

  const handleCreateFile = async (dir, type) => {
    if (type === 'command' || type === 'rule' || type === 'workflow' || type === 'memory') {
      setCreateDialog({ open: true, dir, type });
    } else if (type === 'claudemd') {
      // Open terminal to run `claude /init` for proper project-aware CLAUDE.md generation
      setTerminalDialog({ open: true, dir });
    } else {
      const fileName = type === 'mcps' ? 'mcps.json' :
                       type === 'settings' ? 'settings.json' :
                       type === 'env' ? '.env' : 'CLAUDE.md';
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
          type: ['command', 'rule', 'workflow', 'env', 'mcps', 'settings', 'claudemd', 'memory'].includes(type) ? type : 'file'
        };
        setSelectedItem(newItem);
        setFileContent({ content: result.content || '', parsed: null });
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

  const handleAddSubproject = async (selectedPath) => {
    if (!selectedPath) return;
    try {
      const result = await api.addManualSubproject(addSubprojectDialog.projectDir, selectedPath);
      if (result.success) {
        toast.success(`Added sub-project: ${selectedPath.split('/').pop()}`);
        setAddSubprojectDialog({ open: false, projectDir: null });
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

  const handleHideSubproject = async (subprojectDir) => {
    // Find the root project dir
    const rootProject = folders.find(f => !f.isSubproject && !f.isHome);
    if (!rootProject) return;

    try {
      const result = await api.hideSubproject(rootProject.dir, subprojectDir);
      if (result.success) {
        toast.success('Sub-project hidden');
        loadData();
      } else {
        toast.error(result.error || 'Failed to hide sub-project');
      }
    } catch (error) {
      toast.error('Failed to hide sub-project: ' + error.message);
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

    // Extract the config directory from the path (e.g., /path/to/project/.claude/mcps.json -> /path/to/project)
    const configDir = selectedItem.path ? selectedItem.path.replace(/\/.claude\/mcps\.json$/, '') : null;

    switch (selectedItem.type) {
      case 'mcps':
        return (
          <McpEditor
            content={fileContent.content}
            parsed={fileContent.parsed}
            onSave={handleSaveFile}
            registry={registry}
            configDir={configDir}
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
      <div className="w-76 border-r flex flex-col bg-white dark:bg-slate-950">
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
              depth={folder.depth || 0}
              onToggle={() => handleToggleFolder(folder.dir)}
              onCreateFile={handleCreateFile}
              onInstallPlugin={(dir, name) => setPluginDialog({ open: true, dir, name })}
              onSelectItem={handleSelectItem}
              selectedPath={selectedItem?.path}
              onContextMenu={handleContextMenu}
              expandedFolders={expandedFolders}
              onToggleFolder={handleToggleNestedFolder}
              hasSubprojects={hasSubprojects}
              onAddSubproject={(projectDir) => setAddSubprojectDialog({ open: true, projectDir })}
              onRemoveSubproject={handleRemoveSubproject}
              onHideSubproject={handleHideSubproject}
              enabledTools={enabledTools}
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
      {/* Plugin Selector */}
      <PluginSelectorDialog
        open={pluginDialog.open}
        onOpenChange={(open) => setPluginDialog({ ...pluginDialog, open })}
        projectDir={pluginDialog.dir}
        projectName={pluginDialog.name}
      />
      {/* Add Sub-project Folder Picker */}
      <PathPicker
        open={addSubprojectDialog.open}
        onOpenChange={(open) => setAddSubprojectDialog({ ...addSubprojectDialog, open })}
        onSelect={handleAddSubproject}
        type="directory"
        title="Add Sub-project"
        initialPath={addSubprojectDialog.projectDir || '~'}
      />
      {/* Terminal for claude /init */}
      <TerminalDialog
        open={terminalDialog.open}
        onOpenChange={(open) => {
          setTerminalDialog({ ...terminalDialog, open });
          if (!open) {
            // Refresh data when terminal closes to show new CLAUDE.md
            loadData();
          }
        }}
        title="Initialize CLAUDE.md"
        description="Running claude -p /init to generate project-aware CLAUDE.md"
        cwd={terminalDialog.dir}
        initialCommand="claude -p /init; exit"
        autoCloseOnExit={true}
        autoCloseDelay={2000}
      />

    </div>
  );
}
