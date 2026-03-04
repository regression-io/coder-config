import React, { useState, useEffect } from 'react';
import { Check, Loader2, Terminal, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/lib/api';
import StatuslineVisualEditor from '@/components/StatuslineVisualEditor';
import { DEFAULT_VISUAL_CONFIG, configToScript } from '@/lib/statuslineConfig';

const CATEGORY_ORDER = ['Built-in', 'Simple', 'Git', 'Cost', 'Custom'];

function groupByCategory(presets) {
  const groups = {};
  for (const preset of presets) {
    if (!groups[preset.category]) groups[preset.category] = [];
    groups[preset.category].push(preset);
  }
  return groups;
}

const DEFAULT_CUSTOM_SCRIPT = configToScript(DEFAULT_VISUAL_CONFIG);

export default function StatuslinesView() {
  const [presets, setPresets] = useState([]);
  const [activePresetId, setActivePresetId] = useState('disabled');
  const [customScript, setCustomScript] = useState(DEFAULT_CUSTOM_SCRIPT);
  const [editingId, setEditingId] = useState(null);       // preset being edited
  const [editScript, setEditScript] = useState('');        // script content in editor
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
    if (preset.id === 'custom' || preset.id === editingId) return;
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

  const openEditor = async (preset, e) => {
    e.stopPropagation();
    if (preset.id === 'custom') {
      setEditScript(customScript);
      setEditingId('custom');
      return;
    }
    try {
      const data = await api.getPresetScript(preset.id);
      setEditScript(data.scriptContent || '');
      setEditingId(preset.id);
    } catch (err) {
      toast.error('Failed to load script: ' + err.message);
    }
  };

  const saveEdit = async (presetId) => {
    setSaving(true);
    try {
      // Always save as the preset's own id (preserves customized version)
      await api.setStatusline(presetId, editScript);
      setActivePresetId(presetId);
      if (presetId === 'custom') setCustomScript(editScript);
      setEditingId(null);
      toast.success('Script saved and applied');
    } catch (e) {
      toast.error('Failed to save: ' + e.message);
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
              const isEditing = editingId === preset.id;
              const canEdit = !isDisabled;

              return (
                <div
                  key={preset.id}
                  onClick={() => !isCustom && !isEditing && applyPreset(preset)}
                  className={[
                    'rounded-xl border p-4 transition-all',
                    isCustom || isEditing ? 'cursor-default' : 'cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500',
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
                        {isActive && !isEditing && <Check className="w-4 h-4 text-indigo-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        {preset.description}
                      </p>
                    </div>
                    {canEdit && (
                      <button
                        onClick={e => isEditing ? (e.stopPropagation(), setEditingId(null)) : openEditor(preset, e)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 shrink-0"
                        title={isEditing ? 'Close editor' : 'Edit script'}
                      >
                        {isEditing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  {/* Preview bar (when not editing) */}
                  {!isEditing && !isCustom && !isDisabled && preset.preview && (
                    <div className="mt-3 px-2 py-1.5 bg-gray-950 dark:bg-black rounded font-mono text-[11px] border border-gray-800 whitespace-pre text-gray-300 truncate">
                      {preset.preview}
                    </div>
                  )}

                  {!isEditing && isDisabled && (
                    <div className="mt-3 px-2 py-1.5 bg-gray-950 dark:bg-black rounded font-mono text-[11px] border border-gray-800 text-gray-600 italic">
                      (no status bar)
                    </div>
                  )}

                  {/* Inline script editor */}
                  {isEditing && (
                    <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
                      <StatuslineVisualEditor
                        value={editScript}
                        onChange={setEditScript}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => saveEdit(preset.id)}
                          disabled={saving || !editScript.trim()}
                        >
                          {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Save & Apply
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Custom preset: always show editor */}
                  {isCustom && !isEditing && (
                    <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
                      <StatuslineVisualEditor
                        value={customScript}
                        onChange={setCustomScript}
                      />
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => saveEdit('custom')}
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
          Test a script:{' '}
          <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded font-mono">
            {'echo \'{"model":{"display_name":"opus-4-6"},"context_window":{"used_percentage":37,"remaining_percentage":63}}\' | ~/.claude/statuslines/full.sh'}
          </code>
        </p>
      </div>
    </div>
  );
}
