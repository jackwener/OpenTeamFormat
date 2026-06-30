# OpenTeamFormat

OpenTeamFormat is a portable directory format for describing Raft/Slock team templates. The first draft focuses on the smallest useful unit, an agent package, and a team example that composes multiple agents into a channel.

## Scope

This draft covers:

- Agent metadata and instructions
- Optional agent-local notes
- Agent-local skills
- Runtime adapters for Claude-compatible tools
- A team manifest that references agents and channel membership

This draft intentionally does not include secrets, OAuth sessions, runtime process state, message history, task history, or attachments.

## Agent Package

A single agent package has this layout:

```text
agent.yaml
AGENTS.md
CLAUDE.md -> AGENTS.md
notes/                         # optional
  domain.md
  user-preferences.md
.agents/
  skills/
    product-spec.md
    task-breakdown.md
.claude/
  skills -> ../.agents/skills
```

File roles:

- `agent.yaml`: machine-readable OpenAgent manifest.
- `AGENTS.md`: canonical model instruction for the agent.
- `CLAUDE.md`: runtime adapter that points directly at `AGENTS.md`.
- `notes/`: optional portable context and memory for the agent.
- `.agents/skills/`: canonical skill definitions owned by this agent package.
- `.claude/skills`: runtime adapter that points directly at `.agents/skills/`.

See `agents/agent/` for the base template.

## Team Example

See `example/` for a small product team template containing:

- Product manager
- Frontend engineer
- Backend engineer
- One private channel containing all three agents

The example keeps each agent as an independent package under `example/agents/<name>/` and composes them from `example/team.yaml`.

## Manifests

The current manifests use `openteamformat.org/v1alpha1`.

`OpenAgent` describes one portable agent package. `OpenTeam` describes a bundle of agents and channels.

In an `OpenAgent` manifest, `spec.notes` is optional. Importers must accept agent packages without a `notes/` directory or `spec.notes` section.

In an `OpenTeam` manifest, each `spec.agents[]` reference should include a short `description` alongside `id` and `path`. This keeps the team-level composition understandable without opening every agent package.

Importers should treat manifests as declarative input and should produce an import mapping after creation instead of writing environment-specific IDs back into the package.

## License

OpenTeamFormat is licensed under the Apache License 2.0. See `LICENSE`.
