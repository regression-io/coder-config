export const loopsContent = {
  'what-are-loops': {
    title: 'What Are Ralph Loops?',
    content: `
> **Experimental Feature:** Ralph Loops must be enabled in **Preferences → Experimental Features** before use.

Ralph Loops let Claude work autonomously on larger tasks. Instead of the usual back-and-forth where you give Claude an instruction, it does some work, and you say "continue" over and over, loops let Claude keep going until the task is done.

### The Problem with Long Tasks

Normally, working with Claude on substantial tasks feels like pushing a boulder uphill. You ask for a feature, Claude makes progress, hits a natural stopping point, and waits. You say "keep going." It continues, stops again. "Continue." More progress. "Don't stop." This can go on for a while.

The overhead isn't just the typing. Each round trip breaks your flow. You're either watching Claude work, or you come back to find it waiting for permission to continue.

### What Loops Change

With a Ralph Loop, you describe the task once. Claude asks clarifying questions to make sure it understands. Then it drafts a plan. You review and approve the plan. Claude executes, iteration after iteration, until the task is complete. You can walk away and come back to finished work.

### The Three Phases

**Clarify** — Claude asks questions about requirements, scope, and preferences. This happens at the start. Better to surface ambiguities now than discover them mid-implementation.

**Plan** — Claude creates a detailed implementation plan. You see exactly what it intends to do before any code changes. Approve to proceed, or revise the plan first.

**Execute** — Claude works through the plan, step by step. Each iteration makes progress. The loop continues automatically until the task is done or a limit is reached.

### Built-in Safety

Autonomous execution raises valid concerns. What if Claude goes off track? What if it runs up a huge bill? What if it breaks something?

Loops have guardrails. **Iteration limits** cap how many rounds Claude can run (default: 50). **Cost budgets** cap spending (default: $10). You can **pause anytime** and resume later. The **plan approval** step ensures you know what's coming before execution begins.

These aren't just safeguards—they're part of the workflow. You stay in control of scope and cost while still getting the benefits of autonomous execution.
    `
  },
  'creating-first-loop': {
    title: 'Creating Your First Loop',
    content: `
Let's create a loop to see how autonomous development works.

### Step 0: Enable the Feature

Loops are experimental. Go to **Preferences → Experimental Features** and enable **Ralph Loops**. Once enabled, you'll see "Ralph Loops" appear in the sidebar under Developer.

### Step 1: Open Ralph Loops

Click **Ralph Loops** in the sidebar. You'll see a list of loops (empty if this is your first) and a button to create a new one.

### Step 2: Describe Your Task

Click **New Loop**. A dialog asks for a task description. This is your chance to explain what you want Claude to accomplish.

Be specific. Good task descriptions:
- "Add a dark mode toggle to the settings page. Store preference in localStorage. Respect system preference by default."
- "Create unit tests for the UserService class. Cover all public methods. Use Jest."
- "Refactor the payment module to use async/await instead of callbacks. Update all calling code."

Vague descriptions lead to vague results:
- "Fix bugs" — Which bugs?
- "Make it better" — Better how?

### Step 3: Create and Start

Click **Create Loop**. The loop appears in your list with status "pending." Click the play button to start it, or note the command shown in the UI to start it from your terminal.

### Step 4: Run Through the Phases

Once started, the loop enters the **Clarify** phase. Claude might ask questions: "Should dark mode affect the entire app or just the settings page?" Answer these to help Claude understand your requirements fully.

After clarification, Claude moves to **Plan**. You'll see a detailed breakdown of what it intends to do. Review this carefully. If something looks wrong, revise the plan. If it looks good, approve it.

With plan approved, Claude enters **Execute**. Watch the progress indicators showing iterations completed and budget used. Claude works through the plan, making real changes to your codebase.

### Monitoring Progress

The UI shows real-time status. You can see which iteration Claude is on, what it's currently doing, and how much of the budget it's consumed. If something goes wrong, you can pause the loop immediately.

When the task completes, Claude reports what it accomplished. Review the changes, run your tests, and verify everything works as expected.

### When to Use Loops

Loops work best for well-defined tasks that take significant effort but don't require constant human judgment. Feature implementations, test coverage, refactoring, migration work—things where the goal is clear but the execution is tedious.

For exploratory work where you're not sure what you want yet, the normal interactive mode might serve you better. Loops shine when you know the destination; they handle the journey.
    `
  },
};
