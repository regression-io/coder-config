import React, { useState, useEffect } from 'react';
import { RefreshCw, Loader2, ArrowRight, Check, AlertCircle, FileText, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TOOLS = {
  claude: { name: 'Claude Code', folder: '.claude', color: 'text-orange-600', bg: 'bg-orange-50' },
  antigravity: { name: 'Antigravity', folder: '.agent', color: 'text-blue-600', bg: 'bg-blue-50' },
};

export default function SyncDialog({ open, onOpenChange, projectDir, onSynced }) {
  const [source, setSource] = useState('claude');
  const [target, setTarget] = useState('antigravity');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(new Set());

  // Load preview when dialog opens or source/target changes
  useEffect(() => {
    if (open && projectDir) {
      loadPreview();
    }
  }, [open, source, target, projectDir]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedFiles(new Set());
    }
  }, [open]);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const data = await api.getSyncPreview(projectDir, source, target);
      setPreview(data);
      // Auto-select new and different files
      const autoSelect = new Set(
        data.files
          ?.filter(f => f.status === 'new' || f.status === 'different')
          .map(f => f.name) || []
      );
      setSelectedFiles(autoSelect);
    } catch (error) {
      toast.error('Failed to load sync preview: ' + error.message);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSwapDirection = () => {
    setSource(target);
    setTarget(source);
  };

  const toggleFile = (fileName) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileName)) {
      newSelected.delete(fileName);
    } else {
      newSelected.add(fileName);
    }
    setSelectedFiles(newSelected);
  };

  const toggleAll = () => {
    if (selectedFiles.size === preview?.files?.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(preview?.files?.map(f => f.name) || []));
    }
  };

  const handleSync = async () => {
    if (selectedFiles.size === 0) {
      toast.error('Please select at least one file to sync');
      return;
    }

    setSyncing(true);
    try {
      const result = await api.syncRules(
        projectDir,
        source,
        target,
        Array.from(selectedFiles)
      );

      if (result.success) {
        toast.success(`Synced ${result.synced.length} file(s) to ${TOOLS[target].name}`);
        onSynced?.();
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Sync failed');
      }
    } catch (error) {
      toast.error('Sync failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">New</span>;
      case 'different':
        return <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">Modified</span>;
      case 'identical':
        return <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400">Same</span>;
      default:
        return null;
    }
  };

  const sourceTool = TOOLS[source];
  const targetTool = TOOLS[target];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-500" />
            Sync Rules Between Tools
          </DialogTitle>
          <DialogDescription>
            Copy rules from one AI tool's configuration to another.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Direction Selector */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">From</label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude">
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-orange-500" />
                      Claude Code
                    </span>
                  </SelectItem>
                  <SelectItem value="antigravity">
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-blue-500" />
                      Antigravity
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleSwapDirection}
              className="mt-5"
              title="Swap direction"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>

            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">To</label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude">
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-orange-500" />
                      Claude Code
                    </span>
                  </SelectItem>
                  <SelectItem value="antigravity">
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-blue-500" />
                      Antigravity
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Path Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Source: <code className="bg-muted px-1 rounded">{sourceTool.folder}/rules/</code></div>
            <div>Target: <code className="bg-muted px-1 rounded">{targetTool.folder}/rules/</code></div>
          </div>

          {/* File List */}
          <div className="border rounded-lg">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
              <span className="text-sm font-medium">Rules to Sync</span>
              {preview?.files?.length > 0 && (
                <Button variant="ghost" size="sm" onClick={toggleAll} className="h-6 text-xs">
                  {selectedFiles.size === preview.files.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>

            <div className="max-h-64 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : preview?.error ? (
                <div className="flex items-center gap-2 p-4 text-sm text-amber-600">
                  <AlertCircle className="w-4 h-4" />
                  {preview.error}
                </div>
              ) : preview?.files?.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No rules found in source folder
                </div>
              ) : (
                <div className="divide-y">
                  {preview?.files?.map((file) => (
                    <label
                      key={file.name}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/30",
                        selectedFiles.has(file.name) && "bg-primary/5"
                      )}
                    >
                      <Checkbox
                        checked={selectedFiles.has(file.name)}
                        onCheckedChange={() => toggleFile(file.name)}
                      />
                      <FileText className="w-4 h-4 text-purple-500" />
                      <span className="flex-1 text-sm">{file.name}</span>
                      {getStatusBadge(file.status)}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          {preview?.files && selectedFiles.size > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedFiles.size} file(s) selected for sync
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSync}
            disabled={syncing || loading || selectedFiles.size === 0}
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Sync {selectedFiles.size} File(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
