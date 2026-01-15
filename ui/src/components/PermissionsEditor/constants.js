import {
  Terminal, FileText, FileEdit, Pencil, Globe, Search, Plug
} from 'lucide-react';

export const PERMISSION_TYPES = [
  {
    name: 'Bash',
    icon: Terminal,
    description: 'Shell commands',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    badgeClass: 'bg-purple-100 text-purple-700 border-purple-200'
  },
  {
    name: 'Read',
    icon: FileText,
    description: 'Read file contents',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  {
    name: 'Edit',
    icon: FileEdit,
    description: 'Edit existing files',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200'
  },
  {
    name: 'Write',
    icon: Pencil,
    description: 'Create/write files',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    badgeClass: 'bg-orange-100 text-orange-700 border-orange-200'
  },
  {
    name: 'WebFetch',
    icon: Globe,
    description: 'Fetch web content',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    badgeClass: 'bg-green-100 text-green-700 border-green-200'
  },
  {
    name: 'WebSearch',
    icon: Search,
    description: 'Web search capability',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    badgeClass: 'bg-teal-100 text-teal-700 border-teal-200'
  },
  {
    name: 'mcp',
    icon: Plug,
    description: 'MCP server tools',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    badgeClass: 'bg-indigo-100 text-indigo-700 border-indigo-200'
  }
];

export const PRESET_PATTERNS = [
  // Git Operations
  {
    category: 'Git',
    name: 'Git Status',
    pattern: 'Bash(git status:*)',
    description: 'Check repository status',
    icon: Terminal
  },
  {
    category: 'Git',
    name: 'Git Add',
    pattern: 'Bash(git add:*)',
    description: 'Stage files for commit',
    icon: Terminal
  },
  {
    category: 'Git',
    name: 'Git Commit',
    pattern: 'Bash(git commit:*)',
    description: 'Create commits',
    icon: Terminal
  },
  {
    category: 'Git',
    name: 'Git Push',
    pattern: 'Bash(git push:*)',
    description: 'Push to remote repository',
    icon: Terminal
  },
  {
    category: 'Git',
    name: 'Git Diff',
    pattern: 'Bash(git diff:*)',
    description: 'Show changes',
    icon: Terminal
  },

  // NPM Operations
  {
    category: 'NPM',
    name: 'NPM Install',
    pattern: 'Bash(npm install:*)',
    description: 'Install dependencies',
    icon: Terminal
  },
  {
    category: 'NPM',
    name: 'NPM Run Scripts',
    pattern: 'Bash(npm run:*)',
    description: 'Run package scripts',
    icon: Terminal
  },
  {
    category: 'NPM',
    name: 'NPM Test',
    pattern: 'Bash(npm test:*)',
    description: 'Run tests',
    icon: Terminal
  },

  // File Operations
  {
    category: 'Files',
    name: 'Read All Files',
    pattern: 'Read(**)',
    description: 'Read any file in the project',
    icon: FileText
  },
  {
    category: 'Files',
    name: 'Edit All Files',
    pattern: 'Edit(**)',
    description: 'Edit any file in the project',
    icon: FileEdit
  },

  // Security - Deny patterns
  {
    category: 'Security',
    name: 'Deny .env Files',
    pattern: 'Read(./.env)',
    description: 'Block reading environment files',
    icon: FileText,
    suggestedCategory: 'deny'
  },
  {
    category: 'Security',
    name: 'Deny All .env',
    pattern: 'Read(**/.env*)',
    description: 'Block all environment files',
    icon: FileText,
    suggestedCategory: 'deny'
  },

  // Common Commands
  {
    category: 'Commands',
    name: 'List Files',
    pattern: 'Bash(ls:*)',
    description: 'List directory contents',
    icon: Terminal
  },
  {
    category: 'Commands',
    name: 'Find Files',
    pattern: 'Bash(find:*)',
    description: 'Find files and directories',
    icon: Terminal
  },

  // MCP Tools
  {
    category: 'MCP',
    name: 'Filesystem Operations',
    pattern: 'mcp__filesystem__*',
    description: 'All filesystem MCP operations',
    icon: Plug
  },
  {
    category: 'MCP',
    name: 'GitHub Operations',
    pattern: 'mcp__github__*',
    description: 'All GitHub MCP operations',
    icon: Plug
  }
];
