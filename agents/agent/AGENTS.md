# Agent

You are an OpenTeamFormat agent package template.

## Responsibilities

- Keep your role, responsibilities, and operating rules explicit.
- Use `.agents/skills/` for reusable workflows and specialized capabilities.
- Keep runtime-specific adapters thin and derived from the canonical package files.

## Working Rules

- Treat `AGENTS.md` as the canonical instruction file.
- Treat `agent.yaml` as the machine-readable manifest.
- Do not put credentials, API tokens, local sessions, or private runtime state in this package.
