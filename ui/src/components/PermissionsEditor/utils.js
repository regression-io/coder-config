import { PERMISSION_TYPES } from './constants';

/**
 * Parse a permission rule string into components
 */
export function parsePermissionRule(rule) {
  if (!rule) {
    return { type: 'unknown', value: '', hasWildcard: false, description: '' };
  }

  // MCP tool patterns: mcp__server__tool
  if (rule.startsWith('mcp__')) {
    const parts = rule.split('__');
    return {
      type: 'mcp',
      value: rule,
      server: parts[1] || '',
      tool: parts[2] || '',
      hasWildcard: rule.includes('*'),
      description: `MCP tool: ${parts.slice(1).join('/')}`
    };
  }

  // WebSearch (no arguments)
  if (rule === 'WebSearch') {
    return {
      type: 'WebSearch',
      value: '',
      hasWildcard: false,
      description: 'Web search capability'
    };
  }

  // Pattern: Type(value)
  const match = rule.match(/^(\w+)\((.+)\)$/);
  if (match) {
    const [, type, value] = match;
    const hasWildcard = value.includes('*');

    return {
      type,
      value,
      hasWildcard,
      description: getDescription(type, value)
    };
  }

  return {
    type: 'unknown',
    value: rule,
    hasWildcard: rule.includes('*'),
    description: rule
  };
}

/**
 * Build a rule string from type and value
 */
export function buildRule(type, value) {
  if (type === 'WebSearch') {
    return 'WebSearch';
  }

  if (type === 'mcp') {
    return value; // Already in mcp__server__tool format
  }

  if (!value) {
    return '';
  }

  return `${type}(${value})`;
}

/**
 * Validate a permission rule
 */
export function validateRule(rule) {
  if (!rule) {
    return 'Rule cannot be empty';
  }

  // Check for WebSearch
  if (rule === 'WebSearch') {
    return null;
  }

  // Check for MCP pattern
  if (rule.startsWith('mcp__')) {
    // Allow wildcards in MCP patterns
    if (rule.includes('*')) {
      return null;
    }
    if (!rule.match(/^mcp__\w+__\w+$/)) {
      return 'MCP pattern must be: mcp__server__tool';
    }
    return null;
  }

  // Check for Type(value) pattern
  const match = rule.match(/^(\w+)\((.+)\)$/);
  if (!match) {
    return 'Invalid pattern format. Expected: Type(value) or mcp__server__tool';
  }

  const [, type] = match;

  // Validate type
  const validTypes = ['Bash', 'Read', 'Edit', 'Write', 'WebFetch'];
  if (!validTypes.includes(type)) {
    return `Unknown permission type: ${type}. Valid types: ${validTypes.join(', ')}`;
  }

  return null;
}

/**
 * Get human-readable description for a rule
 */
function getDescription(type, value) {
  switch (type) {
    case 'Bash':
      if (value.includes(':')) {
        const [cmd, args] = value.split(':');
        if (args === '*') {
          return `Run "${cmd}" with any arguments`;
        }
        return `Run "${cmd} ${args}"`;
      }
      return `Run "${value}"`;

    case 'Read':
      if (value === '**') return 'Read all files';
      if (value.includes('**')) return `Read files matching ${value}`;
      return `Read ${value}`;

    case 'Edit':
      if (value === '**') return 'Edit all files';
      if (value.includes('**')) return `Edit files matching ${value}`;
      return `Edit ${value}`;

    case 'Write':
      if (value === '**') return 'Write to any file';
      if (value.includes('**')) return `Write files matching ${value}`;
      return `Write to ${value}`;

    case 'WebFetch':
      if (value === '*') return 'Fetch any URL';
      return `Fetch URLs matching ${value}`;

    default:
      return value;
  }
}

/**
 * Get permission type configuration
 */
export function getPermissionTypeConfig(typeName) {
  const config = PERMISSION_TYPES.find(t => t.name === typeName);
  return config || PERMISSION_TYPES[0]; // Default to Bash if unknown
}

/**
 * Get category tooltip
 */
export function getCategoryTooltip(category) {
  const tooltips = {
    allow: 'Rules in "Allow" will execute automatically without prompting. Use wildcards (*) for flexible matching.',
    ask: 'Rules in "Ask" will prompt for confirmation each time. Good for potentially destructive operations.',
    deny: 'Rules in "Deny" are blocked entirely. Use this to prevent access to sensitive files or dangerous operations.'
  };
  return tooltips[category];
}

/**
 * Get category configuration
 */
export function getCategoryConfig(category) {
  const configs = {
    allow: {
      label: 'Allow',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      badgeColor: 'bg-green-100 text-green-700',
      description: 'Operations that run without asking'
    },
    ask: {
      label: 'Ask',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      badgeColor: 'bg-amber-100 text-amber-700',
      description: 'Operations that require confirmation'
    },
    deny: {
      label: 'Deny',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      badgeColor: 'bg-red-100 text-red-700',
      description: 'Operations that are blocked'
    }
  };
  return configs[category];
}

/**
 * Get a user-friendly explanation for a permission rule
 */
export function getFriendlyExplanation(rule, category) {
  const parsed = parsePermissionRule(rule);
  const { type, value } = parsed;

  // Category meanings
  const categoryMeanings = {
    allow: {
      prefix: '✓ Allowed automatically',
      meaning: 'Claude will do this without asking you first'
    },
    ask: {
      prefix: '? Requires approval',
      meaning: 'Claude will ask for your permission each time'
    },
    deny: {
      prefix: '✗ Blocked',
      meaning: 'Claude cannot do this at all'
    }
  };

  const catInfo = categoryMeanings[category] || categoryMeanings.ask;
  let summary = '';
  let detail = '';
  let examples = [];

  switch (type) {
    case 'Bash':
      if (value.includes(':')) {
        const [cmd, args] = value.split(':');
        if (args === '*') {
          summary = `Run "${cmd}" command`;
          detail = `Allows running the ${cmd} command with any arguments`;
          examples = [`${cmd} build`, `${cmd} test`, `${cmd} --help`];
        } else {
          summary = `Run "${cmd} ${args}"`;
          detail = `Allows running this specific command`;
          examples = [`${cmd} ${args}`];
        }
      } else if (value === '*') {
        summary = 'Run any terminal command';
        detail = 'Allows executing any command in the terminal. Use with caution!';
        examples = ['npm install', 'git push', 'rm files'];
      } else {
        summary = `Run "${value}" command`;
        detail = `Allows running this specific command`;
        examples = [value];
      }
      break;

    case 'Read':
      if (value === '**') {
        summary = 'Read any file';
        detail = 'Allows reading the contents of any file in the project';
        examples = ['package.json', 'src/index.ts', '.env'];
      } else if (value.includes('**/*.')) {
        const ext = value.split('**.')[1];
        summary = `Read ${ext} files`;
        detail = `Allows reading any file ending in .${ext}`;
        examples = [`file.${ext}`, `src/component.${ext}`];
      } else if (value.startsWith('./')) {
        summary = `Read files in ${value}`;
        detail = `Allows reading files in the ${value.replace('./', '')} directory`;
      } else {
        summary = `Read "${value}"`;
        detail = 'Allows reading files matching this pattern';
      }
      break;

    case 'Edit':
      if (value === '**') {
        summary = 'Edit any file';
        detail = 'Allows modifying the contents of any file. Changes can be undone with git.';
        examples = ['package.json', 'src/index.ts'];
      } else if (value.includes('**/*.')) {
        const ext = value.split('**.')[1];
        summary = `Edit ${ext} files`;
        detail = `Allows modifying any file ending in .${ext}`;
      } else if (value.startsWith('./')) {
        summary = `Edit files in ${value}`;
        detail = `Allows modifying files in the ${value.replace('./', '')} directory`;
      } else {
        summary = `Edit "${value}"`;
        detail = 'Allows modifying files matching this pattern';
      }
      break;

    case 'Write':
      if (value === '**') {
        summary = 'Create any file';
        detail = 'Allows creating new files anywhere in the project';
      } else {
        summary = `Create files in "${value}"`;
        detail = 'Allows creating new files matching this pattern';
      }
      break;

    case 'WebFetch':
      if (value === '*') {
        summary = 'Fetch any URL';
        detail = 'Allows making HTTP requests to any website';
        examples = ['api.github.com', 'docs.example.com'];
      } else {
        summary = `Fetch from ${value}`;
        detail = 'Allows making HTTP requests to URLs matching this pattern';
      }
      break;

    case 'WebSearch':
      summary = 'Search the web';
      detail = 'Allows Claude to search the internet for information';
      break;

    case 'mcp':
      const parts = rule.split('__');
      const server = parts[1] || 'unknown';
      const tool = parts[2] || '*';
      if (tool === '*' || rule.endsWith('*')) {
        summary = `Use ${server} tools`;
        detail = `Allows using any tool from the ${server} MCP server`;
      } else {
        summary = `Use ${server}/${tool}`;
        detail = `Allows using the ${tool} tool from the ${server} MCP server`;
      }
      break;

    default:
      summary = rule;
      detail = 'Custom permission rule';
  }

  return {
    summary,
    detail,
    examples,
    categoryMeaning: `${catInfo.prefix} — ${catInfo.meaning}`
  };
}

/**
 * Group rules by their type
 */
export function groupRulesByType(rules) {
  const groups = {
    Bash: [],
    Read: [],
    Edit: [],
    Write: [],
    WebFetch: [],
    WebSearch: [],
    mcp: [],
    other: []
  };

  for (const rule of rules) {
    const parsed = parsePermissionRule(rule);
    const type = parsed.type;

    if (groups[type]) {
      groups[type].push(rule);
    } else {
      groups.other.push(rule);
    }
  }

  // Return only non-empty groups in a consistent order
  const order = ['Bash', 'Read', 'Edit', 'Write', 'WebFetch', 'WebSearch', 'mcp', 'other'];
  return order
    .filter(type => groups[type].length > 0)
    .map(type => ({ type, rules: groups[type] }));
}
