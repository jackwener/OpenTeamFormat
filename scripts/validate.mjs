#!/usr/bin/env node

import Ajv2020 from "ajv/dist/2020.js";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import YAML from "yaml";

const root = process.cwd();
const schemaDir = path.join(root, "schemas");
const openAgentSchema = readJson(path.join(schemaDir, "open-agent.schema.json"));
const openTeamSchema = readJson(path.join(schemaDir, "open-team.schema.json"));

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateOpenAgentSchema = ajv.compile(openAgentSchema);
const validateOpenTeamSchema = ajv.compile(openTeamSchema);

const checks = [
  { label: "template agent", file: "agents/agent/agent.yaml", expected: "valid" },
  { label: "example team", file: "example/team.yaml", expected: "valid" },
  { label: "minimal agent fixture", file: "fixtures/valid/minimal-agent/agent.yaml", expected: "valid" },
  { label: "product squad fixture", file: "fixtures/valid/product-squad/team.yaml", expected: "valid" },
  { label: "agent reference uses id", file: "fixtures/invalid/team-agent-has-id/team.yaml", expected: "invalid" },
  { label: "channel uses id", file: "fixtures/invalid/channel-has-id/team.yaml", expected: "invalid" },
  { label: "agent reference missing description", file: "fixtures/invalid/agent-missing-description/team.yaml", expected: "invalid" },
  { label: "notes file missing", file: "fixtures/invalid/notes-file-missing/agent.yaml", expected: "invalid" }
];

let failures = 0;

for (const check of checks) {
  const result = validateManifest(path.join(root, check.file));
  const passed = check.expected === "valid" ? result.ok : !result.ok;

  if (passed) {
    const suffix = result.ok ? "" : ` (${result.errors[0]})`;
    console.log(`ok ${check.label}${suffix}`);
    continue;
  }

  failures += 1;
  const expected = check.expected === "valid" ? "valid" : "invalid";
  const actual = result.ok ? "valid" : "invalid";
  console.error(`not ok ${check.label}: expected ${expected}, got ${actual}`);
  for (const error of result.errors) {
    console.error(`  - ${error}`);
  }
}

if (failures > 0) {
  process.exitCode = 1;
}

function validateManifest(file) {
  const errors = [];
  const parsed = readYaml(file, errors);

  if (!parsed) {
    return { ok: false, errors };
  }

  const baseDir = path.dirname(file);

  if (parsed.kind === "OpenAgent") {
    validateSchema(validateOpenAgentSchema, parsed, file, errors);
    validateOpenAgent(parsed, baseDir, errors);
  } else if (parsed.kind === "OpenTeam") {
    validateSchema(validateOpenTeamSchema, parsed, file, errors);
    validateOpenTeam(parsed, baseDir, errors);
  } else {
    errors.push(`${relative(file)}: unsupported kind ${JSON.stringify(parsed.kind)}`);
  }

  return { ok: errors.length === 0, errors };
}

function validateSchema(validate, data, file, errors) {
  if (validate(data)) {
    return;
  }

  for (const error of validate.errors ?? []) {
    const location = error.instancePath || "/";
    errors.push(`${relative(file)}${location}: ${error.message}`);
  }
}

function validateOpenAgent(agent, baseDir, errors) {
  const spec = agent.spec ?? {};

  if (spec.instruction?.file) {
    assertPathExists(baseDir, spec.instruction.file, errors, "instruction file");
  }

  const claude = spec.runtimeAdapters?.claude;
  if (claude?.instructionFile) {
    assertPathExists(baseDir, claude.instructionFile, errors, "Claude instruction adapter");
  }
  if (claude?.skillsDir) {
    assertPathExists(baseDir, claude.skillsDir, errors, "Claude skills adapter");
  }

  if (spec.skills?.dir) {
    assertPathExists(baseDir, spec.skills.dir, errors, "skills directory");
  }
  validateResourceItems(baseDir, spec.skills?.items, errors, "skill");

  if (spec.notes) {
    if (spec.notes.dir) {
      assertPathExists(baseDir, spec.notes.dir, errors, "notes directory");
    }
    validateResourceItems(baseDir, spec.notes.items, errors, "note");
  }
}

function validateResourceItems(baseDir, items, errors, label) {
  if (!Array.isArray(items)) {
    return;
  }

  const ids = new Set();
  for (const item of items) {
    if (typeof item?.id === "string") {
      if (ids.has(item.id)) {
        errors.push(`duplicate ${label} id ${JSON.stringify(item.id)}`);
      }
      ids.add(item.id);
    }
    if (typeof item?.file === "string") {
      assertPathExists(baseDir, item.file, errors, `${label} file`);
    }
  }
}

function validateOpenTeam(team, baseDir, errors) {
  const spec = team.spec ?? {};
  const agents = Array.isArray(spec.agents) ? spec.agents : [];
  const channels = Array.isArray(spec.channels) ? spec.channels : [];
  const agentNames = new Set();

  for (const agent of agents) {
    if (typeof agent?.name === "string") {
      if (agentNames.has(agent.name)) {
        errors.push(`duplicate agent name ${JSON.stringify(agent.name)}`);
      }
      agentNames.add(agent.name);
    }

    if (typeof agent?.path === "string") {
      const agentPath = path.join(baseDir, agent.path);
      assertPathExists(baseDir, agent.path, errors, "agent manifest");
      const parsedAgent = readYaml(agentPath, errors);
      if (parsedAgent?.kind === "OpenAgent" && parsedAgent.metadata?.name !== agent.name) {
        errors.push(`${relative(agentPath)}: metadata.name must match team agent name ${JSON.stringify(agent.name)}`);
      }
      if (parsedAgent?.kind === "OpenAgent") {
        validateOpenAgent(parsedAgent, path.dirname(agentPath), errors);
      }
    }
  }

  const channelNames = new Set();
  for (const channel of channels) {
    if (typeof channel?.name === "string") {
      if (channelNames.has(channel.name)) {
        errors.push(`duplicate channel name ${JSON.stringify(channel.name)}`);
      }
      channelNames.add(channel.name);
    }

    for (const member of channel?.members ?? []) {
      validateAgentRef(member?.ref, agentNames, errors, "channel member");
    }

    for (const message of channel?.initialMessages ?? []) {
      validateAgentRef(message?.author, agentNames, errors, "initial message author");
    }
  }
}

function validateAgentRef(ref, agentNames, errors, label) {
  if (typeof ref !== "string" || !ref.startsWith("agent:")) {
    return;
  }

  const name = ref.slice("agent:".length);
  if (!agentNames.has(name)) {
    errors.push(`${label} references unknown agent ${JSON.stringify(ref)}`);
  }
}

function assertPathExists(baseDir, target, errors, label) {
  const resolved = path.join(baseDir, target);
  if (!fs.existsSync(resolved)) {
    errors.push(`${label} not found: ${relative(resolved)}`);
  }
}

function readYaml(file, errors) {
  try {
    return YAML.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    errors.push(`${relative(file)}: ${error.message}`);
    return null;
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function relative(file) {
  return path.relative(root, file) || ".";
}
