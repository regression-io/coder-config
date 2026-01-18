import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, RefreshCw, ExternalLink, FolderPlus, Trash2, ArrowLeft, Settings, Check, X, MoreVertical, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function SubprojectsView({ project, rootProject, onRefresh }) {
  const [deleteDialog, setDeleteDialog] = useState({ open: false, proj: null });
  const [removeDialog, setRemoveDialog] = useState({ open: false, proj: null });
  const [addDialog, setAddDialog] = useState({ open: false, path: '' });
  const [selectedProjects, setSelectedProjects] = useState(new Set());

  // Use rootProject subprojects if available (sticky behavior)
  const subprojects = rootProject?.subprojects || project.subprojects || [];
  const isInSubproject = rootProject && project.dir !== rootProject.dir;

  // Selection helpers
  const isSelected = (dir) => selectedProjects.has(dir);
  const toggleSelect = (dir) => {
    setSelectedProjects(prev => {
      const next = new Set(prev);
      if (next.has(dir)) {
        next.delete(dir);
      } else {
        next.add(dir);
      }
      return next;
    });
  };
  const selectAll = () => {
    setSelectedProjects(new Set(subprojects.map(p => p.dir)));
  };
  const clearSelection = () => {
    setSelectedProjects(new Set());
  };
  const allSelected = subprojects.length > 0 && selectedProjects.size === subprojects.length;
  const someSelected = selectedProjects.size > 0;

  // Batch init handler
  const handleInitBatch = async (dirs) => {
    try {
      const result = await api.initClaudeFolderBatch(dirs);
      if (result.success) {
        toast.success(`Created .claude folders in ${result.count} project${result.count !== 1 ? 's' : ''}`);
        clearSelection();
        onRefresh();
      } else {
        toast.error(result.error || 'Failed to init projects');
      }
    } catch (error) {
      toast.error('Failed to init projects: ' + error.message);
    }
  };

  // Init all unconfigured
  const handleInitAllUnconfigured = async () => {
    const unconfigured = subprojects.filter(p => !p.hasConfig).map(p => p.dir);
    if (unconfigured.length === 0) {
      toast.info('All sub-projects already have .claude folders');
      return;
    }
    await handleInitBatch(unconfigured);
  };

  // Init selected
  const handleInitSelected = async () => {
    const dirs = Array.from(selectedProjects);
    if (dirs.length === 0) return;
    await handleInitBatch(dirs);
  };

  const handleSwitchProject = async (dir) => {
    try {
      await api.switchProject(dir);
      window.location.reload();
    } catch (error) {
      toast.error('Failed to switch project: ' + error.message);
    }
  };

  const handleBackToRoot = async () => {
    if (rootProject?.dir) {
      await handleSwitchProject(rootProject.dir);
    }
  };

  const handleInitClaudeFolder = async (proj, e) => {
    e.stopPropagation();
    try {
      const result = await api.initClaudeFolder(proj.dir);
      if (result.success) {
        toast.success(`Created .claude folder in ${proj.name}`);
        onRefresh();
      } else {
        toast.error(result.error || 'Failed to create .claude folder');
      }
    } catch (error) {
      toast.error('Failed to create .claude folder: ' + error.message);
    }
  };

  const handleDeleteClaudeFolder = async () => {
    const proj = deleteDialog.proj;
    if (!proj) return;

    try {
      const result = await api.deleteClaudeFolder(proj.dir);
      if (result.success) {
        toast.success(`Deleted .claude folder from ${proj.name}`);
        onRefresh();
      } else {
        toast.error(result.error || 'Failed to delete .claude folder');
      }
    } catch (error) {
      toast.error('Failed to delete .claude folder: ' + error.message);
    }
    setDeleteDialog({ open: false, proj: null });
  };

  const openDeleteDialog = (proj, e) => {
    e.stopPropagation();
    setDeleteDialog({ open: true, proj });
  };

  // Add manual sub-project
  const handleAddSubproject = async () => {
    const subPath = addDialog.path.trim();
    if (!subPath) {
      toast.error('Please enter a folder path');
      return;
    }

    try {
      const projectRoot = rootProject?.dir || project.dir;
      const result = await api.addManualSubproject(projectRoot, subPath);
      if (result.success) {
        toast.success(`Added sub-project: ${subPath.split('/').pop()}`);
        setAddDialog({ open: false, path: '' });
        onRefresh();
      } else {
        toast.error(result.error || 'Failed to add sub-project');
      }
    } catch (error) {
      toast.error('Failed to add sub-project: ' + error.message);
    }
  };

  // Remove manual sub-project
  const handleRemoveSubproject = async () => {
    const proj = removeDialog.proj;
    if (!proj) return;

    try {
      const projectRoot = rootProject?.dir || project.dir;
      const result = await api.removeManualSubproject(projectRoot, proj.dir);
      if (result.success) {
        toast.success(`Removed sub-project: ${proj.name}`);
        onRefresh();
      } else {
        toast.error(result.error || 'Failed to remove sub-project');
      }
    } catch (error) {
      toast.error('Failed to remove sub-project: ' + error.message);
    }
    setRemoveDialog({ open: false, proj: null });
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Folder className="w-5 h-5 text-amber-500" />
              Sub-Projects
            </h2>
            {subprojects.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => checked ? selectAll() : clearSelection()}
                  className="data-[state=checked]:bg-primary"
                />
                <span className="text-sm text-muted-foreground">
                  {someSelected ? `${selectedProjects.size} selected` : 'Select all'}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddDialog({ open: true, path: '' })}>
              <Plus className="w-4 h-4 mr-2" />
              Add Sub-project
            </Button>
            {subprojects.some(p => !p.hasConfig) && (
              <Button variant="outline" size="sm" onClick={handleInitAllUnconfigured}>
                <FolderPlus className="w-4 h-4 mr-2" />
                Init All Unconfigured
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Current location info */}
        <div className={`p-4 mx-4 mb-4 mt-4 rounded-lg border-l-4 ${isInSubproject ? 'bg-blue-500/10 border-blue-500' : 'bg-amber-500/10 border-amber-500'}`}>
          {isInSubproject && (
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Currently in sub-project
              </p>
              <Button variant="outline" size="sm" onClick={handleBackToRoot} className="h-7">
                <ArrowLeft className="w-3 h-3 mr-1" />
                Back to Root
              </Button>
            </div>
          )}
          <p className="text-sm text-foreground">
            <span className="font-semibold">Current Directory:</span>{' '}
            <code className="text-muted-foreground bg-muted px-2 py-0.5 rounded">{project.dir}</code>
          </p>
          {rootProject && rootProject.dir !== project.dir && (
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-semibold">Root Project:</span>{' '}
              <code className="bg-muted px-2 py-0.5 rounded">{rootProject.dir}</code>
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {subprojects.length} sub-project{subprojects.length !== 1 ? 's' : ''} ({subprojects.filter(p => !p.isManual).length} detected, {subprojects.filter(p => p.isManual).length} linked)
          </p>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subprojects.map((proj, index) => {
            const isCurrentProject = proj.dir === project.dir;
            const isChecked = isSelected(proj.dir);
            return (
              <motion.div
                key={proj.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-card rounded-lg border p-4 transition-all group relative ${
                  isCurrentProject
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : isChecked
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:shadow-md'
                }`}
              >
                {/* Checkbox overlay */}
                <div className="absolute top-3 left-3 z-10">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggleSelect(proj.dir)}
                    className="data-[state=checked]:bg-primary"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Context Menu */}
                <div className="absolute top-3 right-3 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {!proj.hasConfig && (
                        <DropdownMenuItem onClick={() => handleInitClaudeFolder(proj, { stopPropagation: () => {} })}>
                          <FolderPlus className="w-4 h-4 mr-2" />
                          Init .claude folder
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleSwitchProject(proj.dir)}>
                        <Settings className="w-4 h-4 mr-2" />
                        Switch to project
                      </DropdownMenuItem>
                      {(proj.hasConfig || proj.isManual) && (
                        <>
                          <DropdownMenuSeparator />
                          {proj.hasConfig && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => openDeleteDialog(proj, { stopPropagation: () => {} })}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete .claude folder
                            </DropdownMenuItem>
                          )}
                          {proj.isManual && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => { e.stopPropagation(); setRemoveDialog({ open: true, proj }); }}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Remove sub-project
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Card content - clickable area */}
                <div
                  className="cursor-pointer pl-8"
                  onClick={() => !isCurrentProject && handleSwitchProject(proj.dir)}
                >
                  <div className="flex items-start justify-between mb-3 pr-8">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{proj.name}</h3>
                      {isCurrentProject && (
                        <Badge variant="default" className="text-xs">Current</Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {proj.markers?.git && <span title="Git">🔀</span>}
                      {proj.markers?.npm && <span title="NPM">📦</span>}
                      {proj.markers?.python && <span title="Python">🐍</span>}
                      {proj.markers?.claude && <span title="Claude Config">⚙️</span>}
                    </div>
                  </div>
                  <code className="text-xs text-muted-foreground block mb-3">{proj.relativePath || proj.name}</code>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={proj.hasConfig
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30'
                      : 'bg-muted text-muted-foreground border-border'
                    }>
                      {proj.hasConfig ? `✓ ${proj.mcpCount || 0} MCPs` : 'No config'}
                    </Badge>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {subprojects.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              <p>No sub-projects found.</p>
              <p className="text-sm mt-1">Click "Add Sub-project" to link an external folder.</p>
            </div>
          )}
        </div>

        {/* Floating Action Bar - shows when items are selected */}
        <AnimatePresence>
          {someSelected && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="bg-card border border-border rounded-lg shadow-xl px-4 py-3 flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  {selectedProjects.size} selected
                </span>
                <div className="h-4 w-px bg-border" />
                <Button size="sm" variant="default" onClick={handleInitSelected}>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Init .claude
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelection}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, proj: deleteDialog.proj })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete .claude folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the .claude folder from <strong>{deleteDialog.proj?.name}</strong>, including all rules, commands, and configuration.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClaudeFolder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Sub-project Dialog */}
      <Dialog open={addDialog.open} onOpenChange={(open) => setAddDialog({ ...addDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Sub-project</DialogTitle>
            <DialogDescription>
              Enter the path to a folder you want to manage as a sub-project. This can be any folder, including external projects.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="/path/to/project or ~/projects/my-app"
              value={addDialog.path}
              onChange={(e) => setAddDialog({ ...addDialog, path: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSubproject()}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Tip: Use ~ for home directory. The folder must exist.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog({ open: false, path: '' })}>
              Cancel
            </Button>
            <Button onClick={handleAddSubproject}>
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Sub-project Confirmation Dialog */}
      <AlertDialog open={removeDialog.open} onOpenChange={(open) => setRemoveDialog({ open, proj: removeDialog.proj })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove sub-project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{removeDialog.proj?.name}</strong> from your sub-projects list.
              The folder and its contents will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveSubproject}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
