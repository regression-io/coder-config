import React, { useState, useEffect } from 'react';
import { RefreshCcw, Play, Pause, XCircle, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
  running: { icon: Play, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
  paused: { icon: Pause, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  completed: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  cancelled: { icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
};

const PHASE_LABELS = {
  clarify: 'Clarifying',
  plan: 'Planning',
  execute: 'Executing',
};

export default function LoopWidget({ onNavigate }) {
  const [activeLoop, setActiveLoop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadActiveLoop();
    // Poll for updates every 10 seconds if there's an active loop
    const interval = setInterval(() => {
      if (activeLoop?.status === 'running') {
        loadActiveLoop();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [activeLoop?.status]);

  const loadActiveLoop = async () => {
    try {
      setLoading(true);
      const data = await api.getActiveLoop();
      setActiveLoop(data.loop);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (e) => {
    e.stopPropagation();
    try {
      await api.pauseLoop(activeLoop.id);
      loadActiveLoop();
    } catch (err) {
      console.error('Failed to pause loop:', err);
    }
  };

  const handleResume = async (e) => {
    e.stopPropagation();
    try {
      await api.resumeLoop(activeLoop.id);
      loadActiveLoop();
    } catch (err) {
      console.error('Failed to resume loop:', err);
    }
  };

  if (loading && !activeLoop) {
    return (
      <div className="border rounded-lg p-4 bg-card">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCcw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading loop status...</span>
        </div>
      </div>
    );
  }

  if (!activeLoop) {
    return (
      <div
        className="border rounded-lg p-4 bg-card cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => onNavigate?.('loops')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCcw className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">Ralph Loop</span>
          </div>
          <span className="text-xs text-muted-foreground">No active loop</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Create a loop to start autonomous development
        </p>
      </div>
    );
  }

  const StatusIcon = STATUS_CONFIG[activeLoop.status]?.icon || Clock;
  const statusColor = STATUS_CONFIG[activeLoop.status]?.color || 'text-gray-500';
  const statusBg = STATUS_CONFIG[activeLoop.status]?.bg || 'bg-gray-100';

  const progressPercent = Math.min(100, ((activeLoop.iterations?.current || 0) / (activeLoop.iterations?.max || 50)) * 100);
  const costPercent = Math.min(100, ((activeLoop.budget?.currentCost || 0) / (activeLoop.budget?.maxCost || 10)) * 100);

  return (
    <div
      className={`border rounded-lg p-4 ${statusBg} cursor-pointer hover:opacity-90 transition-opacity`}
      onClick={() => onNavigate?.('loops')}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <RefreshCcw className="w-5 h-5" />
          <span className="font-medium truncate">{activeLoop.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <StatusIcon className={`w-4 h-4 ${statusColor}`} />
          <span className={`text-xs font-medium ${statusColor}`}>
            {PHASE_LABELS[activeLoop.phase] || activeLoop.phase}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Iteration {activeLoop.iterations?.current || 0}</span>
            <span>/ {activeLoop.iterations?.max || 50}</span>
          </div>
          <div className="h-1.5 bg-background/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>${(activeLoop.budget?.currentCost || 0).toFixed(2)}</span>
            <span>/ ${(activeLoop.budget?.maxCost || 10).toFixed(2)}</span>
          </div>
          <div className="h-1.5 bg-background/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${costPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center justify-between mt-3" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs text-muted-foreground">
          {activeLoop.status === 'running' ? 'Running...' : activeLoop.status}
        </span>
        <div className="flex gap-1">
          {activeLoop.status === 'running' && (
            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={handlePause}>
              <Pause className="w-3 h-3 mr-1" />
              Pause
            </Button>
          )}
          {activeLoop.status === 'paused' && (
            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={handleResume}>
              <Play className="w-3 h-3 mr-1" />
              Resume
            </Button>
          )}
        </div>
      </div>

      {/* Pause reason */}
      {activeLoop.pauseReason && (
        <div className="mt-2 flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
          <AlertCircle className="w-3 h-3" />
          <span>Paused: {activeLoop.pauseReason.replace('_', ' ')}</span>
        </div>
      )}
    </div>
  );
}
