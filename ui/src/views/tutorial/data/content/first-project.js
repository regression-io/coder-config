export const firstProjectContent = {
  'adding-project': {
    title: 'Adding a Project',
    content: `
## Adding Your First Project

A "project" in Claude Config is simply a directory on your computer - usually a git repository or a folder containing code.

### How to Add a Project

![All Projects View](/tutorial/projects-view.png)

**Option 1: From the Header**
1. Look at the top of the screen - you'll see a project dropdown
2. Click it and select **"Add Project"**
3. Enter the path to your project folder

**Option 2: From All Projects**
1. Click **"All Projects"** in the sidebar
2. Click the **"Add Project"** button
3. Enter the path (e.g., \`/Users/you/code/my-app\`)

### Tips

- Use **absolute paths** (starting with \`/\` on Mac/Linux or \`C:\\\` on Windows)
- The folder should ideally be a **git repository** (but doesn't have to be)
- You can add as many projects as you like

### What Happens Next?

Once you add a project:
- It appears in your project dropdown for quick switching
- You can create a \`.claude\` folder with configuration
- Rules and settings will apply when you work in that project with Claude

Try adding a project now, then continue to the next section!
    `
  },
  'exploring-project': {
    title: 'Exploring Your Project',
    content: `
## Exploring Your Project

Now that you've added a project, let's explore what you can do with it.

### The Project Explorer

Click **"Project Explorer"** in the sidebar. This shows you the configuration files inside your project's \`.claude\` folder.

![Project Explorer](/tutorial/project-explorer.png)

If you see "No .claude folder found", that's okay! We'll create one in the next section.

### What's in the Project Explorer?

The explorer shows a file tree with:
- **rules/** - Markdown files with guidelines for Claude
- **commands/** - Reusable prompts you can invoke
- **settings.local.json** - Project-specific settings
- **mcps.json** - MCP server configurations

### Creating and Editing Files

You can:
- **Click a file** to view/edit it
- **Right-click** for options like rename, delete, duplicate
- **Click the + button** to create new files

### The Info Panel

At the top, you'll see project info:
- Project name and path
- Quick stats (number of rules, commands, etc.)
- Buttons to open in VS Code or terminal

Let's create the .claude folder next!
    `
  },
  'claude-folder': {
    title: 'The .claude Folder',
    content: `
## The .claude Folder

The \`.claude\` folder is where all your project's Claude configuration lives. Think of it as Claude's "instruction manual" for your project.

### Creating the Folder

If your project doesn't have a \`.claude\` folder yet:

1. Go to **Project Explorer**
2. Click the **"Initialize .claude"** button (or create the folder manually)
3. A basic structure will be created for you

### What Goes Inside?

\`\`\`
.claude/
├── rules/           # Guidelines for Claude
│   └── README.md    # Project overview
├── commands/        # Reusable prompts
├── settings.local.json  # Local settings
└── mcps.json        # MCP configurations
\`\`\`

### Why Use a .claude Folder?

- **Context**: Claude reads these files to understand your project
- **Consistency**: Same rules apply every time you use Claude
- **Sharing**: Commit to git so your team has the same setup
- **Organization**: Keep Claude config separate from your code

### Pro Tip

You can also create a \`CLAUDE.md\` file in your project root. Claude reads this automatically for high-level project context.

Next, let's learn about rules - the most powerful part of Claude Config!
    `
  },
};
