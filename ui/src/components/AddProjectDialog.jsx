import React, { useState, useEffect, useRef } from 'react';
import { FolderOpen, Loader2, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import PathPicker from './PathPicker';
import api from "@/lib/api";
import { toast } from "sonner";

// Preference key for localStorage
const CLAUDE_INIT_PREF_KEY = 'claude-config:claude-init-preference';

export default function AddProjectDialog({ open, onOpenChange, onAdded }) {
  const [projectPath, setProjectPath] = useState('');
  const [name, setName] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [runClaudeInit, setRunClaudeInit] = useState(true);
  const [initOutput, setInitOutput] = useState([]);
  const [initStatus, setInitStatus] = useState(null); // 'running' | 'success' | 'error' | null
  const outputRef = useRef(null);

  // Load preference from localStorage
  useEffect(() => {
    const pref = localStorage.getItem(CLAUDE_INIT_PREF_KEY);
    if (pref === 'never') {
      setRunClaudeInit(false);
    } else if (pref === 'always') {
      setRunClaudeInit(true);
    }
    // 'ask' or null means use default (true)
  }, []);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setProjectPath('');
      setName('');
      setInitOutput([]);
      setInitStatus(null);
      // Respect stored preference
      const pref = localStorage.getItem(CLAUDE_INIT_PREF_KEY);
      if (pref === 'never') {
        setRunClaudeInit(false);
      } else {
        setRunClaudeInit(true);
      }
    }
  }, [open]);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [initOutput]);

  // Auto-fill name from path
  useEffect(() => {
    if (projectPath && !name) {
      const folderName = projectPath.split('/').pop();
      setName(folderName || '');
    }
  }, [projectPath]);

  const handlePathSelect = (selectedPath) => {
    setProjectPath(selectedPath);
    setPickerOpen(false);
  };

  const handleAdd = async () => {
    if (!projectPath) {
      toast.error('Please select a project path');
      return;
    }

    setAdding(true);
    setInitOutput([]);
    setInitStatus(null);

    try {
      // If running claude init, stream the output first
      if (runClaudeInit) {
        setInitStatus('running');

        const initSuccess = await new Promise((resolve) => {
          const eventSource = new EventSource(`/api/projects/init-stream?path=${encodeURIComponent(projectPath)}`);

          eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'output') {
              setInitOutput(prev => [...prev, data.text]);
            } else if (data.type === 'status') {
              setInitOutput(prev => [...prev, data.message + '\n']);
            } else if (data.type === 'skip') {
              setInitOutput(prev => [...prev, data.message + '\n']);
            } else if (data.type === 'done') {
              eventSource.close();
              setInitStatus(data.success ? 'success' : 'error');
              resolve(data.success);
            } else if (data.type === 'error') {
              setInitOutput(prev => [...prev, `Error: ${data.message}\n`]);
              eventSource.close();
              setInitStatus('error');
              resolve(false);
            }
          };

          eventSource.onerror = () => {
            eventSource.close();
            setInitOutput(prev => [...prev, 'Connection error - is Claude Code installed?\n']);
            setInitStatus('error');
            resolve(false);
          };
        });

        // Small delay to show completion status
        await new Promise(r => setTimeout(r, 500));
      }

      // Now add the project (without running init again)
      const result = await api.addProject(projectPath, name || undefined, false);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Added project: ${result.project.name}`);
        onAdded?.(result.project);
        onOpenChange(false);
      }
    } catch (error) {
      toast.error('Failed to add project: ' + error.message);
    } finally {
      setAdding(false);
    }
  };

  const handleSetPreference = (pref) => {
    localStorage.setItem(CLAUDE_INIT_PREF_KEY, pref);
    if (pref === 'never') {
      setRunClaudeInit(false);
    } else if (pref === 'always') {
      setRunClaudeInit(true);
    }
    toast.success(`Preference saved: ${pref === 'always' ? 'Always' : pref === 'never' ? 'Never' : 'Ask each time'} run claude /init`);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-indigo-500" />
              Add Project
            </DialogTitle>
            <DialogDescription>
              Register a project folder to quickly switch between projects in the UI.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="path">Project Path</Label>
              <div className="flex gap-2">
                <Input
                  id="path"
                  value={projectPath}
                  onChange={(e) => setProjectPath(e.target.value)}
                  placeholder="/path/to/project"
                  className="font-mono text-sm flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPickerOpen(true)}
                  title="Browse"
                >
                  <FolderOpen className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Auto-filled from folder name"
              />
              <p className="text-xs text-gray-500">
                Optional. Leave empty to use folder name.
              </p>
            </div>

            {/* Claude /init option */}
            <div className="border-t pt-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="claudeInit"
                  checked={runClaudeInit}
                  onCheckedChange={setRunClaudeInit}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label htmlFor="claudeInit" className="flex items-center gap-2 cursor-pointer">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    Initialize with Claude Code
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Run <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">claude /init</code> to create CLAUDE.md
                  </p>
                </div>
              </div>

              {/* Preference buttons */}
              <div className="flex gap-2 mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => handleSetPreference('always')}
                >
                  Always
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => handleSetPreference('never')}
                >
                  Never
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => handleSetPreference('ask')}
                >
                  Ask each time
                </Button>
              </div>
            </div>
          </div>

          {/* Init output panel */}
          {initStatus && (
            <div className="border rounded-lg overflow-hidden bg-slate-950">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 border-b border-slate-800">
                {initStatus === 'running' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    <span className="text-sm text-slate-300">Running claude -p /init...</span>
                  </>
                ) : initStatus === 'success' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400">Initialized successfully</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400">Initialization failed</span>
                  </>
                )}
              </div>
              <div
                ref={outputRef}
                className="p-3 font-mono text-xs text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap"
              >
                {initOutput.map((line, i) => (
                  <span key={i}>{line}</span>
                ))}
                {initStatus === 'running' && (
                  <span className="animate-pulse">_</span>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={initStatus === 'running'}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={adding || !projectPath}>
              {adding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {initStatus === 'running' ? 'Initializing...' : 'Adding...'}
                </>
              ) : (
                'Add Project'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PathPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handlePathSelect}
        type="directory"
        initialPath="~"
        title="Select Project Folder"
      />
    </>
  );
}
