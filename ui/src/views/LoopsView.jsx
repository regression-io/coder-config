import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCcw, Plus, Trash2, Play, Pause, XCircle, Check,
  ChevronDown, ChevronRight, Loader2, Clock,
  AlertCircle, CheckCircle2, FileText, Settings, History,
  RotateCcw, Eye, Copy, Terminal as TerminalIcon, Layers, Filter, Download,
  Pencil, Sparkles, Wand2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import api from "@/lib/api";
import TerminalDialog from "@/components/TerminalDialog";

const PHASE_COLORS = {
  clarify: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  plan: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  execute: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const STATUS_ICONS = {
  pending: <Clock className="w-4 h-4 text-gray-500" />,
  running: <Play className="w-4 h-4 text-green-500" />,
  paused: <Pause className="w-4 h-4 text-yellow-500" />,
  completed: <CheckCircle2 className="w-4 h-4 text-green-600" />,
  failed: <XCircle className="w-4 h-4 text-red-500" />,
  cancelled: <XCircle className="w-4 h-4 text-gray-500" />,
};

export default function LoopsView({ activeProject = null }) {
  const [loops, setLoops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [config, setConfig] = useState({});

  // Workstreams state (fetched locally)
  const [workstreams, setWorkstreams] = useState([]);
  const [activeWorkstreamId, setActiveWorkstreamId] = useState(null);
  const [filterWorkstreamId, setFilterWorkstreamId] = useState(''); // For filtering loops

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedLoop, setSelectedLoop] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLoop, setEditingLoop] = useState(null);

  // Form states
  const [newTask, setNewTask] = useState('');
  const [newWorkstreamId, setNewWorkstreamId] = useState('');
  const [newMaxIterations, setNewMaxIterations] = useState(50);
  const [newCompletionPromise, setNewCompletionPromise] = useState('DONE');
  const [saving, setSaving] = useState(false);

  // Prompt tuning states
  const [tuningInProgress, setTuningInProgress] = useState(false);
  const [tunedPromptDialogOpen, setTunedPromptDialogOpen] = useState(false);
  const [tunedPrompt, setTunedPrompt] = useState('');
  const [originalPromptForTuning, setOriginalPromptForTuning] = useState('');
  const [promptWasTuned, setPromptWasTuned] = useState(false);
  const [tuneResumeDialogOpen, setTuneResumeDialogOpen] = useState(false);
  const [loopToResume, setLoopToResume] = useState(null);
  const [tuningContext, setTuningContext] = useState('create'); // 'create' or 'edit'

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editTask, setEditTask] = useState('');
  const [editMaxIterations, setEditMaxIterations] = useState(50);
  const [editCompletionPromise, setEditCompletionPromise] = useState('DONE');
  const [editWorkstreamId, setEditWorkstreamId] = useState('');

  // Config form states
  const [maxIterations, setMaxIterations] = useState(50);
  const [autoApprovePlan, setAutoApprovePlan] = useState(false);
  const [defaultCompletionPromise, setDefaultCompletionPromise] = useState('DONE');

  // History state
  const [history, setHistory] = useState([]);

  // Hook status
  const [hookStatus, setHookStatus] = useState({ stopHook: {}, prepromptHook: {} });
  const [installingHooks, setInstallingHooks] = useState(false);

  // Plugin status
  const [pluginStatus, setPluginStatus] = useState({ needsInstall: true });
  const [installPluginDialogOpen, setInstallPluginDialogOpen] = useState(false);
  const [pendingLoopId, setPendingLoopId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null); // 'start' or 'resume'
  const [installingPlugin, setInstallingPlugin] = useState(false);

  // Terminal state
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalLoop, setTerminalLoop] = useState(null);
  const [autoCloseWhenDone, setAutoCloseWhenDone] = useState(true);

  // Completion summary state
  const [completionSummary, setCompletionSummary] = useState(null);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);

  useEffect(() => {
    loadLoops();
    loadConfig();
    loadHookStatus();
    loadWorkstreams();
    loadPluginStatus();
  }, []);

  // Track the last known status to detect changes
  const lastKnownStatus = useRef(null);

  // Poll loop status while terminal is open to detect state changes
  useEffect(() => {
    if (!terminalOpen || !terminalLoop) {
      lastKnownStatus.current = null;
      return;
    }

    // Initialize with current status
    lastKnownStatus.current = terminalLoop.status;

    const pollInterval = setInterval(async () => {
      try {
        const data = await api.getLoop(terminalLoop.id);
        const loop = data.loop;

        // Detect any status change (not just to completed)
        const statusChanged = lastKnownStatus.current !== loop.status;
        const isTerminalState = ['completed', 'paused', 'failed', 'cancelled'].includes(loop.status);

        if (statusChanged && isTerminalState) {
          clearInterval(pollInterval);

          // Build summary for any terminal state
          const summary = {
            id: loop.id,  // Store ID for reliable lookups
            name: loop.name,
            task: loop.task?.original,
            status: loop.status,
            pauseReason: loop.pauseReason,
            iterations: loop.iterations?.current || 0,
            maxIterations: loop.iterations?.max || 50,
            phase: loop.phase,
            startedAt: loop.startedAt,
            completedAt: loop.completedAt || new Date().toISOString(),
            duration: loop.startedAt
              ? Math.round((Date.now() - new Date(loop.startedAt).getTime()) / 1000)
              : null,
          };
          setCompletionSummary(summary);

          // Show appropriate toast
          if (loop.status === 'completed') {
            toast.success('Loop completed successfully!');
          } else if (loop.status === 'paused') {
            toast.info(`Loop paused: ${loop.pauseReason || 'unknown reason'}`);
          } else if (loop.status === 'failed') {
            toast.error('Loop failed');
          } else if (loop.status === 'cancelled') {
            toast.warning('Loop cancelled');
          }

          loadLoops();

          // Auto-close terminal if enabled and completed
          if (autoCloseWhenDone && loop.status === 'completed') {
            setTimeout(() => {
              setTerminalOpen(false);
              setTerminalLoop(null);
              setSummaryDialogOpen(true);
            }, 1500);
          } else {
            // Always show summary dialog for any terminal state
            setSummaryDialogOpen(true);
          }
        }

        lastKnownStatus.current = loop.status;
      } catch (error) {
        console.error('Failed to poll loop status:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [terminalOpen, terminalLoop, autoCloseWhenDone]);

  const loadPluginStatus = async () => {
    try {
      const status = await api.getRalphLoopPluginStatus();
      setPluginStatus(status);
    } catch (error) {
      console.error('Failed to load plugin status:', error);
    }
  };

  const loadWorkstreams = async () => {
    try {
      const data = await api.getWorkstreams();
      setWorkstreams(data.workstreams || []);
      setActiveWorkstreamId(data.activeId || null);
    } catch (error) {
      console.error('Failed to load workstreams:', error);
    }
  };

  // Auto-select active workstream when create dialog opens
  useEffect(() => {
    if (createDialogOpen && activeWorkstreamId) {
      setNewWorkstreamId(activeWorkstreamId);
    }
  }, [createDialogOpen, activeWorkstreamId]);

  const loadLoops = async () => {
    try {
      setLoading(true);
      const data = await api.getLoops();
      setLoops(data.loops || []);
      setConfig(data.config || {});
    } catch (error) {
      toast.error('Failed to load loops');
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const data = await api.getLoopConfig();
      const cfg = data.config || {};
      setConfig(cfg);
      setMaxIterations(cfg.maxIterations || 50);
      setAutoApprovePlan(cfg.autoApprovePlan || false);
      setDefaultCompletionPromise(cfg.completionPromise || 'DONE');
      // Set form defaults from config
      setNewMaxIterations(cfg.maxIterations || 50);
      setNewCompletionPromise(cfg.completionPromise || 'DONE');
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const loadHookStatus = async () => {
    try {
      const status = await api.getLoopHookStatus();
      setHookStatus(status);
    } catch (error) {
      console.error('Failed to load hook status:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await api.getLoopHistory();
      setHistory(data.completed || []);
    } catch (error) {
      toast.error('Failed to load history');
    }
  };

  const handleCreate = async () => {
    if (!newTask.trim()) {
      toast.error('Task description is required');
      return;
    }

    await createLoopInternal(newTask);
  };

  // Tune prompt for create dialog
  const handleTuneNewPrompt = async () => {
    if (!newTask.trim()) {
      toast.error('Enter a task description first');
      return;
    }

    try {
      setTuningInProgress(true);
      setOriginalPromptForTuning(newTask);
      setTuningContext('create');

      const result = await api.tuneLoopPrompt(
        newTask,
        activeProject?.path || activeProject?.dir || null
      );

      if (result.success) {
        setTunedPrompt(result.tunedPrompt);
        setTunedPromptDialogOpen(true);
      } else {
        toast.error(result.error || 'Failed to tune prompt');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setTuningInProgress(false);
    }
  };

  // Accept tuned prompt - copy it back to the task field (create or edit)
  const handleAcceptTunedPrompt = () => {
    if (tuningContext === 'edit') {
      setEditTask(tunedPrompt);
    } else {
      setNewTask(tunedPrompt);
      setPromptWasTuned(true);
    }
    setTunedPromptDialogOpen(false);
    toast.success('Tuned prompt applied');
  };

  const handleRejectTunedPrompt = () => {
    setTunedPromptDialogOpen(false);
  };

  // Tune prompt for resuming a failed/paused/cancelled loop
  const handleResumeWithTuneOption = (loop) => {
    // For failed/paused/cancelled loops, offer tuning option
    if (loop.status === 'failed' || loop.status === 'paused' || loop.status === 'cancelled') {
      setLoopToResume(loop);
      setTuneResumeDialogOpen(true);
    } else {
      handleResume(loop.id);
    }
  };

  const handleTuneAndResume = async () => {
    if (!loopToResume) return;

    try {
      setTuningInProgress(true);
      const task = loopToResume.task?.original || '';

      // Fetch full loop details including clarifications and plan for context
      const loopDetails = await api.getLoop(loopToResume.id);
      const loop = loopDetails.loop || loopToResume;

      // Build context from loop history
      const loopContext = {
        status: loop.status,
        pauseReason: loop.pauseReason,
        iterations: loop.iterations?.current || 0,
        maxIterations: loop.iterations?.max || 50,
        phase: loop.phase,
        // Include clarifications and plan as context
        clarifications: loopDetails.clarifications || '',
        plan: loopDetails.plan || '',
        // Include iteration history summary
        iterationHistory: (loop.iterations?.history || [])
          .slice(-5) // Last 5 iterations
          .map(i => `Iteration ${i.n}: ${i.summary || 'no summary'}`)
          .join('\n')
      };

      // Build a pseudo-transcript from available data
      let transcript = '';
      if (loopContext.clarifications) {
        transcript += `=== Clarifications ===\n${loopContext.clarifications}\n\n`;
      }
      if (loopContext.plan) {
        transcript += `=== Plan ===\n${loopContext.plan}\n\n`;
      }
      if (loopContext.iterationHistory) {
        transcript += `=== Recent Iterations ===\n${loopContext.iterationHistory}\n`;
      }
      loopContext.transcript = transcript;

      const result = await api.tuneLoopPrompt(
        task,
        loopToResume.projectPath || activeProject?.path || activeProject?.dir || null,
        loopContext
      );

      if (result.success) {
        // Update the loop with tuned prompt
        await api.updateLoop(loopToResume.id, {
          task: { original: result.tunedPrompt }
        });
        toast.success('Prompt tuned and loop updated');
        setTuneResumeDialogOpen(false);
        await resumeLoopInternal(loopToResume.id);
        loadLoops();
      } else {
        toast.error(result.error || 'Failed to tune prompt');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setTuningInProgress(false);
      setLoopToResume(null);
    }
  };

  const handleResumeWithoutTuning = async () => {
    if (!loopToResume) return;
    setTuneResumeDialogOpen(false);
    await handleResume(loopToResume.id);
    setLoopToResume(null);
  };

  const createLoopInternal = async (task) => {
    try {
      setSaving(true);
      const result = await api.createLoop(task, {
        workstreamId: newWorkstreamId || null,
        projectPath: activeProject?.path || activeProject?.dir || null,
        maxIterations: parseInt(newMaxIterations, 10) || 50,
        completionPromise: newCompletionPromise || 'DONE',
      });

      if (result.success) {
        toast.success('Loop created');
        setCreateDialogOpen(false);
        setNewTask('');
        setNewWorkstreamId('');
        setNewMaxIterations(maxIterations);
        setNewCompletionPromise(defaultCompletionPromise);
        setPromptWasTuned(false);
        loadLoops();
      } else {
        toast.error(result.error || 'Failed to create loop');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async (loopId) => {
    // Check if plugin needs to be installed first
    if (pluginStatus.needsInstall) {
      setPendingLoopId(loopId);
      setPendingAction('start');
      setInstallPluginDialogOpen(true);
      return;
    }

    await startLoopInternal(loopId);
  };

  const startLoopInternal = async (loopId) => {
    try {
      const result = await api.startLoop(loopId);
      if (result.success && result.loop) {
        toast.success('Loop started - launching Claude Code');
        setTerminalLoop(result.loop);
        setTerminalOpen(true);
        loadLoops();
      } else {
        toast.error(result.error || 'Failed to start loop');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleInstallPlugin = async () => {
    try {
      setInstallingPlugin(true);
      const result = await api.installRalphLoopPlugin();
      if (result.success) {
        toast.success('ralph-loop plugin installed');
        setPluginStatus({ installed: true, scope: 'user', needsInstall: false });
        setInstallPluginDialogOpen(false);
        // Now execute the pending action
        if (pendingLoopId) {
          if (pendingAction === 'resume') {
            await resumeLoopInternal(pendingLoopId);
          } else {
            await startLoopInternal(pendingLoopId);
          }
          setPendingLoopId(null);
          setPendingAction(null);
        }
      } else {
        toast.error(result.error || 'Failed to install plugin');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setInstallingPlugin(false);
    }
  };

  const handleCancelInstall = () => {
    setInstallPluginDialogOpen(false);
    setPendingLoopId(null);
    setPendingAction(null);
  };

  const handleTerminalExit = useCallback(async (exitCode, signal) => {
    if (!terminalLoop) return;

    // Reload loop state to check status
    try {
      const data = await api.getLoop(terminalLoop.id);
      const loop = data.loop;

      // Check if already completed by hooks
      if (loop.taskComplete || loop.status === 'completed') {
        toast.success('Loop completed successfully!');
        setCompletionSummary({
          id: loop.id,
          name: loop.name,
          task: loop.task?.original,
          status: 'completed',
          iterations: loop.iterations?.current || 0,
          maxIterations: loop.iterations?.max || 50,
          phase: loop.phase,
          startedAt: loop.startedAt,
          completedAt: loop.completedAt || new Date().toISOString(),
        });
        setSummaryDialogOpen(true);
        setTerminalOpen(false);
        setTerminalLoop(null);
      } else if (loop.status === 'paused') {
        toast.info(`Loop paused: ${loop.pauseReason || 'user requested'}`);
        setCompletionSummary({
          id: loop.id,
          name: loop.name,
          task: loop.task?.original,
          status: 'paused',
          pauseReason: loop.pauseReason,
          iterations: loop.iterations?.current || 0,
          maxIterations: loop.iterations?.max || 50,
          phase: loop.phase,
          startedAt: loop.startedAt,
          completedAt: new Date().toISOString(),
        });
        setSummaryDialogOpen(true);
      } else if (exitCode === 0 && !signal) {
        // Clean exit with code 0 - ralph-loop plugin completed successfully
        // Mark loop as complete
        await api.completeLoop(loop.id);
        toast.success('Loop completed successfully!');
        setCompletionSummary({
          id: loop.id,
          name: loop.name,
          task: loop.task?.original,
          status: 'completed',
          iterations: loop.iterations?.current || 0,
          maxIterations: loop.iterations?.max || 50,
          phase: 'execute',
          startedAt: loop.startedAt,
          completedAt: new Date().toISOString(),
        });
        setSummaryDialogOpen(true);
        setTerminalOpen(false);
        setTerminalLoop(null);
      } else if (loop.iterations?.current >= loop.iterations?.max) {
        toast.warning('Loop reached max iterations');
        await api.pauseLoop(loop.id);
      } else {
        // Claude exited abnormally - show summary dialog
        const exitReason = signal ? `Signal: ${signal}` : `Exit code: ${exitCode}`;
        setCompletionSummary({
          id: loop.id,
          name: loop.name,
          task: loop.task?.original,
          status: 'paused',
          pauseReason: exitReason,
          iterations: loop.iterations?.current || 0,
          maxIterations: loop.iterations?.max || 50,
          phase: loop.phase,
          startedAt: loop.startedAt,
          completedAt: new Date().toISOString(),
        });
        setSummaryDialogOpen(true);
      }

      loadLoops();
    } catch (error) {
      console.error('Failed to check loop status:', error);
    }
  }, [terminalLoop]);

  const handlePause = async (loopId) => {
    try {
      const result = await api.pauseLoop(loopId);
      if (result.success) {
        toast.success('Loop paused');
        loadLoops();
      } else {
        toast.error(result.error || 'Failed to pause loop');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleResume = async (loopId) => {
    // Check if plugin needs to be installed first
    if (pluginStatus.needsInstall) {
      setPendingLoopId(loopId);
      setPendingAction('resume');
      setInstallPluginDialogOpen(true);
      return;
    }

    await resumeLoopInternal(loopId);
  };

  const resumeLoopInternal = async (loopId) => {
    try {
      const result = await api.resumeLoop(loopId);
      if (result.success && result.loop) {
        toast.success('Loop resumed - launching Claude Code');
        setTerminalLoop(result.loop);
        setTerminalOpen(true);
        loadLoops();
      } else {
        toast.error(result.error || 'Failed to resume loop');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleCancel = async (loopId) => {
    if (!confirm('Cancel this loop?')) return;
    try {
      const result = await api.cancelLoop(loopId);
      if (result.success) {
        toast.success('Loop cancelled');
        loadLoops();
      } else {
        toast.error(result.error || 'Failed to cancel loop');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (loopId) => {
    if (!confirm('Delete this loop and all its data?')) return;
    try {
      const result = await api.deleteLoop(loopId);
      if (result.success) {
        toast.success('Loop deleted');
        loadLoops();
      } else {
        toast.error(result.error || 'Failed to delete loop');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleEdit = (loop) => {
    setEditingLoop(loop);
    setEditName(loop.name || '');
    setEditTask(loop.task?.original || '');
    setEditMaxIterations(loop.iterations?.max || 50);
    setEditCompletionPromise(loop.completionPromise || 'DONE');
    setEditWorkstreamId(loop.workstreamId || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingLoop) return;

    try {
      setSaving(true);
      const updates = {
        name: editName,
        task: { original: editTask },
        iterations: { max: parseInt(editMaxIterations, 10) },
        completionPromise: editCompletionPromise,
        workstreamId: editWorkstreamId || null,
      };

      const result = await api.updateLoop(editingLoop.id, updates);
      if (result.success) {
        toast.success('Loop updated');
        setEditDialogOpen(false);
        setEditingLoop(null);
        loadLoops();
      } else {
        toast.error(result.error || 'Failed to update loop');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (loop) => {
    try {
      setSaving(true);
      const result = await api.createLoop(loop.task?.original || '', {
        name: `${loop.name} (copy)`,
        workstreamId: loop.workstreamId || null,
        projectPath: loop.projectPath || activeProject?.path || activeProject?.dir || null,
        maxIterations: loop.iterations?.max || 50,
        completionPromise: loop.completionPromise || 'DONE',
      });

      if (result.success) {
        toast.success('Loop copied');
        loadLoops();
      } else {
        toast.error(result.error || 'Failed to copy loop');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (loopId) => {
    try {
      const result = await api.approveLoop(loopId);
      if (result.success) {
        toast.success('Plan approved');
        loadLoops();
      } else {
        toast.error(result.error || 'Failed to approve plan');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      const result = await api.updateLoopConfig({
        maxIterations: parseInt(maxIterations, 10),
        autoApprovePlan,
        completionPromise: defaultCompletionPromise,
      });
      if (result.success) {
        toast.success('Configuration saved');
        setConfigDialogOpen(false);
        loadConfig();
      } else {
        toast.error(result.error || 'Failed to save configuration');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInstallHooks = async () => {
    try {
      setInstallingHooks(true);
      const result = await api.installLoopHooks();
      if (result.success) {
        toast.success('Hooks installed successfully');
        loadHookStatus();
      } else {
        toast.error(result.error || 'Failed to install hooks');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setInstallingHooks(false);
    }
  };

  const handleViewDetail = async (loop) => {
    try {
      const data = await api.getLoop(loop.id);
      setSelectedLoop({
        ...data.loop,
        clarifications: data.clarifications,
        plan: data.plan,
      });
      setDetailDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load loop details');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleString();
  };

  const getProgressPercent = (loop) => {
    if (!loop.iterations) return 0;
    return Math.min(100, (loop.iterations.current / loop.iterations.max) * 100);
  };

  const hooksInstalled = hookStatus.stopHook?.registered && hookStatus.prepromptHook?.registered;

  // Helper to get workstream name from ID
  const getWorkstreamName = (wsId) => {
    if (!wsId) return null;
    const ws = workstreams.find(w => w.id === wsId);
    return ws?.name || wsId;
  };

  // Filter loops by workstream
  const filteredLoops = filterWorkstreamId
    ? loops.filter(loop => loop.workstreamId === filterWorkstreamId)
    : loops;

  // Build the /ralph-loop command for the official plugin
  const buildRalphCommand = (loop) => {
    const task = loop.task?.original || '';
    const maxIter = loop.iterations?.max || 50;
    const completionPromise = loop.completionPromise || 'DONE';

    // Use $'...' syntax for proper handling of newlines and special characters
    // Escape backslashes, single quotes, and preserve newlines
    const escapedTask = task
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n');

    // Start Claude and immediately send /ralph-loop command
    // Using --dangerously-skip-permissions for unattended loop execution
    return `claude --dangerously-skip-permissions $'/ralph-loop ${escapedTask} --max-iterations ${maxIter} --completion-promise ${completionPromise}'`;
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RefreshCcw className="w-6 h-6" />
            Ralph Loops
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Autonomous development loops using the official ralph-loop plugin
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Workstream filter */}
          {workstreams.length > 0 && (
            <div className="flex items-center gap-1">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                className="text-sm border rounded px-2 py-1 bg-background"
                value={filterWorkstreamId}
                onChange={(e) => setFilterWorkstreamId(e.target.value)}
              >
                <option value="">All workstreams</option>
                {workstreams.map((ws) => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </select>
            </div>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => { loadHistory(); setHistoryDialogOpen(true); }}>
                  <History className="w-4 h-4 mr-1" />
                  History
                </Button>
              </TooltipTrigger>
              <TooltipContent>View completed loops</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setConfigDialogOpen(true)}>
                  <Settings className="w-4 h-4 mr-1" />
                  Config
                </Button>
              </TooltipTrigger>
              <TooltipContent>Configure loop defaults</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            New Loop
          </Button>
        </div>
      </div>

      {/* Hook Status Banner */}
      {!hooksInstalled && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">Hooks not installed</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Install the Ralph Loop hooks to enable automatic loop continuation
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleInstallHooks}
            disabled={installingHooks}
          >
            {installingHooks ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Install Hooks
          </Button>
        </div>
      )}

      {/* Loops List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredLoops.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <RefreshCcw className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">{filterWorkstreamId ? 'No loops in this workstream' : 'No loops yet'}</p>
          <p className="text-sm mt-1">Create a loop to start autonomous development</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLoops.map((loop) => (
            <div
              key={loop.id}
              className="border rounded-lg bg-card overflow-hidden"
            >
              {/* Loop Header */}
              <div
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedId(expandedId === loop.id ? null : loop.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expandedId === loop.id ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    {STATUS_ICONS[loop.status] || STATUS_ICONS.pending}
                    <div>
                      <h3 className="font-medium">{loop.name}</h3>
                      <p className="text-sm text-muted-foreground truncate max-w-md">
                        {loop.task?.original || 'No task'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Workstream badge */}
                    {loop.workstreamId && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {getWorkstreamName(loop.workstreamId)}
                      </span>
                    )}
                    {/* Phase badge */}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${PHASE_COLORS[loop.phase] || 'bg-gray-100 dark:bg-gray-800'}`}>
                      {loop.phase}
                    </span>
                    {/* Iteration counter */}
                    <span className="text-sm text-muted-foreground">
                      {loop.iterations?.current || 0}/{loop.iterations?.max || 50}
                    </span>
                    {/* Actions */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {loop.status === 'pending' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleStart(loop.id)}>
                                <Play className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Start loop</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {loop.status === 'running' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handlePause(loop.id)}>
                                <Pause className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Pause loop</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {loop.status === 'paused' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleResumeWithTuneOption(loop)}>
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Resume loop</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {(loop.status === 'cancelled' || loop.status === 'failed') && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleResumeWithTuneOption(loop)}>
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Restart loop</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {loop.phase === 'plan' && loop.status === 'running' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleApprove(loop.id)}>
                                <Check className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Approve plan</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(loop)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit loop</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => handleCopy(loop)}>
                              <Copy className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Duplicate loop</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => handleViewDetail(loop)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View details</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {(loop.status === 'running' || loop.status === 'paused') && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleCancel(loop.id)}>
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Cancel loop</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(loop.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete loop</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Iterations</span>
                    <span>{loop.iterations?.current || 0} / {loop.iterations?.max || 50}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${getProgressPercent(loop)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded content */}
              {expandedId === loop.id && (
                <div className="border-t p-4 bg-muted/30 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">ID:</span>
                      <span className="ml-2 font-mono">{loop.id}</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1" onClick={() => copyToClipboard(loop.id)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <span className="ml-2">{loop.status}{loop.pauseReason ? ` (${loop.pauseReason})` : ''}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <span className="ml-2">{formatDate(loop.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Updated:</span>
                      <span className="ml-2">{formatDate(loop.updatedAt)}</span>
                    </div>
                    {loop.workstreamId && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Workstream:</span>
                        <span className="ml-2 inline-flex items-center gap-1">
                          <Layers className="w-3 h-3 text-purple-500" />
                          {getWorkstreamName(loop.workstreamId)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Run instructions */}
                  <div className="bg-muted p-3 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <TerminalIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">Run this loop (uses official ralph-loop plugin):</span>
                    </div>
                    <code className="text-xs bg-background p-2 rounded block whitespace-pre-wrap">
                      {buildRalphCommand(loop)}
                    </code>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Loop</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Task Description</label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTuneNewPrompt}
                        disabled={tuningInProgress || !newTask.trim()}
                        className="h-7 text-xs"
                      >
                        {tuningInProgress ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <Wand2 className="w-3 h-3 mr-1" />
                        )}
                        Tune with AI
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Use Claude to optimize your prompt for Ralph Loop execution - adds clear completion signals, verification steps, and acceptance criteria.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Textarea
                placeholder="Describe what you want Claude to accomplish..."
                value={newTask}
                onChange={(e) => { setNewTask(e.target.value); setPromptWasTuned(false); }}
                rows={4}
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  Be specific about the goal. The loop will continue until this task is completed.
                </p>
                {promptWasTuned && (
                  <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI-tuned
                  </span>
                )}
              </div>
            </div>
            {/* Project context */}
            <div>
              <label className="text-sm font-medium mb-1 block">Project</label>
              <div className="text-sm p-2 bg-muted rounded-md">
                {activeProject ? (
                  <span className="font-mono">{activeProject.name || activeProject.path || activeProject.dir}</span>
                ) : (
                  <span className="text-muted-foreground">No project selected - loop will run in server directory</span>
                )}
              </div>
            </div>
            {/* Max iterations and completion promise */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Max Iterations</label>
                <Input
                  type="number"
                  value={newMaxIterations}
                  onChange={(e) => setNewMaxIterations(e.target.value)}
                  min={1}
                  max={1000}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Safety limit for the loop
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Completion Promise</label>
                <Input
                  value={newCompletionPromise}
                  onChange={(e) => setNewCompletionPromise(e.target.value)}
                  placeholder="DONE"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Text that signals completion
                </p>
              </div>
            </div>
            {workstreams.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1 block">Workstream (optional)</label>
                <select
                  className="w-full border rounded-md p-2 bg-background"
                  value={newWorkstreamId}
                  onChange={(e) => setNewWorkstreamId(e.target.value)}
                >
                  <option value="">No workstream</option>
                  {workstreams.map((ws) => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving || !newTask.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Create Loop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Loop</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Name</label>
              <Input
                placeholder="Loop name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Task Description</label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!editTask.trim()) {
                            toast.error('Enter a task description first');
                            return;
                          }
                          try {
                            setTuningInProgress(true);
                            setOriginalPromptForTuning(editTask);
                            setTuningContext('edit');
                            const result = await api.tuneLoopPrompt(
                              editTask,
                              editingLoop?.projectPath || activeProject?.path || activeProject?.dir || null
                            );
                            if (result.success) {
                              setTunedPrompt(result.tunedPrompt);
                              setTunedPromptDialogOpen(true);
                            } else {
                              toast.error(result.error || 'Failed to tune prompt');
                            }
                          } catch (error) {
                            toast.error(error.message);
                          } finally {
                            setTuningInProgress(false);
                          }
                        }}
                        disabled={tuningInProgress || !editTask.trim()}
                        className="h-7 text-xs"
                      >
                        {tuningInProgress ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <Wand2 className="w-3 h-3 mr-1" />
                        )}
                        Tune with AI
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Use Claude to optimize your prompt for Ralph Loop execution.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Textarea
                placeholder="Describe what you want Claude to accomplish..."
                value={editTask}
                onChange={(e) => setEditTask(e.target.value)}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Max Iterations</label>
                <Input
                  type="number"
                  value={editMaxIterations}
                  onChange={(e) => setEditMaxIterations(e.target.value)}
                  min={1}
                  max={1000}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Completion Promise</label>
                <Input
                  value={editCompletionPromise}
                  onChange={(e) => setEditCompletionPromise(e.target.value)}
                  placeholder="DONE"
                />
              </div>
            </div>
            {workstreams.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1 block">Workstream</label>
                <select
                  className="w-full border rounded-md p-2 bg-background"
                  value={editWorkstreamId}
                  onChange={(e) => setEditWorkstreamId(e.target.value)}
                >
                  <option value="">No workstream</option>
                  {workstreams.map((ws) => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </div>
            )}
            {editingLoop && (
              <div className="text-xs text-muted-foreground">
                <span>ID: {editingLoop.id}</span>
                <span className="mx-2">|</span>
                <span>Status: {editingLoop.status}</span>
                <span className="mx-2">|</span>
                <span>Phase: {editingLoop.phase}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editTask.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Loop Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Max Iterations</label>
              <Input
                type="number"
                value={maxIterations}
                onChange={(e) => setMaxIterations(e.target.value)}
                min={1}
                max={1000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Loop will pause after this many iterations
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Default Completion Promise</label>
              <Input
                value={defaultCompletionPromise}
                onChange={(e) => setDefaultCompletionPromise(e.target.value)}
                placeholder="DONE"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Default text that signals loop completion (used with official ralph-loop plugin)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoApprovePlan"
                checked={autoApprovePlan}
                onChange={(e) => setAutoApprovePlan(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="autoApprovePlan" className="text-sm">
                Auto-approve plans (skip manual plan approval)
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfig} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loop History</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {history.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No completed loops yet</p>
            ) : (
              history.slice().reverse().map((entry) => (
                <div key={entry.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {STATUS_ICONS[entry.status] || STATUS_ICONS.completed}
                      <span className="font-medium">{entry.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(entry.completedAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">{entry.task}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <span>Iterations: {entry.totalIterations}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedLoop?.name || 'Loop Details'}</DialogTitle>
          </DialogHeader>
          {selectedLoop && (
            <div className="space-y-4 py-4">
              {/* Status info */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="border rounded p-3">
                  <div className="text-muted-foreground text-xs mb-1">Phase</div>
                  <span className={`text-sm px-2 py-0.5 rounded-full ${PHASE_COLORS[selectedLoop.phase] || ''}`}>
                    {selectedLoop.phase}
                  </span>
                </div>
                <div className="border rounded p-3">
                  <div className="text-muted-foreground text-xs mb-1">Status</div>
                  <div className="flex items-center gap-1">
                    {STATUS_ICONS[selectedLoop.status]}
                    <span>{selectedLoop.status}</span>
                  </div>
                </div>
                <div className="border rounded p-3">
                  <div className="text-muted-foreground text-xs mb-1">Progress</div>
                  <span>{selectedLoop.iterations?.current || 0} / {selectedLoop.iterations?.max || 50}</span>
                </div>
              </div>

              {/* Task */}
              <div>
                <h4 className="text-sm font-medium mb-2">Task</h4>
                <div className="bg-muted p-3 rounded text-sm">
                  {selectedLoop.task?.original}
                </div>
              </div>

              {/* Clarifications */}
              {selectedLoop.clarifications && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Clarifications</h4>
                  <div className="bg-muted p-3 rounded text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {selectedLoop.clarifications}
                  </div>
                </div>
              )}

              {/* Plan */}
              {selectedLoop.plan && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Plan</h4>
                  <div className="bg-muted p-3 rounded text-sm whitespace-pre-wrap max-h-60 overflow-y-auto font-mono">
                    {selectedLoop.plan}
                  </div>
                </div>
              )}

              {/* Completion info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Max Iterations</h4>
                  <div className="bg-muted p-2 rounded text-sm">
                    {selectedLoop.iterations?.max || 50}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Completion Promise</h4>
                  <div className="bg-muted p-2 rounded text-sm font-mono">
                    &lt;promise&gt;{selectedLoop.completionPromise || 'DONE'}&lt;/promise&gt;
                  </div>
                </div>
              </div>

              {/* Run command */}
              <div>
                <h4 className="text-sm font-medium mb-2">Run Command (uses official ralph-loop plugin)</h4>
                <code className="text-xs bg-muted p-3 rounded block whitespace-pre-wrap">
                  {buildRalphCommand(selectedLoop)}
                </code>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Install Plugin Dialog */}
      <Dialog open={installPluginDialogOpen} onOpenChange={setInstallPluginDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Install ralph-loop Plugin
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              The <code className="bg-muted px-1 rounded">ralph-loop</code> plugin is required to run loops.
              This plugin provides the <code className="bg-muted px-1 rounded">/ralph-loop</code> command that enables
              autonomous iteration.
            </p>
            {pluginStatus.scope === 'project' && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3 mb-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Plugin is currently installed only for project: <br />
                  <code className="text-xs">{pluginStatus.projectPath}</code>
                </p>
              </div>
            )}
            <p className="text-sm">
              Install the plugin globally (user scope) to use loops from any project?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelInstall} disabled={installingPlugin}>
              Cancel
            </Button>
            <Button onClick={handleInstallPlugin} disabled={installingPlugin}>
              {installingPlugin ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Installing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-1" />
                  Install Plugin
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loop Terminal Dialog */}
      <TerminalDialog
        open={terminalOpen}
        onOpenChange={(open) => {
          setTerminalOpen(open);
          if (!open) {
            setTerminalLoop(null);
            loadLoops();
          }
        }}
        title={terminalLoop ? `Loop: ${terminalLoop.name}` : 'Running Loop'}
        description={terminalLoop?.task?.original}
        cwd={terminalLoop?.projectPath}
        initialCommand={terminalLoop ? buildRalphCommand(terminalLoop) : ''}
        env={terminalLoop ? {
          CODER_LOOP_ID: terminalLoop.id,
          ...(terminalLoop.workstreamId && { CODER_WORKSTREAM: terminalLoop.workstreamId })
        } : {}}
        onExit={handleTerminalExit}
        headerExtra={
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoCloseWhenDone}
              onChange={(e) => setAutoCloseWhenDone(e.target.checked)}
              className="rounded"
            />
            Auto-close when done
          </label>
        }
      />

      {/* Tuned Prompt Preview Dialog */}
      <Dialog open={tunedPromptDialogOpen} onOpenChange={setTunedPromptDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-500" />
              AI-Tuned Prompt
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">Original Prompt</h4>
              <div className="bg-muted p-3 rounded text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
                {originalPromptForTuning}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                Tuned Prompt
              </h4>
              <Textarea
                value={tunedPrompt}
                onChange={(e) => setTunedPrompt(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                You can edit the tuned prompt before accepting it.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleRejectTunedPrompt}>
              Keep Original
            </Button>
            <Button onClick={handleAcceptTunedPrompt}>
              <Check className="w-4 h-4 mr-1" />
              Use Tuned Prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resume with Tune Option Dialog */}
      <Dialog open={tuneResumeDialogOpen} onOpenChange={setTuneResumeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Resume Loop
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {loopToResume && (
              <>
                <p className="text-sm mb-4">
                  This loop {loopToResume.status === 'failed' ? 'failed' : loopToResume.status === 'cancelled' ? 'was cancelled' : 'was paused'}
                  {loopToResume.pauseReason && `: ${loopToResume.pauseReason}`}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Would you like to tune the prompt with AI before resuming? This can help add guardrails based on what went wrong.
                </p>
                <div className="bg-muted p-3 rounded text-sm max-h-32 overflow-y-auto">
                  {loopToResume.task?.original}
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { setTuneResumeDialogOpen(false); setLoopToResume(null); }}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleResumeWithoutTuning}>
              Resume As-Is
            </Button>
            <Button onClick={handleTuneAndResume} disabled={tuningInProgress}>
              {tuningInProgress ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Wand2 className="w-4 h-4 mr-1" />
              )}
              Tune & Resume
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loop Summary Dialog */}
      <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {completionSummary?.status === 'completed' && (
                <><CheckCircle2 className="w-5 h-5 text-green-600" /> Loop Completed</>
              )}
              {completionSummary?.status === 'paused' && (
                <><Pause className="w-5 h-5 text-yellow-500" /> Loop Paused</>
              )}
              {completionSummary?.status === 'failed' && (
                <><XCircle className="w-5 h-5 text-red-500" /> Loop Failed</>
              )}
              {completionSummary?.status === 'cancelled' && (
                <><XCircle className="w-5 h-5 text-gray-500" /> Loop Cancelled</>
              )}
            </DialogTitle>
          </DialogHeader>
          {completionSummary && (
            <div className="space-y-4 py-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Task</h4>
                <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                  {completionSummary.task}
                </p>
              </div>

              {completionSummary.pauseReason && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Reason</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                    {completionSummary.pauseReason}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="border rounded p-3">
                  <div className="text-muted-foreground text-xs mb-1">Status</div>
                  <div className="font-medium flex items-center gap-1">
                    {STATUS_ICONS[completionSummary.status]}
                    <span className="capitalize">{completionSummary.status}</span>
                  </div>
                </div>
                <div className="border rounded p-3">
                  <div className="text-muted-foreground text-xs mb-1">Iterations</div>
                  <div className="font-medium">
                    {completionSummary.iterations} / {completionSummary.maxIterations}
                  </div>
                </div>
                <div className="border rounded p-3">
                  <div className="text-muted-foreground text-xs mb-1">Duration</div>
                  <div className="font-medium">
                    {completionSummary.duration != null
                      ? completionSummary.duration < 60
                        ? `${completionSummary.duration}s`
                        : completionSummary.duration < 3600
                          ? `${Math.floor(completionSummary.duration / 60)}m ${completionSummary.duration % 60}s`
                          : `${Math.floor(completionSummary.duration / 3600)}h ${Math.floor((completionSummary.duration % 3600) / 60)}m`
                      : '-'}
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                {completionSummary.status === 'completed' ? 'Completed' : 'Stopped'} at {formatDate(completionSummary.completedAt)}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSummaryDialogOpen(false)}>
              Close
            </Button>
            {(completionSummary?.status === 'paused' || completionSummary?.status === 'failed' || completionSummary?.status === 'cancelled') && (
              <Button onClick={() => {
                setSummaryDialogOpen(false);
                if (completionSummary?.id) {
                  const loop = loops.find(l => l.id === completionSummary.id);
                  if (loop) handleResumeWithTuneOption(loop);
                }
              }}>
                <RotateCcw className="w-4 h-4 mr-1" />
                {completionSummary?.status === 'paused' ? 'Resume' : 'Restart'}
              </Button>
            )}
            <Button variant="secondary" onClick={() => {
              setSummaryDialogOpen(false);
              if (completionSummary?.id) {
                const loop = loops.find(l => l.id === completionSummary.id);
                if (loop) handleViewDetail(loop);
              }
            }}>
              View Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
