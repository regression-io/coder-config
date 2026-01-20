import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, FileText, Zap, Plus, Save, Search,
  FileCode, Check, Loader2, Brain, Clock, AlertCircle, BookOpen
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api";

export default function MemoryView({ project, onUpdate }) {
  const [memory, setMemory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('global');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [addEntry, setAddEntry] = useState({
    open: false,
    type: 'preference',
    // Structured fields for different types
    name: '',
    description: '',
    wrong: '',
    right: '',
    category: '',
    details: '',
    title: '',
    context: '',
    decision: '',
    rationale: '',
    content: '' // fallback for free-form
  });

  // Load memory data
  useEffect(() => {
    loadMemory();
  }, []);

  const loadMemory = async () => {
    try {
      setLoading(true);
      const data = await api.getMemory();
      setMemory(data);
    } catch (error) {
      toast.error('Failed to load memory');
    } finally {
      setLoading(false);
    }
  };

  // Load file content when selected
  useEffect(() => {
    if (selectedFile) {
      loadFileContent(selectedFile.path);
    }
  }, [selectedFile]);

  const loadFileContent = async (path) => {
    try {
      const data = await api.getMemoryFile(path);
      setContent(data.content || '');
    } catch (error) {
      toast.error('Failed to load file');
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      await api.saveMemoryFile(selectedFile.path, content);
      toast.success('Saved!');
      loadMemory();
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const data = await api.searchMemory(searchQuery);
      setSearchResults(data.results || []);
    } catch (error) {
      toast.error('Search failed');
    }
  };

  const handleAddEntry = async () => {
    // Format content based on type
    let formattedContent = '';
    const { type } = addEntry;

    switch (type) {
      case 'preference':
        if (!addEntry.name.trim()) {
          toast.error('Name required');
          return;
        }
        formattedContent = `**${addEntry.name}**: ${addEntry.description}`;
        break;
      case 'correction':
        if (!addEntry.wrong.trim() || !addEntry.right.trim()) {
          toast.error('Both "wrong" and "right" are required');
          return;
        }
        formattedContent = `**Wrong**: ${addEntry.wrong}\n**Right**: ${addEntry.right}`;
        break;
      case 'fact':
        if (!addEntry.category.trim()) {
          toast.error('Category required');
          return;
        }
        formattedContent = `**${addEntry.category}**: ${addEntry.details}`;
        break;
      case 'pattern':
        if (!addEntry.name.trim()) {
          toast.error('Name required');
          return;
        }
        formattedContent = `**${addEntry.name}**\n${addEntry.description}`;
        break;
      case 'decision':
        if (!addEntry.title.trim()) {
          toast.error('Title required');
          return;
        }
        formattedContent = `**${addEntry.title}**\n\n**Context**: ${addEntry.context}\n\n**Decision**: ${addEntry.decision}\n\n**Rationale**: ${addEntry.rationale}`;
        break;
      case 'issue':
        if (!addEntry.title.trim()) {
          toast.error('Title required');
          return;
        }
        formattedContent = `**${addEntry.title}**\n\n${addEntry.description}`;
        break;
      case 'history':
      case 'context':
      default:
        if (!addEntry.content.trim()) {
          toast.error('Content required');
          return;
        }
        formattedContent = addEntry.content;
        break;
    }

    try {
      const scope = ['pattern', 'decision', 'issue', 'history', 'context'].includes(type) ? 'project' : 'global';
      await api.addMemoryEntry(type, formattedContent, scope);
      toast.success(`Added ${type} entry`);
      setAddEntry({
        open: false, type: 'preference',
        name: '', description: '', wrong: '', right: '',
        category: '', details: '', title: '', context: '',
        decision: '', rationale: '', content: ''
      });
      loadMemory();
    } catch (error) {
      toast.error('Failed to add entry');
    }
  };

  const handleInitProject = async () => {
    try {
      await api.initProjectMemory(project.dir);
      toast.success('Project memory initialized!');
      loadMemory();
    } catch (error) {
      toast.error(error.message || 'Failed to initialize');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const entryTypes = {
    global: [
      { id: 'preference', label: 'Preference', icon: Settings, desc: 'User preferences (tools, style, etc.)' },
      { id: 'correction', label: 'Correction', icon: AlertCircle, desc: 'Mistakes to avoid' },
      { id: 'fact', label: 'Fact', icon: BookOpen, desc: 'Facts about your environment' },
    ],
    project: [
      { id: 'context', label: 'Context', icon: FileText, desc: 'Project overview and conventions' },
      { id: 'pattern', label: 'Pattern', icon: FileCode, desc: 'Code patterns in this project' },
      { id: 'decision', label: 'Decision', icon: Zap, desc: 'Architecture decisions' },
      { id: 'issue', label: 'Issue', icon: AlertCircle, desc: 'Known issues and workarounds' },
      { id: 'history', label: 'History', icon: Clock, desc: 'Session work log' },
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header with search and add */}
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Memory System
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddEntry({
                open: true, type: 'preference',
                name: '', description: '', wrong: '', right: '',
                category: '', details: '', title: '', context: '',
                decision: '', rationale: '', content: ''
              })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Search memory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button variant="outline" onClick={handleSearch}>
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Search Results</h3>
            <div className="space-y-2">
              {searchResults.map((result, i) => (
                <div key={i} className="text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={result.scope === 'global' ? 'default' : 'secondary'}>
                      {result.scope}
                    </Badge>
                    <span className="font-medium text-gray-900 dark:text-white">{result.file}</span>
                  </div>
                  {result.matches.map((match, j) => (
                    <div key={j} className="ml-4 text-gray-600 dark:text-slate-400 text-xs mt-1">
                      Line {match.line}: {match.text}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700 pb-2">
        {['global', 'project', 'sync'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab
                ? 'bg-white dark:bg-slate-950 border border-b-white dark:border-b-slate-950 border-gray-200 dark:border-slate-700 -mb-[1px] text-indigo-600 dark:text-indigo-400'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} Memory
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File List */}
        <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {activeTab === 'global' && 'Global Memory Files'}
              {activeTab === 'project' && 'Project Memory Files'}
              {activeTab === 'sync' && 'Sync State'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              {activeTab === 'global' && '~/.claude/memory/'}
              {activeTab === 'project' && `${project.dir}/.claude/memory/`}
              {activeTab === 'sync' && '~/.claude/sync/'}
            </p>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {activeTab === 'global' && memory?.global?.files.map((file) => (
              <button
                key={file.name}
                onClick={() => file.exists && setSelectedFile(file)}
                className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors ${
                  selectedFile?.path === file.path ? 'bg-indigo-50 dark:bg-indigo-950/30' : ''
                } ${!file.exists ? 'opacity-50' : ''}`}
              >
                <FileText className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">{file.type}</div>
                </div>
                {file.exists ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <span className="text-xs text-gray-400 dark:text-slate-500">Not created</span>
                )}
              </button>
            ))}

            {activeTab === 'project' && (
              <>
                {!memory?.project?.initialized ? (
                  <div className="p-6 text-center">
                    <Brain className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">Project memory not initialized</p>
                    <Button onClick={handleInitProject} className="bg-purple-600 hover:bg-purple-700 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Initialize Project Memory
                    </Button>
                  </div>
                ) : (
                  memory?.project?.files.map((file) => (
                    <button
                      key={file.name}
                      onClick={() => file.exists && setSelectedFile(file)}
                      className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors ${
                        selectedFile?.path === file.path ? 'bg-indigo-50 dark:bg-indigo-950/30' : ''
                      } ${!file.exists ? 'opacity-50' : ''}`}
                    >
                      <FileText className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">{file.type}</div>
                      </div>
                      {file.exists ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-slate-500">Not created</span>
                      )}
                    </button>
                  ))
                )}
              </>
            )}

            {activeTab === 'sync' && (
              <div className="p-4">
                {memory?.sync?.state ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Current State</h4>
                      <pre className="text-xs bg-gray-50 dark:bg-slate-900 p-3 rounded overflow-auto max-h-48 text-gray-800 dark:text-slate-300">
                        {JSON.stringify(memory.sync.state, null, 2)}
                      </pre>
                    </div>
                    {memory.sync.history.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">History ({memory.sync.history.length})</h4>
                        <div className="space-y-1">
                          {memory.sync.history.map((h, i) => (
                            <div key={i} className="text-xs text-gray-600 dark:text-slate-400 flex items-center gap-2">
                              <Clock className="w-3 h-3" />
                              {h.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Clock className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 dark:text-slate-400">No sync state</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">State is created by session hooks</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {selectedFile ? selectedFile.name : 'Select a file'}
            </h3>
            {selectedFile && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save
              </Button>
            )}
          </div>
          <div className="p-4">
            {selectedFile ? (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="font-mono text-sm min-h-[400px]"
                placeholder="File content..."
              />
            ) : (
              <div className="flex items-center justify-center h-[400px] text-gray-400 dark:text-slate-500">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a file to edit</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Entry Dialog */}
      <Dialog open={addEntry.open} onOpenChange={(open) => setAddEntry({ ...addEntry, open })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Memory Entry</DialogTitle>
            <DialogDescription>
              Add a new entry to the appropriate memory file.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Entry Type</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[...entryTypes.global, ...entryTypes.project].map((type) => {
                  const Icon = type.icon;
                  const isGlobal = entryTypes.global.some(t => t.id === type.id);
                  return (
                    <button
                      key={type.id}
                      onClick={() => setAddEntry({ ...addEntry, type: type.id })}
                      className={`p-2 rounded-lg border text-left transition-colors ${
                        addEntry.type === type.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                          : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{type.label}</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">{isGlobal ? 'Global' : 'Project'}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Type-specific fields */}
            {addEntry.type === 'preference' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Name</label>
                  <Input
                    value={addEntry.name}
                    onChange={(e) => setAddEntry({ ...addEntry, name: e.target.value })}
                    placeholder="e.g., package-manager"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Description</label>
                  <Input
                    value={addEntry.description}
                    onChange={(e) => setAddEntry({ ...addEntry, description: e.target.value })}
                    placeholder="e.g., Always use pnpm instead of npm"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {addEntry.type === 'correction' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Wrong (what to avoid)</label>
                  <Textarea
                    value={addEntry.wrong}
                    onChange={(e) => setAddEntry({ ...addEntry, wrong: e.target.value })}
                    placeholder="e.g., Using npm install"
                    className="mt-1"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Right (what to do instead)</label>
                  <Textarea
                    value={addEntry.right}
                    onChange={(e) => setAddEntry({ ...addEntry, right: e.target.value })}
                    placeholder="e.g., Use pnpm install"
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </div>
            )}

            {addEntry.type === 'fact' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Category</label>
                  <Input
                    value={addEntry.category}
                    onChange={(e) => setAddEntry({ ...addEntry, category: e.target.value })}
                    placeholder="e.g., shell, editor, system"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Details</label>
                  <Textarea
                    value={addEntry.details}
                    onChange={(e) => setAddEntry({ ...addEntry, details: e.target.value })}
                    placeholder="e.g., Using zsh with oh-my-zsh"
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </div>
            )}

            {addEntry.type === 'pattern' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Pattern Name</label>
                  <Input
                    value={addEntry.name}
                    onChange={(e) => setAddEntry({ ...addEntry, name: e.target.value })}
                    placeholder="e.g., API Response Format"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Description</label>
                  <Textarea
                    value={addEntry.description}
                    onChange={(e) => setAddEntry({ ...addEntry, description: e.target.value })}
                    placeholder="Describe the pattern and when to use it..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {addEntry.type === 'decision' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Title</label>
                  <Input
                    value={addEntry.title}
                    onChange={(e) => setAddEntry({ ...addEntry, title: e.target.value })}
                    placeholder="e.g., Use React Query for data fetching"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Context</label>
                  <Textarea
                    value={addEntry.context}
                    onChange={(e) => setAddEntry({ ...addEntry, context: e.target.value })}
                    placeholder="What problem were we solving?"
                    className="mt-1"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Decision</label>
                  <Textarea
                    value={addEntry.decision}
                    onChange={(e) => setAddEntry({ ...addEntry, decision: e.target.value })}
                    placeholder="What did we decide?"
                    className="mt-1"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Rationale</label>
                  <Textarea
                    value={addEntry.rationale}
                    onChange={(e) => setAddEntry({ ...addEntry, rationale: e.target.value })}
                    placeholder="Why this choice over alternatives?"
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </div>
            )}

            {addEntry.type === 'issue' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Issue Title</label>
                  <Input
                    value={addEntry.title}
                    onChange={(e) => setAddEntry({ ...addEntry, title: e.target.value })}
                    placeholder="e.g., Memory leak in useEffect"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Description / Workaround</label>
                  <Textarea
                    value={addEntry.description}
                    onChange={(e) => setAddEntry({ ...addEntry, description: e.target.value })}
                    placeholder="Describe the issue and any workarounds..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {(addEntry.type === 'history' || addEntry.type === 'context') && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Content</label>
                <Textarea
                  value={addEntry.content}
                  onChange={(e) => setAddEntry({ ...addEntry, content: e.target.value })}
                  placeholder={addEntry.type === 'history' ? "What work was done this session?" : "Project context and overview..."}
                  className="mt-1"
                  rows={4}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddEntry({ ...addEntry, open: false })}>
              Cancel
            </Button>
            <Button onClick={handleAddEntry} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CLI Commands */}
      <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 border border-transparent dark:border-slate-800">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">CLI Commands</h4>
        <div className="space-y-1 text-sm text-gray-600 dark:text-slate-400 font-mono">
          <p>claude-config memory                         # Show memory status</p>
          <p>claude-config memory init                    # Initialize project memory</p>
          <p>claude-config memory add &lt;type&gt; "&lt;content&gt;"  # Add entry</p>
          <p>claude-config memory search &lt;query&gt;          # Search all memory</p>
          <p className="text-gray-400 dark:text-slate-500 text-xs mt-2"># Types: preference, correction, fact (global) | context, pattern, decision, issue, history (project)</p>
        </div>
      </div>
    </div>
  );
}
