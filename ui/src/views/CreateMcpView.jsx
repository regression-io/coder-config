import React, { useState, useEffect } from 'react';
import {
  Wand2, Plus, FileCode, Plug, FileText, Package,
  Terminal as TerminalIcon, Loader2
} from 'lucide-react';
import TerminalComponent from "@/components/Terminal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";

const MCP_TOOLS_DIR = '~/reg/tools';

const AI_ASSISTANTS = {
  claude: { name: 'Claude Code', command: 'claude', color: 'orange' },
  gemini: { name: 'Gemini CLI', command: 'gemini', color: 'blue' },
};

export default function CreateMcpView({ project }) {
  const [mcpName, setMcpName] = useState('');
  const [mcpDescription, setMcpDescription] = useState('');
  const [outputDir, setOutputDir] = useState(MCP_TOOLS_DIR);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalCommand, setTerminalCommand] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [aiAssistant, setAiAssistant] = useState('claude');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const data = await api.getConfig();
      setAiAssistant(data.config?.aiAssistant || 'claude');
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const assistant = AI_ASSISTANTS[aiAssistant] || AI_ASSISTANTS.claude;

  const handleCreate = () => {
    if (!mcpName.trim()) {
      toast.error('Please enter an MCP name');
      return;
    }

    // Generate scaffold prompt
    const scaffoldPrompt = `Create a new MCP server project called "${mcpName}" with the following:
- Use Python with uv for package management
- Use FastMCP framework
- Description: ${mcpDescription || 'A custom MCP server'}
- Create a single mcp_server.py file with basic structure
- Include a pyproject.toml configured for uv
- Add a README.md with usage instructions`;

    // Start terminal with selected AI assistant command
    setTerminalCommand(`cd "${outputDir}" && ${assistant.command} "${scaffoldPrompt}"`);
    setShowTerminal(true);
    setIsCreating(true);
  };

  const handleTerminalReady = (sessionId) => {
    console.log('Terminal session ready:', sessionId);
  };

  const handleTerminalExit = (exitCode, signal) => {
    console.log('Terminal exited:', exitCode, signal);
    setIsCreating(false);
    if (exitCode === 0) {
      toast.success('MCP project created successfully!');
    }
  };

  const resetForm = () => {
    setShowTerminal(false);
    setTerminalCommand(null);
    setIsCreating(false);
    setMcpName('');
    setMcpDescription('');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none p-6 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Wand2 className="w-7 h-7 text-purple-600" />
              Create MCP Server
            </h1>
            <p className="text-gray-500 dark:text-slate-400 mt-1">
              Generate a new MCP server project with {assistant.name} assistance
            </p>
          </div>
          {showTerminal && (
            <Button
              variant="outline"
              onClick={resetForm}
              className="text-gray-600 dark:text-slate-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Left panel - Form */}
        <div className={`${showTerminal ? 'w-1/3 border-r border-gray-200 dark:border-slate-700' : 'w-full max-w-2xl mx-auto'} p-6 overflow-auto`}>
          <div className="space-y-6">
            {/* MCP Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                MCP Name *
              </label>
              <Input
                value={mcpName}
                onChange={(e) => setMcpName(e.target.value)}
                placeholder="my-awesome-mcp"
                disabled={isCreating}
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                This will be the project folder name
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Description
              </label>
              <Textarea
                value={mcpDescription}
                onChange={(e) => setMcpDescription(e.target.value)}
                placeholder="Describe what your MCP server will do..."
                className="min-h-[100px]"
                disabled={isCreating}
              />
            </div>

            {/* Output Directory */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Output Directory
              </label>
              <Input
                value={outputDir}
                onChange={(e) => setOutputDir(e.target.value)}
                placeholder="/path/to/projects"
                className="font-mono text-sm"
                disabled={isCreating}
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Where to create the new MCP project
              </p>
            </div>

            {/* Template Info */}
            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-900 dark:text-purple-300 mb-2">
                What will be created:
              </h3>
              <ul className="text-sm text-purple-700 dark:text-purple-400 space-y-1">
                <li className="flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  Python project with uv package manager
                </li>
                <li className="flex items-center gap-2">
                  <Plug className="w-4 h-4" />
                  FastMCP framework setup
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  mcp_server.py with basic structure
                </li>
                <li className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  pyproject.toml configured for uv
                </li>
              </ul>
            </div>

            {/* Create Button */}
            {!showTerminal && (
              <Button
                onClick={handleCreate}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                disabled={!mcpName.trim()}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Create & Launch {assistant.name}
              </Button>
            )}
          </div>
        </div>

        {/* Right panel - Terminal */}
        {showTerminal && (
          <div className="flex-1 flex flex-col bg-gray-900">
            <div className="flex-none px-4 py-2 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TerminalIcon className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">{assistant.name} Terminal</span>
              </div>
              <div className="flex items-center gap-2">
                {isCreating && (
                  <Badge variant="outline" className="bg-green-900/50 text-green-400 border-green-700">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Running
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex-1">
              <TerminalComponent
                cwd={outputDir}
                initialCommand={terminalCommand}
                onReady={handleTerminalReady}
                onExit={handleTerminalExit}
                height="100%"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
