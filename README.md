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

`notes/` is optional package content, but it is not declared in `agent.yaml`. `OpenAgent.spec` does not include a `notes` field; importers should treat the directory as optional context when it exists.

In an `OpenTeam` manifest, each `spec.agents[]` reference uses `name`, not a separate `id`. The `name` should match the referenced `OpenAgent.metadata.name`. Agent references should include a short `description` alongside `name` and `path`; this keeps the team-level composition understandable without opening every agent package.

In an `OpenTeam` manifest, each `spec.channels[]` entry also uses `name`, not a separate `id`. Membership references such as `agent:product-manager` resolve against agent names.

Importers should treat manifests as declarative input and should produce an import mapping after creation instead of writing environment-specific IDs back into the package.

## Schema and Validation

Machine-checkable JSON Schemas live in `schemas/`:

- `schemas/open-agent.schema.json`
- `schemas/open-team.schema.json`

Fixtures live in `fixtures/`:

- `fixtures/valid/` contains packages and manifests that must pass validation.
- `fixtures/invalid/` contains intentionally broken packages that must fail validation.

Run validation with:

```sh
npm install
npm test
```

The validator checks both schema shape and repository semantics:

- YAML manifests parse successfully.
- `OpenAgent` instruction, skill, and runtime adapter paths resolve.
- `OpenAgent.spec` does not include `notes`; `notes/` is optional package content outside the manifest.
- `OpenTeam.spec.agents[]` uses `name`, not `id`.
- `OpenTeam.spec.agents[]` includes `description`.
- `OpenTeam.spec.channels[]` uses `name`, not `id`.
- Channel members and initial message authors resolve to declared agent names.
- Team agent references point to existing OpenAgent manifests whose `metadata.name` matches the reference name.

## License

OpenTeamFormat is licensed under the Apache License 2.0. See `LICENSE`.
