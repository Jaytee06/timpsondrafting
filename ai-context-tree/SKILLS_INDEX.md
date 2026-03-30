# Skills Index

## Node Type

Global tools and authority guide.

## Purpose

This file lists the skills, tools, and decision boundaries available to agents operating in this context tree.

## Repo-Local Reality

This repo is primarily a small frontend project with supporting documentation and a possible legacy backend. For most tasks, agents will use:

- repo inspection,
- code editing,
- lightweight validation,
- documentation updates,
- process reasoning.

## Default Capabilities

### Global

Allowed:

- read system docs,
- inspect code paths,
- update process docs,
- update system runbooks,
- modify frontend code when the task requires implementation,
- inspect the `backend/` folder for reference behavior.

Use caution:

- changing CRM field names,
- changing auth or permission assumptions,
- modifying conversion tracking,
- changing consent language,
- altering lead qualification logic without updating state docs.

### Communications

Allowed:

- interpret lead data,
- decide the correct branch for follow-up,
- choose email or text routing based on available information and consent,
- update templates and decision docs within the local subtree.

Escalate if:

- a change impacts compliance,
- a change alters shared entity definitions,
- a change affects cross-channel routing rules.

## Available Session Skills

The broader Codex session may provide named skills through `AGENTS.md`. Those skills are external to this tree and should be invoked only when the current task clearly matches them.

This context tree does not require custom external skills to function. It is designed to be useful even without them.

## Decision Pattern

At any node, an agent should ask:

1. Is the requested action fully local to this node?
2. Does the node define enough inputs and authority to decide?
3. Would acting here create contradictions for siblings or parents?

If the answer to 1 and 2 is yes, stay local.

If more specificity is needed, descend.

If the action would change shared contracts, escalate upward.

## Guidance On Skills Vs Runbooks

Use a runbook in `systems/` when the agent needs human-equivalent UI instructions such as:

- which URL to open
- which screen to navigate to
- which button or field to use
- how to complete a CRM action step by step

For CRM qualification work, prefer browser navigation and browser interfacing skills first.

Do not assume the agent should start or manage infrastructure as part of normal CRM work. The default assumption is that the browser should be pointed at `app.timpsondrafting.com` and the task should be completed through the UI.

Likely reusable CRM skills include:

- field inspection: identify which entity fields exist, which are qualification-relevant, and which are marketing-only context
- qualification field review: confirm core fields such as project type, description, contact method, timeline, and location before choosing a branch
- activity and communication history review: inspect the entity history controls near the bottom of the record, switch between available history types, and expand entries to read full context

Use a skill when the workflow is repetitive, fragile, or benefits from reusable bundled instructions or scripts.

A future CRM skill would likely use `systems/crm/` as its primary reference subtree once the UI details are fully documented and stable.
