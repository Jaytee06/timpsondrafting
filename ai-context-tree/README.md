# Agent Context Tree

This repository now includes a top-level context-routing filesystem for agents.

The purpose of this tree is twofold:

- It is human-readable documentation for the lead intake system behind the Timpson Drafting landing page.
- It is machine-ingestible context structure so an agent can be dropped into a subtree and quickly determine scope, authority, inputs, actions, and escalation paths.

## Node Type

Root context node.

## How To Read This Tree

- Start with [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md) for the global map.
- Read [STATE_MACHINE.md](STATE_MACHINE.md) for the lead lifecycle.
- Read [SKILLS_INDEX.md](SKILLS_INDEX.md) for available skills, tools, and escalation rules.
- Descend into `entities/` when you need domain definitions.
- Descend into `processes/` when you need workflow rules.
- Descend into `systems/` when you need browser or software operation runbooks.
- Descend into `agent_roles/` when you need role-specific operating guidance.

Authentication and permission concepts should usually begin in `entities/system_user.md` and `systems/crm/auth_and_permissions.md`.

## Contract Pattern

Every folder in this tree is a domain node. Each node should define:

- where the agent is,
- what that node owns,
- what inputs are valid there,
- what decisions are allowed locally,
- what tools or skills are appropriate,
- what child branches narrow scope further,
- when to stay local, descend, or escalate.

## System Context

This tree is currently grounded in a small lead-generation system:

- a landing page frontend,
- lightweight Google Analytics and Google Ads attribution capture,
- a lead form with validation and anti-spam behavior,
- submission into a custom CRM webhook,
- optional legacy/serverless backend email-processing context.

The system docs here are intentionally operational. They are not general theory docs. They are meant to help an agent act correctly inside this repo and adjacent intake workflows.

For CRM qualification tasks, the agent should operate the CRM through browser navigation and UI interaction. Do not start or manage a development server unless a task explicitly says to do that.

## Local Visualization

To open a standalone graph window for this tree without running the main app:

`python ai-context-tree/visualize_tree.py`

The viewer scans the `ai-context-tree/` directory directly, draws filesystem links plus markdown-reference links, and opens its own Tkinter window.
