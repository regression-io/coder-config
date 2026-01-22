import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import GeminiSettingsEditor from "@/components/GeminiSettingsEditor";
import { toast } from "sonner";
import api from "@/lib/api";

export default function GeminiSettingsView() {
  const [geminiSettings, setGeminiSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGeminiSettings();
  }, []);

  const loadGeminiSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getGeminiSettings();
      setGeminiSettings(data.settings);
    } catch (error) {
      console.error('Failed to load Gemini settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeminiSettings = async (settings) => {
    try {
      await api.saveGeminiSettings(settings);
      setGeminiSettings(settings);
      toast.success('Gemini CLI settings saved!');
    } catch (error) {
      toast.error('Failed to save settings: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
        <GeminiSettingsEditor
          settings={geminiSettings}
          onSave={handleSaveGeminiSettings}
          loading={loading}
          settingsPath="~/.gemini/settings.json"
        />
      </div>

      {/* CLI Commands */}
      <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 border border-transparent dark:border-slate-800">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">CLI Commands</h4>
        <div className="space-y-1 text-sm text-gray-600 dark:text-slate-400 font-mono">
          <p>coder-config apply                 # Generate settings for all tools</p>
          <p>coder-config apply --gemini        # Generate Gemini settings only</p>
        </div>
      </div>
    </div>
  );
}
