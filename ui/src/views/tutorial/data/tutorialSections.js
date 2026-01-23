import {
  Sparkles, FolderPlus, FileText, Package, Shield,
  Brain, Puzzle, Workflow, Wand2, Rocket, RefreshCcw
} from 'lucide-react';

const tutorialSections = [
  {
    id: 'welcome',
    title: 'Welcome',
    icon: Sparkles,
    subsections: [
      { id: 'intro', title: 'What is Coder Config?' },
      { id: 'what-youll-learn', title: "What You'll Learn" },
    ]
  },
  {
    id: 'first-project',
    title: 'Your First Project',
    icon: FolderPlus,
    subsections: [
      { id: 'adding-project', title: 'Adding a Project' },
      { id: 'exploring-project', title: 'Exploring Your Project' },
      { id: 'claude-folder', title: 'The .claude Folder' },
    ]
  },
  {
    id: 'rules-guide',
    title: 'Working with Rules',
    icon: FileText,
    subsections: [
      { id: 'what-are-rules', title: 'What Are Rules?' },
      { id: 'creating-rules', title: 'Creating Your First Rule' },
      { id: 'rule-tips', title: 'Tips for Great Rules' },
    ]
  },
  {
    id: 'mcp-guide',
    title: 'MCP Servers',
    icon: Package,
    subsections: [
      { id: 'what-are-mcps', title: 'What Are MCPs?' },
      { id: 'adding-mcp', title: 'Adding Your First MCP' },
      { id: 'mcp-config', title: 'Configuring MCPs' },
    ]
  },
  {
    id: 'permissions-guide',
    title: 'Permissions',
    icon: Shield,
    subsections: [
      { id: 'understanding-permissions', title: 'How Permissions Work' },
      { id: 'setting-permissions', title: 'Setting Up Permissions' },
      { id: 'permission-patterns', title: 'Permission Patterns' },
    ]
  },
  {
    id: 'memory-guide',
    title: 'Memory System',
    icon: Brain,
    subsections: [
      { id: 'what-is-memory', title: 'What is Memory?' },
      { id: 'using-memory', title: 'Using Memory' },
    ]
  },
  {
    id: 'plugins-guide',
    title: 'Plugins',
    icon: Puzzle,
    subsections: [
      { id: 'what-are-plugins', title: 'What Are Plugins?' },
      { id: 'installing-plugin', title: 'Installing a Plugin' },
    ]
  },
  {
    id: 'workstreams-guide',
    title: 'Workstreams',
    icon: Workflow,
    subsections: [
      { id: 'what-are-workstreams', title: 'What Are Workstreams?' },
      { id: 'creating-workstream', title: 'Creating a Workstream' },
    ]
  },
  {
    id: 'loops-guide',
    title: 'Ralph Loops',
    icon: RefreshCcw,
    isNew: true,
    subsections: [
      { id: 'what-are-loops', title: 'What Are Ralph Loops?' },
      { id: 'creating-first-loop', title: 'Your First Loop' },
    ]
  },
  {
    id: 'multi-tool-guide',
    title: 'Multi-Tool Support',
    icon: Wand2,
    subsections: [
      { id: 'other-tools', title: 'Beyond Claude Code' },
      { id: 'syncing-tools', title: 'Syncing Between Tools' },
    ]
  },
  {
    id: 'next-steps',
    title: 'Next Steps',
    icon: Rocket,
    subsections: []
  },
];

export default tutorialSections;
