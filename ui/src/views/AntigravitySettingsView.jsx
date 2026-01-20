import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import AntigravitySettingsEditor from "@/components/AntigravitySettingsEditor";
import { toast } from "sonner";
import api from "@/lib/api";

export default function AntigravitySettingsView() {
  const [antigravitySettings, setAntigravitySettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAntigravitySettings();
  }, []);

  const loadAntigravitySettings = async () => {
    try {
      setLoading(true);
      const data = await api.getAntigravitySettings();
      setAntigravitySettings(data.settings);
    } catch (error) {
      console.error('Failed to load Antigravity settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAntigravitySettings = async (settings) => {
    try {
      await api.saveAntigravitySettings(settings);
      setAntigravitySettings(settings);
      toast.success('Antigravity settings saved!');
    } catch (error) {
      toast.error('Failed to save settings: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
        <AntigravitySettingsEditor
          settings={antigravitySettings}
          onSave={handleSaveAntigravitySettings}
          loading={loading}
          settingsPath="~/.gemini/antigravity/settings.json"
        />
      </div>

      {/* CLI Commands */}
      <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 border border-transparent dark:border-slate-800">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">CLI Commands</h4>
        <div className="space-y-1 text-sm text-gray-600 dark:text-slate-400 font-mono">
          <p>claude-config apply                    # Generate settings for all tools</p>
          <p>claude-config apply --antigravity      # Generate Antigravity settings only</p>
        </div>
      </div>
    </div>
  );
}
