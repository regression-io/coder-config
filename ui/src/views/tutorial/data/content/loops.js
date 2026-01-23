export const loopsContent = {
  'what-are-loops': {
    title: 'What Are Ralph Loops?',
    content: `
## Ralph Loops: Autonomous Development

Ever wished Claude could just... keep going until a task is done?

That's exactly what **Ralph Loops** do.

### The Old Way

\`\`\`
You: "Add user authentication"
Claude: *makes some progress* "I've started the auth module..."
You: "Continue"
Claude: *more progress* "Added the login endpoint..."
You: "Keep going"
Claude: *even more* "JWT tokens are set up..."
You: "Finish it"
...repeat 10 more times...
\`\`\`

### The Ralph Loop Way

\`\`\`
You: Create a loop "Add user authentication"
Claude: *asks clarifying questions*
Claude: *creates implementation plan*
You: "Looks good, approve"
Claude: *implements everything autonomously*
Claude: "Done! Authentication system complete."
\`\`\`

### Three Phases

1. **Clarify** - Claude asks questions to understand requirements
2. **Plan** - Claude creates a detailed implementation plan
3. **Execute** - Claude implements the plan, iteration by iteration

### Safety Built In

- **Iteration limits** prevent runaway loops (default: 50)
- **Cost budgets** cap spending (default: $10)
- **Plan approval** lets you review before execution
- **Pause anytime** and resume later
    `
  },
  'creating-first-loop': {
    title: 'Creating Your First Loop',
    content: `
## Let's Create a Loop!

### Step 1: Open Ralph Loops

Click **Ralph Loops** in the sidebar (under Tools).

### Step 2: Click New Loop

You'll see a dialog asking for a task description.

### Step 3: Describe Your Task

Be specific! Good examples:

- "Add a dark mode toggle to the settings page"
- "Create unit tests for the UserService class"
- "Refactor the payment module to use async/await"

Not as helpful:
- "Fix bugs" (which ones?)
- "Make it better" (how?)

### Step 4: Create the Loop

Click **Create Loop**. You'll see it in the list with status "pending".

### Step 5: Start the Loop

Click the **play button** or run:

\`\`\`bash
coder-config loop start <loop-id>
\`\`\`

### Step 6: Run with Claude

The UI shows you the command to run:

\`\`\`bash
export CODER_LOOP_ID=<loop-id>
claude --continue "Your task description"
\`\`\`

### What Happens Next

1. Claude enters **Clarify** phase, asking questions
2. Once clear, moves to **Plan** phase
3. You **approve** the plan
4. Claude enters **Execute** phase
5. Loop continues until task is complete!

### Pro Tip

Watch the progress bars! They show:
- **Iterations** - How many rounds completed
- **Budget** - Estimated cost so far
    `
  },
};
