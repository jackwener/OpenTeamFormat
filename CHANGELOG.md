# Changelog

All notable changes to OpenTeamFormat will be documented in this file.

The format follows explicit `apiVersion` values in manifests. The current draft uses `openteamformat.org/v1alpha1`.

## 0.1.0 - 2026-07-01

- Added the initial OpenTeamFormat draft.
- Defined the base `OpenAgent` package layout.
- Added a product squad example with product manager, frontend engineer, backend engineer, and channel membership.
- Documented `notes/` as optional package content.
- Documented `OpenTeam.spec.agents[].description` and added descriptions to the team example.
- Switched `OpenTeam.spec.agents[]` references from `id` to `name`.
- Removed separate `id` fields from `OpenTeam.spec.channels[]`; channels are identified by `name`.
- Added Apache-2.0 licensing.
- Added JSON Schemas for `OpenAgent` and `OpenTeam`.
- Added valid and invalid fixtures for agent and team manifests.
- Added a JavaScript validator for schema checks and repository semantic checks.
- Removed `OpenAgent.spec.notes`; `notes/` is optional package content and is not declared in `agent.yaml`.
