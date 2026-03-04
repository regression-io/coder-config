import React, { useState, useEffect } from 'react';
import { Check, Loader2, Terminal, Pencil, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';

const CATEGORY_ORDER = ['Built-in', 'Minimal', 'Git', 'Combo', 'System', 'Custom'];

function groupByCategory(presets) {
  const groups = {};
  for (const preset of presets) {
    if (!groups[preset.category]) groups[preset.category] = [];
    groups[preset.category].push(preset);
  }
  return groups;
}

export default function StatuslinesView() {
  const [presets, setPresets] = useState([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [activePresetId, setActivePresetId] = useState('default');
  const [customCommand, setCustomCommand] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [presetsData, currentData] = await Promise.all([
        api.getStatuslinePresets(),
        api.getCurrentStatusline(),
      ]);
      setPresets(presetsData.presets || []);
      setCurrentCommand(currentData.command || '');
      setActivePresetId(currentData.presetId || 'default');
      if (currentData.presetId === 'custom') {
        setCustomCommand(currentData.command || '');
      }
    } catch (e) {
      toast.error('Failed to load statuslines: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = async (preset) => {
    if (preset.command === null) {
      // Custom preset — just focus the text area
      setActivePresetId('custom');
      return;
    }
    setSaving(true);
    try {
      await api.setStatusline(preset.command);
      setCurrentCommand(preset.command);
      setActivePresetId(preset.id);
      toast.success(`Statusline set to "${preset.name}"`);
    } catch (e) {
      toast.error('Failed to apply statusline: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const applyCustom = async () => {
    setSaving(true);
    try {
      await api.setStatusline(customCommand);
      setCurrentCommand(customCommand);
      setActivePresetId('custom');
      toast.success('Custom statusline applied');
    } catch (e) {
      toast.error('Failed to apply statusline: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async () => {
    setSaving(true);
    try {
      await api.setStatusline('');
      setCurrentCommand('');
      setActivePresetId('default');
      toast.success('Statusline reset to Claude Code default');
    } catch (e) {
      toast.error('Failed to reset statusline: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const grouped = groupByCategory(presets);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-500" />
              Statusline
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Customize the Claude Code terminal statusline. Sets <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded text-xs">statusCommand</code> in <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded text-xs">~/.claude/settings.json</code>.
            </p>
          </div>
          {activePresetId !== 'default' && (
            <Button variant="outline" size="sm" onClick={resetToDefault} disabled={saving} className="gap-1">
              <RotateCcw className="w-3 h-3" />
              Reset
            </Button>
          )}
        </div>

        {/* Current command preview */}
        {currentCommand && (
          <div className="mt-4 p-3 bg-gray-950 dark:bg-black rounded-lg font-mono text-xs text-green-400 border border-gray-800">
            <span className="text-gray-500 select-none">$ </span>
            {currentCommand}
          </div>
        )}
      </div>

      {/* Preset sections */}
      {CATEGORY_ORDER.filter(cat => grouped[cat]).map(category => (
        <div key={category}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500 mb-3 px-1">
            {category}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {grouped[category].map(preset => {
              const isActive = activePresetId === preset.id;
              const isCustom = preset.id === 'custom';

              return (
                <div
                  key={preset.id}
                  onClick={() => !isCustom && applyPreset(preset)}
                  className={[
                    'rounded-xl border p-4 transition-all',
                    isCustom ? 'cursor-default' : 'cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500',
                    isActive
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 shadow-sm'
                      : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {preset.name}
                        </span>
                        {isActive && (
                          <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        {preset.description}
                      </p>
                    </div>
                    {isCustom && <Pencil className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />}
                  </div>

                  {/* Preview bar */}
                  {!isCustom && (
                    <div className="mt-3 px-2 py-1.5 bg-gray-950 dark:bg-black rounded font-mono text-[11px] text-gray-300 truncate border border-gray-800">
                      {preset.preview}
                    </div>
                  )}

                  {/* Custom input */}
                  {isCustom && (
                    <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
                      <Textarea
                        value={customCommand}
                        onChange={e => setCustomCommand(e.target.value)}
                        placeholder={'echo "$(git rev-parse --abbrev-ref HEAD)"'}
                        className="font-mono text-xs h-20 resize-none bg-gray-950 dark:bg-black text-green-400 border-gray-800 placeholder:text-gray-600"
                      />
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={applyCustom}
                        disabled={saving || !customCommand.trim()}
                      >
                        {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                        Apply Custom
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* CLI hint */}
      <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 border border-transparent dark:border-slate-800">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">How it works</h4>
        <p className="text-xs text-gray-600 dark:text-slate-400 mb-2">
          Claude Code runs your <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded">statusCommand</code> shell script on each turn and displays the output in the terminal statusline. The command should be fast (under 100ms) and print a single line.
        </p>
        <div className="space-y-1 text-xs font-mono text-gray-500 dark:text-slate-500">
          <p># Edit directly:</p>
          <p>~/.claude/settings.json → "statusCommand": "..."</p>
        </div>
      </div>
    </div>
  );
}
