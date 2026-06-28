---
name: proof-driven-development
description: Use when a task must produce, review, or curate proof before it can be considered complete.
---

# Proof-Driven Development

Version: 0.1.0

## Contract

- Completion requires evidence, not a summary.
- Read the task brief, capability, DoD, proof/schema references, and validation
  evidence requirements before editing or reviewing.
- Record every validation command with command text, exit code, and summary.
- Treat missing validation as blocked unless the task brief explicitly allows it.
- Treat failed validation as failed, not completed.
- Memory updates are proposals only and require evidence refs.

## Outcome

- completed: DoD met and proof validates against the referenced schema.
- failed: DoD unmet, validation failed, or proof contradicts artifacts.
- blocked: required input, permission, schema, artifact, or validation evidence is
  missing.
