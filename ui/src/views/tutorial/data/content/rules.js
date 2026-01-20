export const rulesContent = {
  'what-are-rules': {
    title: 'What Are Rules?',
    content: `
Rules are **instructions for Claude** written in plain Markdown. They tell Claude things like:

- How your project is structured
- What coding conventions to follow
- What to avoid doing
- Important context about your tech stack

### How Claude Uses Rules

When you work with Claude in a project, it automatically reads:
1. Files in \`.claude/rules/\`
2. The \`CLAUDE.md\` file in your project root

These become part of Claude's "system prompt" - the background context that shapes all its responses.

### Example Rule

\`\`\`markdown
# Code Style

- Use TypeScript for all new files
- Prefer functional components with hooks
- Always add JSDoc comments for exported functions
- Use absolute imports from @/
\`\`\`

### Why Rules Matter

Without rules, Claude makes assumptions. With rules, Claude follows **your** preferences.

For example, you might want Claude to:
- Always use a specific test framework
- Follow a particular naming convention
- Never modify certain files
- Use specific patterns for error handling
    `
  },
  'creating-rules': {
    title: 'Creating Your First Rule',
    content: `
Let's create a simple rule file. This takes just a minute!

### Step by Step

1. Go to **Project Explorer** in the sidebar
2. Navigate to the \`rules/\` folder (create it if needed)
3. Click the **+** button to create a new file
4. Name it something descriptive like \`coding-style.md\`

### Write Your Rule

Start simple. Here's a template:

\`\`\`markdown
# Project Guidelines

## Tech Stack
- Frontend: React with TypeScript
- Backend: Node.js
- Database: PostgreSQL

## Coding Style
- Use async/await instead of callbacks
- Keep functions small and focused
- Add error handling to all API calls

## What to Avoid
- Don't use var, use const/let
- Don't commit console.log statements
- Don't modify package-lock.json
\`\`\`

### Test Your Rule

After saving:
1. Open Claude Code in your project
2. Ask Claude something related to your rule
3. Notice how it follows your guidelines!

### Pro Tip

You can have multiple rule files. Claude reads them all. Organize by topic:
- \`code-style.md\` - Coding conventions
- \`architecture.md\` - Project structure
- \`testing.md\` - Test guidelines
    `
  },
  'rule-tips': {
    title: 'Tips for Great Rules',
    content: `
Good rules make Claude more helpful. Here's what works best.

### Be Specific, Not Vague

**Good**: "Use Tailwind CSS classes, never inline styles"

**Vague**: "Follow good CSS practices"

### Use Examples

\`\`\`markdown
## API Response Format

Always return responses in this format:
\\\`\\\`\\\`json
{
  "success": true,
  "data": { ... },
  "error": null
}
\\\`\\\`\\\`
\`\`\`

### State What TO Do, Not Just What NOT to Do

**Better**: "Use the logger from src/utils/logger.ts for all logging"

**Less helpful**: "Don't use console.log"

### Keep It Updated

Rules should evolve with your project. Outdated rules confuse Claude.

### Organize by Topic

Instead of one huge file, use multiple focused files:
- \`database.md\` - Database conventions
- \`api.md\` - API patterns
- \`testing.md\` - Test guidelines
- \`security.md\` - Security requirements

### Don't Over-Rule

Claude is smart. You don't need to specify everything. Focus on:
- Your unique preferences
- Project-specific patterns
- Things Claude might not know about your codebase
    `
  },
};
