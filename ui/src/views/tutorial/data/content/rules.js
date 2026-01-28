export const rulesContent = {
  'what-are-rules': {
    title: 'What Are Rules?',
    content: `
Rules are instructions for Claude written in plain Markdown. They tell Claude things about your project—how it's structured, what coding conventions to follow, what to avoid. Think of them as persistent context that Claude reads before every conversation.

### How Claude Uses Rules

When you start Claude Code in a project, it looks for configuration in the \`.claude/\` folder. Any Markdown files in the \`rules/\` subfolder get loaded automatically, along with any \`CLAUDE.md\` file in your project root. Claude treats all of this as background context that shapes how it thinks and responds.

This is different from just telling Claude something in conversation. If you say "use TypeScript" in chat, Claude knows that for the current conversation. But next time you start a session, it's forgotten. Rules persist—every new conversation in that project starts with Claude already knowing your preferences.

### A Simple Example

Say you create a file called \`.claude/rules/code-style.md\` with this content:

\`\`\`markdown
# Code Style

Use TypeScript for all new files. Prefer functional components with hooks.
Always add JSDoc comments for exported functions. Use absolute imports from @/.
\`\`\`

Now Claude follows these conventions automatically. You don't have to remind it every time. If you ask Claude to create a new component, it'll use TypeScript, make it functional, add JSDoc comments, and use \`@/\` imports—because those are the rules.

### Why This Matters

Without rules, Claude makes reasonable guesses based on what it sees in your codebase. Usually that's fine. But when you have specific preferences—your team's conventions, security requirements, patterns that aren't obvious from the code alone—rules make Claude follow them consistently.
    `
  },
  'creating-rules': {
    title: 'Creating Your First Rule',
    content: `
Let's create a rule file. This takes about a minute.

### Finding the Rules Folder

In the sidebar, click **Project Explorer**. You'll see your project's file tree. Look for a folder called \`.claude\`—if it doesn't exist, create one. Inside that, create a \`rules\` folder if needed.

Click the **+** button and create a new file. Name it something descriptive like \`project-guidelines.md\`. The name doesn't matter to Claude; pick something that makes sense to you.

### Writing Your First Rule

Start with the basics. Describe your tech stack and any conventions Claude should know about. Here's a template to get you started:

\`\`\`markdown
# Project Guidelines

This is a React TypeScript project with a Node.js backend and PostgreSQL database.

## Coding Conventions

We use async/await instead of callbacks. Functions should be small and focused—if something
is getting long, break it into smaller pieces. All API calls need proper error handling.

## Things to Avoid

Don't use var—always const or let. Don't commit console.log statements (use our logger at
src/utils/logger.ts instead). Don't modify package-lock.json directly.
\`\`\`

Write in natural language. You're explaining things to Claude the same way you'd explain them to a new team member.

### Testing It Out

Save your file, then open Claude Code in your project. Ask Claude something related to your rules—maybe "create a utility function for making API calls." Watch how it follows your guidelines. It should use async/await, add error handling, and use your logger instead of console.log.

If Claude isn't following a rule, the rule might be unclear. Try rephrasing it to be more specific.
    `
  },
  'rule-tips': {
    title: 'Tips for Great Rules',
    content: `
Some rules work better than others. Here's what makes the difference.

### Be Specific

Vague rules get vague results. "Follow good CSS practices" doesn't tell Claude much—it probably already tries to do that. But "Use Tailwind CSS classes, never inline styles" is actionable. Claude knows exactly what to do.

The same applies to conventions. "Use consistent naming" is too abstract. "Use camelCase for variables, PascalCase for components, SCREAMING_SNAKE for constants" gives Claude clear guidance.

### Show, Don't Just Tell

Examples are powerful. If you want API responses in a specific format, show the format:

\`\`\`markdown
## API Response Format

Return responses like this:
\\\`\\\`\\\`json
{
  "success": true,
  "data": { ... },
  "error": null
}
\\\`\\\`\\\`
\`\`\`

Claude can read descriptions, but concrete examples leave no room for interpretation.

### Tell Claude What TO Do

"Don't use console.log" tells Claude what to avoid, but not what to do instead. "Use the logger from src/utils/logger.ts for all logging" is better—now Claude knows the alternative.

When you find yourself writing a rule about what NOT to do, add a sentence about what TO do instead.

### Keep Rules Updated

Rules should evolve with your project. When you change a convention, update the rules. When you add a new pattern, document it. Outdated rules confuse Claude more than no rules at all.

### Don't Over-Specify

Claude is smart. You don't need to specify obvious things or standard best practices. Focus your rules on things that are unique to your project—your specific conventions, patterns that aren't obvious from the code, requirements that deviate from the norm.

If you find yourself writing a very long rules file, consider whether everything in it is truly specific to your project or just general good practice Claude already knows.
    `
  },
};
