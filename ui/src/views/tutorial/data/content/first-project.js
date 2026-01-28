export const firstProjectContent = {
  'adding-project': {
    title: 'Adding a Project',
    content: `
In Coder Config, a "project" is just a folder on your computer—usually one containing code. It might be a git repository, a single app, or any directory where you do development work.

### Finding the Add Project Button

Look at the top of the screen. There's a dropdown showing your current project (or "No project selected" if you're starting fresh). Click it, then click **Add Project**. Alternatively, go to **All Projects** in the sidebar and use the **Add Project** button there.

Either way, you'll be asked to enter a path. Type the full path to your project folder—something like \`/Users/yourname/code/my-app\` on Mac or \`C:\\Projects\\my-app\` on Windows. The folder needs to exist already; Coder Config won't create it for you.

### What Happens When You Add a Project

Once you add a project, several things become possible. The project appears in your quick-switch dropdown so you can jump between projects without hunting through folders. Coder Config watches for a \`.claude\` folder inside that project, and if one exists, it loads the configuration automatically. When you use Claude Code in that directory, your rules and settings apply.

You can add as many projects as you want. They're stored in Coder Config's registry, and you can remove them later without affecting the actual files on disk.

### A Note on Git Repositories

While your project doesn't have to be a git repo, it helps. Git repos have natural boundaries, and most developers already organize their work this way. If you're working on a monorepo, you might add the root as one project, or add individual packages as separate projects—whatever makes sense for how you work.

Try adding a project now. Pick something you're actively working on, then move to the next section.
    `
  },
  'exploring-project': {
    title: 'Exploring Your Project',
    content: `
With a project added, let's look at what you can do with it.

### The Project Explorer

Click **Project Explorer** in the sidebar. This is your window into your project's Claude configuration. If the project has a \`.claude\` folder, you'll see its contents laid out as a file tree. If there's no \`.claude\` folder yet, you'll see a prompt to create one.

The explorer shows the files Claude cares about: rules in the \`rules/\` folder, custom commands in \`commands/\`, MCP configurations, and local settings. You can click any file to view or edit it right in the browser. Right-click for more options—rename, duplicate, delete.

### Project Information

Above the file tree, there's a summary panel. It shows the project's name, its path, and quick stats like how many rules you have configured. You'll also find buttons to open the project in VS Code or jump to it in your terminal.

### When There's No .claude Folder

New projects don't have Claude configuration yet. That's fine. The Project Explorer will offer to initialize one for you, creating the basic folder structure. Or you can create it manually—it's just folders and files, nothing special about them.

### Editing Configuration Files

The built-in editor handles the file formats Claude uses: markdown for rules, JSON for MCP configs and settings. Changes save automatically when you navigate away, though you can also save explicitly. The editor is simple by design—for complex editing, use the "Open in VS Code" button.

Let's create the \`.claude\` folder in the next section, then start writing rules.
    `
  },
  'claude-folder': {
    title: 'The .claude Folder',
    content: `
The \`.claude\` folder is where your project's Claude configuration lives. Everything Claude needs to know about your project—how you want it to behave, what tools it can use, what patterns to follow—goes here.

### Creating the Folder

If your project doesn't have a \`.claude\` folder yet, go to Project Explorer and click **Initialize .claude**. This creates the folder with a basic structure:

\`\`\`
.claude/
├── rules/           # Markdown files with guidelines
├── commands/        # Reusable prompt templates
├── settings.local.json  # Project-specific settings
└── mcps.json        # MCP server configurations
\`\`\`

You can also create this manually if you prefer—it's just regular folders and files.

### What Each Piece Does

The \`rules/\` folder contains markdown files that tell Claude about your project. These are instructions, conventions, things to avoid—any guidance you'd give a new team member. Claude reads them at the start of every session.

The \`commands/\` folder holds reusable prompts. If you find yourself typing the same instructions over and over, turn them into a command.

The \`settings.local.json\` file stores project-specific settings that override global defaults. And \`mcps.json\` defines which MCP servers this project uses.

### The CLAUDE.md Alternative

There's another option: create a \`CLAUDE.md\` file in your project root (not inside \`.claude/\`). Claude reads this automatically too. Some developers prefer this because it's more visible—right there at the top level where everyone can see it.

You can use both. The \`CLAUDE.md\` file works well for high-level project context, while the \`.claude/rules/\` folder suits more detailed, categorized guidelines.

### Should You Commit It?

Generally, yes. Committing your \`.claude\` folder means everyone on your team gets the same Claude experience. The one exception is \`settings.local.json\`—that's for personal preferences and should probably stay in your \`.gitignore\`.

Now that you have the structure in place, let's learn about rules—the most powerful way to configure Claude for your project.
    `
  },
};
