import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import CodexSettingsEditor from "@/components/CodexSettingsEditor";
import { toast } from "sonner";
import api from "@/lib/api";

export default function CodexSettingsView() {
  const [codexSettings, setCodexSettings] = useState(null);
  const [rawToml, setRawToml] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCodexSettings();
  }, []);

  const loadCodexSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getCodexSettings();
      setCodexSettings(data.settings);
      setRawToml(data.raw || '');
    } catch (error) {
      console.error('Failed to load Codex settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCodexSettings = async (settings, raw = undefined) => {
    try {
      const result = await api.saveCodexSettings(settings, raw);
      if (result.success) {
        setCodexSettings(result.settings);
        toast.success('Codex CLI settings saved!');
      } else {
        toast.error('Failed to save: ' + result.error);
      }
    } catch (error) {
      toast.error('Failed to save settings: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
        <CodexSettingsEditor
          settings={codexSettings}
          rawToml={rawToml}
          onSave={handleSaveCodexSettings}
          loading={loading}
          settingsPath="~/.codex/config.toml"
        />
      </div>

      {/* CLI Commands */}
      <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 border border-transparent dark:border-slate-800">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">CLI Commands</h4>
        <div className="space-y-1 text-sm text-gray-600 dark:text-slate-400 font-mono">
          <p>codex                        # Start Codex CLI</p>
          <p>codex --model gpt-5.2-codex  # Use specific model</p>
          <p>codex --full-auto            # Low-friction mode</p>
        </div>
      </div>

      {/* Documentation Link */}
      <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
        <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">Documentation</h4>
        <p className="text-sm text-green-700 dark:text-green-300">
          See the full configuration reference at{' '}
          <a
            href="https://developers.openai.com/codex/config-reference/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            developers.openai.com/codex
          </a>
        </p>
      </div>
    </div>
  );
}
