import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Layout, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";

export default function TemplatesView({ templates, project, onApply }) {
  const [applying, setApplying] = useState(null);

  const handleApply = async (templateName) => {
    setApplying(templateName);
    try {
      await api.applyTemplate(templateName, project.dir);
      toast.success(`Template "${templateName}" applied!`);
      onApply();
    } catch (error) {
      toast.error('Failed to apply template: ' + error.message);
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Layout className="w-5 h-5 text-cyan-600" />
            Templates
          </h2>
        </div>

        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            Apply a template to quickly set up rules, commands, and MCP configurations for your project.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template, index) => (
              <motion.div
                key={template.fullName || template.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-lg border border-gray-200 p-5 hover:border-cyan-300 hover:shadow-lg transition-all group"
              >
                <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200 mb-3 text-[10px] uppercase tracking-wider">
                  {template.category}
                </Badge>
                <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{template.description || 'Project template'}</p>
                {template.mcpDefaults?.length > 0 && (
                  <div className="mb-4">
                    <span className="text-xs text-gray-500">MCPs: </span>
                    <span className="text-xs text-gray-700">{template.mcpDefaults.join(', ')}</span>
                  </div>
                )}
                <Button
                  size="sm"
                  onClick={() => handleApply(template.fullName || `${template.category}/${template.name}`)}
                  disabled={applying === (template.fullName || template.name)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {applying === (template.fullName || template.name) ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Apply Template
                </Button>
              </motion.div>
            ))}
            {templates.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                No templates available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
