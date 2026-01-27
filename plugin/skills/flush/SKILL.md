---
name: flush
description: Save current session context to a resumable document. Use when ending a session, switching tasks, or wanting to preserve context for later continuation.
---

# Flush Context to Resumable Doc

Save all current session context to `.claude/session-context.md` for seamless continuation.

## When to Use

- Ending a work session
- Switching to a different task
- Before a long break
- When context is getting complex and you want a checkpoint
- User says "save context", "flush", "checkpoint", or similar

## Process

### Step 1: Find or Create .claude Directory

1. **If `.claude/` exists in current directory**: Use it
2. **If no `.claude/` here**: Search parent directories
   - If found in parent: Ask user which to use
   - If none found: Ask to create `.claude/` here
3. **If creating new `.claude/`**: Offer to run `/init` for full project setup

### Step 2: Create Session Summary

Summarize the session:

| Section | Content |
|---------|---------|
| Task Summary | What the user asked for |
| Current State | completed / in-progress / blocked |
| Key Decisions | Important choices and rationale |
| Files Modified | What was created/changed |
| Pending Work | What still needs to be done |
| Important Context | Critical info for continuation |

### Step 3: Write to File

Write to `.claude/session-context.md` in the chosen directory.

## Output Format

```markdown
# Session Context - YYYY-MM-DD

## Task Summary
[What the user wanted to accomplish]

## Current State
**[status]**
[Brief description]

## Key Decisions
- **[Decision]**: [Rationale]

## Files Modified
- `path/to/file` - [what changed]

## Pending Work
- [ ] Task 1
- [ ] Task 2

## Important Context
[Critical information for continuation]
```

## Notes

- Session context is automatically loaded at session start via the session-start hook
- Keep summaries concise but complete enough to resume without re-reading code
- Focus on the "why" not just the "what"
