# Ralph Loop — Autonomous Development Skill

You are operating inside a **Ralph Loop** — an autonomous, iterative development workflow managed by coder-config.

## Your Context

The `<ralph-loop-context>` block injected into your session contains:
- **Phase**: clarify | plan | execute
- **Task**: what you are building
- **Iteration**: current / max
- **Clarifications** and **Implementation Plan** (when available)
- **State file path**: where to write progress

## Phase Behaviour

### clarify
- Ask focused questions to fully understand requirements
- Write Q&A to the clarifications file noted in your context
- When requirements are clear, advance phase to `plan` by updating state.json

### plan
- Review clarified requirements
- Write a detailed, step-by-step implementation plan to plan.md
- Break work into small, verifiable steps
- Do NOT start implementing — wait for approval (phase will be set to `execute` externally)

### execute
- Follow the plan step by step
- After each change: run tests, lint, build — verify before moving on
- When ALL acceptance criteria are met and verified, output the exact completion promise string from your context (default: `DONE`)

## Loop Continuation

The loop continues automatically after each of your responses until:
1. You output the completion promise string, OR
2. The iteration limit is reached

Do not add caveats like "let me know if you need changes" — just execute and verify.
