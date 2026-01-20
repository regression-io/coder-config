import {
  BookOpen, Folder, Package, Brain, Terminal,
  Layers, Keyboard, Shield, HelpCircle, Sparkles, Rocket
} from 'lucide-react';

const docSections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: BookOpen,
    subsections: [
      { id: 'installation', title: 'Installation' },
      { id: 'quick-start', title: 'Quick Start' },
      { id: 'updating', title: 'Updating' },
    ]
  },
  {
    id: 'projects',
    title: 'Project Management',
    icon: Layers,
    subsections: [
      { id: 'project-registry', title: 'Project Registry' },
      { id: 'project-switching', title: 'Switching Projects' },
      { id: 'project-structure', title: 'Project Structure' },
    ]
  },
  {
    id: 'file-explorer',
    title: 'Project Explorer',
    icon: Folder,
    subsections: [
      { id: 'claude-folders', title: '.claude Folders' },
      { id: 'rules', title: 'Rules' },
      { id: 'commands', title: 'Commands' },
      { id: 'workflows', title: 'Workflows' },
      { id: 'hierarchy', title: 'Configuration Hierarchy' },
      { id: 'subprojects', title: 'Sub-Projects' },
    ]
  },
  {
    id: 'workstreams',
    title: 'Workstreams',
    icon: Layers,
    isNew: true,
    subsections: [
      { id: 'workstreams-overview', title: 'Overview' },
      { id: 'creating-workstreams', title: 'Creating Workstreams' },
      { id: 'workstream-hooks', title: 'Hook Integration' },
      { id: 'activity-tracking', title: 'Activity Tracking' },
      { id: 'smart-sync', title: 'Smart Sync' },
    ]
  },
  {
    id: 'plugins',
    title: 'Plugins',
    icon: Package,
    isNew: true,
    subsections: [
      { id: 'plugins-overview', title: 'Overview' },
      { id: 'installing-plugins', title: 'Installing Plugins' },
      { id: 'plugin-marketplaces', title: 'Marketplaces' },
    ]
  },
  {
    id: 'mcp-registry',
    title: 'MCP Registry',
    icon: Package,
    subsections: [
      { id: 'mcp-overview', title: 'Overview' },
      { id: 'adding-mcps', title: 'Adding MCPs' },
      { id: 'configuring-mcps', title: 'Configuring MCPs' },
      { id: 'environment-vars', title: 'Environment Variables' },
    ]
  },
  {
    id: 'memory',
    title: 'Memory System',
    icon: Brain,
    subsections: [
      { id: 'memory-overview', title: 'Overview' },
      { id: 'global-memory', title: 'Global Memory' },
      { id: 'project-memory', title: 'Project Memory' },
      { id: 'memory-entries', title: 'Memory Entry Types' },
    ]
  },
  {
    id: 'claude-settings',
    title: 'Claude Code Settings',
    icon: Shield,
    subsections: [
      { id: 'permissions', title: 'Permissions' },
      { id: 'model-selection', title: 'Model Selection' },
      { id: 'behavior', title: 'Behavior Settings' },
      { id: 'hooks', title: 'Hooks' },
    ]
  },
  {
    id: 'gemini-settings',
    title: 'Gemini CLI Settings',
    icon: Terminal,
    isNew: true,
    subsections: [
      { id: 'gemini-model', title: 'Model Selection' },
      { id: 'gemini-display', title: 'Display Options' },
      { id: 'gemini-general', title: 'General Settings' },
      { id: 'gemini-sandbox', title: 'Sandbox Mode' },
    ]
  },
  {
    id: 'antigravity-settings',
    title: 'Antigravity Settings',
    icon: Rocket,
    isNew: true,
    subsections: [
      { id: 'antigravity-security', title: 'Security Policies' },
      { id: 'antigravity-mcp', title: 'MCP Servers' },
      { id: 'antigravity-browser', title: 'Browser Allowlist' },
      { id: 'antigravity-agent', title: 'Agent Mode' },
    ]
  },
  {
    id: 'cli',
    title: 'CLI Reference',
    icon: Terminal,
    subsections: [
      { id: 'cli-overview', title: 'Overview' },
      { id: 'cli-commands', title: 'All Commands' },
      { id: 'daemon-mode', title: 'Daemon Mode' },
    ]
  },
  {
    id: 'multi-tool',
    title: 'Multi-Tool Support',
    icon: Sparkles,
    subsections: [
      { id: 'supported-tools', title: 'Supported Tools' },
      { id: 'gemini-cli', title: 'Gemini CLI' },
      { id: 'antigravity', title: 'Antigravity' },
      { id: 'tool-differences', title: 'Tool Differences' },
      { id: 'enabling-tools', title: 'Enabling Tools' },
      { id: 'syncing-rules', title: 'Syncing Rules' },
    ]
  },
  {
    id: 'keyboard',
    title: 'Keyboard Shortcuts',
    icon: Keyboard,
    subsections: []
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: HelpCircle,
    subsections: [
      { id: 'common-issues', title: 'Common Issues' },
      { id: 'getting-help', title: 'Getting Help' },
    ]
  },
];

export default docSections;
