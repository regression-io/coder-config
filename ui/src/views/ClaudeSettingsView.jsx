import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import ClaudeSettingsEditor from "@/components/ClaudeSettingsEditor";
import { toast } from "sonner";
import api from "@/lib/api";

export default function ClaudeSettingsView() {
  const [claudeSettings, setClaudeSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClaudeSettings();
  }, []);

  const loadClaudeSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getClaudeSettings();
      setClaudeSettings(data.settings);
    } catch (error) {
      console.error('Failed to load Claude settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClaudeSettings = async (settings) => {
    try {
      await api.saveClaudeSettings(settings);
      setClaudeSettings(settings);
      toast.success('Claude Code settings saved!');
    } catch (error) {
      toast.error('Failed to save settings: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
        <ClaudeSettingsEditor
          settings={claudeSettings}
          onSave={handleSaveClaudeSettings}
          loading={loading}
          settingsPath="~/.claude/settings.json"
        />
      </div>

      {/* CLI Commands */}
      <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 border border-transparent dark:border-slate-800">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">CLI Commands</h4>
        <div className="space-y-1 text-sm text-gray-600 dark:text-slate-400 font-mono">
          <p>claude-config init                  # Initialize project</p>
          <p>claude-config apply                 # Generate .mcp.json from config</p>
          <p>claude-config show                  # Show current project config</p>
        </div>
      </div>
    </div>
  );
}
