import React, { useState, useEffect } from 'react';
import { Check, Loader2, Terminal, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '@/lib/api';

const CATEGORY_ORDER = ['Built-in', 'Simple', 'Git', 'Cost', 'Custom'];

function groupByCategory(presets) {
  const groups = {};
  for (const preset of presets) {
    if (!groups[preset.category]) groups[preset.category] = [];
    groups[preset.category].push(preset);
  }
  return groups;
}

const DEFAULT_CUSTOM_SCRIPT = `#!/bin/bash
# Claude Code passes JSON session data to this script via stdin.
# Available fields: model.display_name, context_window.used_percentage,
#   cost.total_cost_usd, cost.total_lines_added, cost.total_lines_removed,
#   cost.total_duration_ms, workspace.current_dir
# Requires: jq
input=$(cat)
MODEL=$(echo "$input" | jq -r '.model.display_name // "?"')
PCT=$(echo "$input" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
echo "* $MODEL  ${PCT}% ctx"
`;

export default function StatuslinesView() {
  const [presets, setPresets] = useState([]);
  const [activePresetId, setActivePresetId] = useState('disabled');
  const [customScript, setCustomScript] = useState(DEFAULT_CUSTOM_SCRIPT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [presetsData, currentData] = await Promise.all([
        api.getStatuslinePresets(),
        api.getCurrentStatusline(),
      ]);
      setPresets(presetsData.presets || []);
      setActivePresetId(currentData.presetId || 'disabled');
      if (currentData.presetId === 'custom' && currentData.scriptContent) {
        setCustomScript(currentData.scriptContent);
      }
    } catch (e) {
      toast.error('Failed to load statuslines: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = async (preset) => {
    if (preset.id === 'custom') return; // handled by applyCustom
    setSaving(true);
    try {
      await api.setStatusline(preset.id);
      setActivePresetId(preset.id);
      toast.success(preset.id === 'disabled' ? 'Statusline disabled' : `Applied "${preset.name}"`);
    } catch (e) {
      toast.error('Failed to apply: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const applyCustom = async () => {
    setSaving(true);
    try {
      await api.setStatusline('custom', customScript);
      setActivePresetId('custom');
      toast.success('Custom script applied');
    } catch (e) {
      toast.error('Failed to apply: ' + e.message);
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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-500" />
          Statusline
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Claude Code runs a shell script after each response and displays the output in the status bar.
          Scripts receive JSON session data via stdin. Requires{' '}
          <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded text-xs">jq</code>.
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
          ⚡ Changes apply to the next interaction in your Claude Code session (no restart needed).
        </p>
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
              const isDisabled = preset.id === 'disabled';

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
                        {isActive && <Check className="w-4 h-4 text-indigo-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        {preset.description}
                      </p>
                    </div>
                    {isCustom && <Pencil className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />}
                  </div>

                  {/* Preview bar */}
                  {!isCustom && !isDisabled && preset.preview && (
                    <div className="mt-3 px-2 py-1.5 bg-gray-950 dark:bg-black rounded font-mono text-[11px] border border-gray-800 whitespace-pre text-gray-300 truncate">
                      {preset.preview}
                    </div>
                  )}

                  {isDisabled && (
                    <div className="mt-3 px-2 py-1.5 bg-gray-950 dark:bg-black rounded font-mono text-[11px] border border-gray-800 text-gray-600 italic">
                      (no status bar)
                    </div>
                  )}

                  {/* Custom script editor */}
                  {isCustom && (
                    <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
                      <Textarea
                        value={customScript}
                        onChange={e => setCustomScript(e.target.value)}
                        className="font-mono text-xs h-40 resize-y bg-gray-950 dark:bg-black text-green-400 border-gray-800 placeholder:text-gray-600"
                        spellCheck={false}
                      />
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={applyCustom}
                        disabled={saving || !customScript.trim()}
                      >
                        {saving && activePresetId === 'custom'
                          ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          : null}
                        Apply Custom Script
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Info */}
      <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 border border-transparent dark:border-slate-800 space-y-2">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">How it works</h4>
        <p className="text-xs text-gray-600 dark:text-slate-400">
          Scripts are saved to <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded">~/.claude/statuslines/</code> and
          referenced in <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded">~/.claude/settings.json</code> as{' '}
          <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded">statusLine.command</code>.
          Claude Code pipes JSON session data to the script on each turn.
        </p>
        <p className="text-xs text-gray-500 dark:text-slate-500">
          Test a script manually:{' '}
          <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded font-mono">
            {'echo \'{"model":{"display_name":"opus-4-6"},"context_window":{"used_percentage":37}}\' | ~/.claude/statuslines/full.sh'}
          </code>
        </p>
      </div>
    </div>
  );
}
