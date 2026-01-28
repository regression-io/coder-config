import {
  Folder,
  Server,
  Settings,
  Terminal,
  BookOpen,
  GitBranch,
  FileText,
  FileCode,
  Brain,
} from 'lucide-react';

// File type icons and colors
export const FILE_CONFIG = {
  mcps: {
    icon: Server,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label: 'MCP Servers',
  },
  settings: {
    icon: Settings,
    color: 'text-gray-600 dark:text-slate-400',
    bgColor: 'bg-gray-50 dark:bg-slate-800',
    label: 'Settings',
  },
  command: {
    icon: Terminal,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'Skill',
  },
  rule: {
    icon: BookOpen,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    label: 'Rule',
  },
  workflow: {
    icon: GitBranch,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    label: 'Workflow',
  },
  claudemd: {
    icon: FileText,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    label: 'CLAUDE.md',
  },
  geminimd: {
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label: 'GEMINI.md',
  },
  env: {
    icon: FileCode,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    label: '.env',
  },
  memory: {
    icon: Brain,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    label: 'Memory',
  },
  folder: {
    icon: Folder,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    label: 'Folder',
  },
};
