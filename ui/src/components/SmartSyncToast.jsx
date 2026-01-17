import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, Check, ArrowRight, FolderPlus,
  Zap, Clock, Settings2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";

/**
 * SmartSyncToast - Shows non-blocking nudges for workstream switching
 *
 * Bulletproof principles:
 * - Never blocks the user
 * - All nudges are dismissible
 * - Learns from choices to reduce future prompts
 * - Fails silently
 */
export default function SmartSyncToast({
  enabled = true,
  pollInterval = 30000, // 30 seconds
  onWorkstreamChange
}) {
  const [nudge, setNudge] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentProjects, setRecentProjects] = useState([]);

  // Check for nudges periodically
  const checkForNudges = useCallback(async () => {
    if (!enabled) return;

    try {
      // Get recent projects from activity
      const status = await api.getSmartSyncStatus();
      if (!status.enabled || !status.recentProjects?.length) return;

      setRecentProjects(status.recentProjects);

      // Check if there's a nudge to show
      const result = await api.smartSyncCheckNudge(status.recentProjects);

      if (result && result.type) {
        // Auto-switch if confidence is high enough
        if (result.autoSwitch && result.type === 'switch') {
          // Silently switch
          await api.setActiveWorkstream(result.workstream.id);
          onWorkstreamChange?.(result.workstream);
          toast.success(`Auto-switched to "${result.workstream.name}"`, {
            description: `${result.confidence}% activity match`,
            duration: 3000
          });
          return;
        }

        setNudge(result);
      }
    } catch (error) {
      // Fail silently - don't bother the user
      console.debug('Smart sync check failed:', error.message);
    }
  }, [enabled, onWorkstreamChange]);

  // Poll for nudges
  useEffect(() => {
    if (!enabled) return;

    // Initial check after a short delay
    const initialTimeout = setTimeout(checkForNudges, 5000);

    // Periodic checks
    const interval = setInterval(checkForNudges, pollInterval);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [enabled, pollInterval, checkForNudges]);

  // Handle action
  const handleAction = async (action) => {
    if (!nudge) return;

    setLoading(true);
    try {
      const context = {
        workstreamId: nudge.workstream?.id,
        projectPath: nudge.projectPath,
        projects: recentProjects
      };

      await api.smartSyncHandleAction(nudge.key, action, context);

      // Show feedback
      switch (action) {
        case 'switch':
          toast.success(`Switched to "${nudge.workstream.name}"`);
          onWorkstreamChange?.(nudge.workstream);
          break;
        case 'add':
          toast.success(`Added project to "${nudge.workstream.name}"`);
          break;
        case 'always':
          toast.success(`Will always use "${nudge.workstream.name}" for these projects`);
          onWorkstreamChange?.(nudge.workstream);
          break;
        case 'never':
          toast.info('Got it, won\'t suggest this again');
          break;
        case 'dismiss':
          // Silent dismiss
          break;
      }

      setNudge(null);
    } catch (error) {
      toast.error('Failed to process action');
    } finally {
      setLoading(false);
    }
  };

  // Dismiss nudge
  const dismiss = () => {
    handleAction('dismiss');
  };

  if (!nudge) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 max-w-sm"
      >
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-purple-200 dark:border-purple-800 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Smart Sync</span>
              {nudge.confidence && (
                <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">
                  {nudge.confidence}% match
                </span>
              )}
            </div>
            <button
              onClick={dismiss}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                nudge.type === 'switch'
                  ? 'bg-purple-100 dark:bg-purple-900/50'
                  : 'bg-blue-100 dark:bg-blue-900/50'
              }`}>
                {nudge.type === 'switch' ? (
                  <ArrowRight className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                ) : (
                  <FolderPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-900 dark:text-white font-medium">
                  {nudge.message}
                </p>
                {nudge.workstream && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    {nudge.workstream.projects?.length || 0} projects in workstream
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {nudge.type === 'switch' ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleAction('switch')}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 flex-1"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Yes
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction('dismiss')}
                    disabled={loading}
                    className="flex-1"
                  >
                    No
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAction('always')}
                    disabled={loading}
                    title="Always switch to this workstream for these projects"
                    className="text-purple-600 dark:text-purple-400"
                  >
                    <Zap className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleAction('add')}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 flex-1"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction('dismiss')}
                    disabled={loading}
                    className="flex-1"
                  >
                    No
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAction('never')}
                    disabled={loading}
                    title="Never suggest adding this project"
                    className="text-gray-500"
                  >
                    <Clock className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
