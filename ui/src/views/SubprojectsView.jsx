import React from 'react';
import { motion } from 'framer-motion';
import { Folder, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";

export default function SubprojectsView({ project, onRefresh }) {
  const handleSwitchProject = async (dir) => {
    try {
      await api.switchProject(dir);
      window.location.reload();
    } catch (error) {
      toast.error('Failed to switch project: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Folder className="w-5 h-5 text-amber-500" />
            Sub-Projects
          </h2>
          <Button variant="outline" size="sm" onClick={onRefresh} className="border-gray-300 text-gray-700 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="p-4 mx-4 mb-4 mt-4 bg-amber-50 rounded-lg border-l-4 border-amber-500">
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-amber-700">Current Directory:</span>{' '}
            <code className="text-gray-600 bg-white px-2 py-0.5 rounded">{project.dir}</code>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Found {project.subprojects?.length || 0} sub-project{(project.subprojects?.length || 0) !== 1 ? 's' : ''} with .git directories.
          </p>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(project.subprojects || []).map((proj, index) => (
            <motion.div
              key={proj.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => handleSwitchProject(proj.dir)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{proj.name}</h3>
                <div className="flex gap-1">
                  {proj.markers?.git && <span title="Git">🔀</span>}
                  {proj.markers?.npm && <span title="NPM">📦</span>}
                  {proj.markers?.python && <span title="Python">🐍</span>}
                  {proj.markers?.claude && <span title="Claude Config">⚙️</span>}
                </div>
              </div>
              <code className="text-xs text-gray-500 block mb-3">{proj.relativePath || proj.name}</code>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={proj.hasConfig
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-gray-50 text-gray-600 border-gray-200'
                }>
                  {proj.hasConfig ? `✓ ${proj.mcpCount} MCPs` : 'No config'}
                </Badge>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-gray-500 hover:text-gray-900 opacity-0 group-hover:opacity-100">
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          ))}
          {(!project.subprojects || project.subprojects.length === 0) && (
            <div className="col-span-full text-center py-8 text-gray-500">
              No sub-projects found in this directory.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
