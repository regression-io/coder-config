export const memoryContent = {
  'what-is-memory': {
    title: 'What is Memory?',
    content: `
Memory lets Claude **remember things** across conversations. Instead of repeating yourself, teach Claude once and it remembers.

### Types of Memory

**Global Memory** (applies everywhere)
- Your preferences ("I prefer tabs over spaces")
- Corrections ("When I say 'deploy', I mean to staging")
- Facts about you ("I work on a Mac M2")

**Project Memory** (applies to one project)
- Project context ("This is a React 18 app")
- Code patterns ("We use React Query for data fetching")
- Architecture decisions ("We chose PostgreSQL because...")
- Known issues ("The auth service is flaky on Mondays")

### How It Works

Memory is stored in markdown files:
- Global: \`~/.claude/memory/\`
- Project: \`your-project/.claude/memory/\`

Claude reads these automatically when you start a conversation.

### Example Memory Entry

\`\`\`markdown
## Preference: Testing
- Always run tests before committing
- Use Jest for unit tests, Playwright for e2e
- Learned: 2024-01-15
\`\`\`
    `
  },
  'using-memory': {
    title: 'Using Memory',
    content: `
Let's add some memory entries to make Claude smarter about your work.

![Memory View](/tutorial/memory-view.png)

### Accessing Memory

1. Click **"Memory"** in the sidebar
2. Choose **Global** or **Project** tab
3. Browse existing entries or add new ones

### Adding Memory

Click **"Add Entry"** and choose a type:

- **Preference** - How you like things done
- **Correction** - Fix a mistake Claude makes
- **Fact** - Something Claude should know
- **Pattern** - Code patterns in your project
- **Decision** - Why you chose a certain approach

### Example: Adding a Preference

\`\`\`
Type: Preference
Title: Code Style
Content: I prefer functional components with hooks.
         Never use class components.
\`\`\`

### Example: Adding a Correction

\`\`\`
Type: Correction
What you did wrong: Used console.log for debugging
What to do instead: Use the logger at src/utils/logger.ts
\`\`\`

### Tips

- Be specific - vague memory isn't helpful
- Update memory when things change
- Delete outdated entries
- Use project memory for project-specific stuff
    `
  },
};
