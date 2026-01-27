import React, { useState, useEffect } from 'react';
import {
  Save, Clock, Check, AlertCircle, Loader2, Trash2, Download, FileText, RefreshCw
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api";

export default function SessionsView() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [contextDialogOpen, setContextDialogOpen] = useState(false);
  const [fullContext, setFullContext] = useState(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = await api.getSessionStatus();
      setStatus(data);
    } catch (error) {
      toast.error('Failed to load session status');
    } finally {
      setLoading(false);
    }
  };

  const handleInstallAll = async () => {
    setInstalling(true);
    try {
      const result = await api.installSessionAll();
      if (result.success) {
        toast.success('Session persistence installed!');
        loadStatus();
      } else {
        toast.error(result.hooks?.error || result.command?.error || 'Installation failed');
      }
    } catch (error) {
      toast.error('Installation failed');
    } finally {
      setInstalling(false);
    }
  };

  const handleInstallHooks = async () => {
    setInstalling(true);
    try {
      const result = await api.installSessionHooks();
      if (result.success) {
        toast.success('Session hooks installed!');
        loadStatus();
      } else {
        toast.error(result.error || 'Failed to install hooks');
      }
    } catch (error) {
      toast.error('Failed to install hooks');
    } finally {
      setInstalling(false);
    }
  };

  const handleInstallCommand = async () => {
    setInstalling(true);
    try {
      const result = await api.installFlushCommand();
      if (result.success) {
        toast.success(result.alreadyInstalled ? '/flush command already installed' : '/flush command installed!');
        loadStatus();
      } else {
        toast.error(result.error || 'Failed to install command');
      }
    } catch (error) {
      toast.error('Failed to install command');
    } finally {
      setInstalling(false);
    }
  };

  const handleClearContext = async () => {
    setClearing(true);
    try {
      const result = await api.clearSessionContext();
      if (result.success) {
        toast.success(result.cleared ? 'Session context cleared' : 'No context to clear');
        loadStatus();
      } else {
        toast.error('Failed to clear context');
      }
    } catch (error) {
      toast.error('Failed to clear context');
    } finally {
      setClearing(false);
    }
  };

  const handleViewContext = async () => {
    try {
      const data = await api.getSessionContext();
      setFullContext(data.content);
      setContextDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load context');
    }
  };

  const formatAge = (minutes) => {
    if (minutes === null) return 'Unknown';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hours ago`;
    return `${Math.floor(minutes / 1440)} days ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const allInstalled = status?.hooksInstalled && status?.flushCommandInstalled;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950">
              <Save className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Session Persistence</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">Save and restore Claude Code session context</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={loadStatus}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-sm text-gray-600 dark:text-slate-400">
          Session persistence allows you to save your current Claude Code context using the <code className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400">/flush</code> command,
          and automatically restore it when you start a new session.
        </p>
      </div>

      {/* Installation Status */}
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="font-medium text-gray-900 dark:text-white">Installation Status</h3>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-slate-800">
          {/* Session Hooks */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status?.hooksInstalled ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              )}
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Session Hooks</div>
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  Auto-restore context on session start, preserve on session end
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={status?.hooksInstalled ? 'default' : 'secondary'}>
                {status?.hooksInstalled ? 'Installed' : 'Not Installed'}
              </Badge>
              {!status?.hooksInstalled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInstallHooks}
                  disabled={installing}
                >
                  {installing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Install'}
                </Button>
              )}
            </div>
          </div>

          {/* Flush Command */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status?.flushCommandInstalled ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              )}
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">/flush Command</div>
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  Adds the /flush command to save session context
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={status?.flushCommandInstalled ? 'default' : 'secondary'}>
                {status?.flushCommandInstalled ? 'Installed' : 'Not Installed'}
              </Badge>
              {!status?.flushCommandInstalled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInstallCommand}
                  disabled={installing}
                >
                  {installing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Install'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {!allInstalled && (
          <div className="p-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
            <Button
              onClick={handleInstallAll}
              disabled={installing}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {installing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Install All
            </Button>
          </div>
        )}
      </div>

      {/* Saved Context */}
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-medium text-gray-900 dark:text-white">Saved Context</h3>
          {status?.hasSavedContext && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleViewContext}>
                <FileText className="w-4 h-4 mr-2" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearContext}
                disabled={clearing}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              >
                {clearing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="p-4">
          {status?.hasSavedContext ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-slate-400">Last saved:</span>
                <span className="text-gray-900 dark:text-white">{formatAge(status.contextAge)}</span>
              </div>

              {status.contextPreview && (
                <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3">
                  <pre className="text-xs text-gray-600 dark:text-slate-400 whitespace-pre-wrap overflow-hidden">
                    {status.contextPreview}
                  </pre>
                </div>
              )}

              <div className="text-xs text-gray-500 dark:text-slate-500">
                Storage: {status.sessionDir}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Save className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-gray-600 dark:text-slate-400">No saved context</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                Use <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded">/flush</code> in Claude Code to save your session
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Last Session Info */}
      {status?.lastSession && (
        <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <h3 className="font-medium text-gray-900 dark:text-white">Last Session</h3>
          </div>

          <div className="p-4 space-y-2">
            {status.lastSession.session_id && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 dark:text-slate-400 w-20">ID:</span>
                <code className="text-xs bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {status.lastSession.session_id}
                </code>
              </div>
            )}
            {status.lastSession.cwd && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 dark:text-slate-400 w-20">Directory:</span>
                <span className="text-gray-900 dark:text-white font-mono text-xs">{status.lastSession.cwd}</span>
              </div>
            )}
            {status.lastSession.timestamp && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 dark:text-slate-400 w-20">Ended:</span>
                <span className="text-gray-900 dark:text-white">{status.lastSession.timestamp}</span>
              </div>
            )}
            {status.lastSession.reason && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 dark:text-slate-400 w-20">Reason:</span>
                <Badge variant="secondary">{status.lastSession.reason}</Badge>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Usage Info */}
      <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 border border-transparent dark:border-slate-800">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">How to Use</h4>
        <ol className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
          <li className="flex gap-2">
            <span className="font-medium text-indigo-600 dark:text-indigo-400">1.</span>
            Install session hooks and the /flush command above
          </li>
          <li className="flex gap-2">
            <span className="font-medium text-indigo-600 dark:text-indigo-400">2.</span>
            Use <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded">/flush</code> in Claude Code before ending a session
          </li>
          <li className="flex gap-2">
            <span className="font-medium text-indigo-600 dark:text-indigo-400">3.</span>
            Your context is automatically restored when you start a new session
          </li>
        </ol>
      </div>

      {/* CLI Commands */}
      <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 border border-transparent dark:border-slate-800">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">CLI Commands</h4>
        <div className="space-y-1 text-sm text-gray-600 dark:text-slate-400 font-mono">
          <p>coder-config session                # Show session status</p>
          <p>coder-config session install-hooks  # Install session hooks</p>
          <p>coder-config session clear          # Clear saved context</p>
        </div>
      </div>

      {/* Context Dialog */}
      <Dialog open={contextDialogOpen} onOpenChange={setContextDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Saved Context</DialogTitle>
            <DialogDescription>
              This context will be restored on your next Claude Code session
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-4">
            <pre className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap bg-gray-50 dark:bg-slate-900 p-4 rounded-lg">
              {fullContext || 'No content'}
            </pre>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setContextDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
