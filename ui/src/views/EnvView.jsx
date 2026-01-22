import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, Copy, Save, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import api from "@/lib/api";

export default function EnvView({ project, configs }) {
  const [showValues, setShowValues] = useState({});
  const [envContent, setEnvContent] = useState('');
  const [envVars, setEnvVars] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEnv();
  }, [project.dir]);

  const loadEnv = async () => {
    try {
      const data = await api.getEnv(project.dir);
      setEnvContent(data.content || '');
      // Parse env content into key-value pairs
      const vars = {};
      (data.content || '').split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          vars[match[1]] = match[2];
        }
      });
      setEnvVars(vars);
    } catch (error) {
      // Ignore - file may not exist
    }
  };

  const toggleShow = (key) => {
    setShowValues(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveEnv(project.dir, envContent);
      toast.success('Environment saved!');
    } catch (error) {
      toast.error('Failed to save environment');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (value) => {
    navigator.clipboard.writeText(value);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-rose-600" />
            Environment Variables
          </h2>
        </div>

        <div className="p-4">
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
            Environment variables are stored in <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded">.claude/.env</code> and used for MCP server configuration.
          </p>

          {Object.keys(envVars).length > 0 ? (
            <div className="space-y-3 mb-4">
              {Object.entries(envVars).map(([key, value], index) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-4 flex items-center gap-4"
                >
                  <code className="text-indigo-600 dark:text-indigo-400 font-semibold min-w-[200px]">{key}</code>
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      type={showValues[key] ? 'text' : 'password'}
                      value={value}
                      className="bg-white dark:bg-slate-950 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white font-mono"
                      readOnly
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleShow(key)}
                      className="text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(value)}
                      className="text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-slate-400 mb-4">
              No environment variables defined.
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Edit .env file</h3>
            <Textarea
              value={envContent}
              onChange={(e) => setEnvContent(e.target.value)}
              placeholder="KEY=value&#10;ANOTHER_KEY=another_value"
              className="min-h-[200px] font-mono text-sm bg-gray-50 dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white mb-4"
            />
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Environment
            </Button>
          </div>
        </div>
      </div>

      {/* CLI Commands */}
      <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 border border-transparent dark:border-slate-800">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">CLI Commands</h4>
        <div className="space-y-1 text-sm text-gray-600 dark:text-slate-400 font-mono">
          <p>coder-config env                    # List environment variables</p>
          <p>coder-config env set &lt;KEY&gt; &lt;value&gt;  # Set variable in .claude/.env</p>
          <p>coder-config env unset &lt;KEY&gt;        # Remove variable</p>
        </div>
      </div>
    </div>
  );
}
