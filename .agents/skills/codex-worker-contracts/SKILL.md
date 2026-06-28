---
name: codex-worker-contracts
description: Use when writing schemas, prompts, tests, or task briefs for Codex worker execution.
---

# Codex Worker Contracts

Version: 0.1.0

## Contract

- Worker prompts must require task brief, capability, DoD, proof/schema
  references, validation evidence, allowed paths, forbidden paths, and output
  schema.
- Runtime owns task state, permissions, worktree creation, approvals, and
  external actions.
- Prompt text is not permission enforcement.
- Use one worker role per task: analyst, repo patch worker, verifier, proof
  verifier, or memory curator.
- Do not hide broad rules in long prompts; put reusable workflow rules in skills.

## Required Status Model

- completed: DoD met and proof/validation evidence supports review.
- failed: worker attempted the task but validation or DoD failed.
- blocked: worker cannot safely continue with the supplied inputs or permissions.
