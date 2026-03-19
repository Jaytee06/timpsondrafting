# Lead Intake Workflow

## Node Type

Global lifecycle contract.

## Purpose

This document defines the coarse workflow phases that sit underneath the workspace status model. It is intentionally separate from `workspace_status`, because workflow reasoning and CRM status labels are not the same thing.

Operational CRM rule:

- leads arrive into a workspace
- every entity in a workspace belongs to one workspace status
- new CRM-integrated leads should enter the workspace in `fresh`

## Workflow Phases

### 1. Captured

The lead has been submitted from the landing page and accepted by the receiving system.

Entry conditions:

- required frontend validation passed,
- anti-spam checks did not block processing,
- downstream webhook accepted the payload.

Typical evidence:

- CRM webhook response succeeded,
- attribution fields and lead metadata were included,
- optional files were attached if provided.

### 2. Needs Review

The lead exists but has not yet been worked into a meaningful workspace status or next action.

This is the default post-capture review state for operational agents.

In the CRM, this commonly corresponds to the first-pass handling that occurs while the lead is still in `fresh`.

### 3. Missing Information

The lead lacks required information for qualification or follow-up.

Examples:

- missing usable email address,
- missing phone number,
- vague project description,
- missing project type.

### 4. Contact Problem

The lead was captured but the provided communication path appears unusable.

Examples:

- malformed email,
- unreachable or obviously invalid phone,
- bounced or rejected outbound response.
- no usable email and no usable phone.

### 5. Qualified

The lead contains enough information to support a normal quote follow-up or sales response.

Typical minimum signal:

- person identity,
- at least one valid contact method,
- understandable project scope,
- enough project detail to continue.

### 6. Outreach Sent

An outbound communication has been sent asking for next-step action, missing data, or scheduling progress.

### 7. Waiting On Lead

The system is waiting on the lead after outreach.

### 8. Text Fallback

Text becomes the primary next branch when text consent is present and a usable phone path exists.

This may happen immediately from `fresh` when consent to text is checked, rather than only after email has been attempted.

### 9. Closed Or Archived

The lead lifecycle is operationally complete for this intake path.

Common close reasons:

- converted to downstream sales process,
- disqualified,
- spam,
- unreachable after allowed follow-up attempts,
- duplicate or irrelevant inquiry.

## Allowed Transitions

- `Captured -> Needs Review`
- `Needs Review -> Missing Information`
- `Needs Review -> Contact Problem`
- `Needs Review -> Qualified`
- `Needs Review -> Closed Or Archived`
- `Missing Information -> Outreach Sent`
- `Contact Problem -> Outreach Sent`
- `Outreach Sent -> Waiting On Lead`
- `Waiting On Lead -> Qualified`
- `Waiting On Lead -> Missing Information`
- `Waiting On Lead -> Text Fallback`
- `Waiting On Lead -> Closed Or Archived`
- `Text Fallback -> Waiting On Lead`
- `Qualified -> Closed Or Archived`

## Relationship To Workspace Status

These workflow phases support, but do not replace, the workspace status values defined in [entities/workspace_status.md](entities/workspace_status.md).

Typical mapping:

- newly submitted leads often begin as `fresh`,
- active outreach often maps to `contacted`,
- strong opportunities map to `qualified`,
- quoted work maps to `estimate_sent`,
- final outcomes map to `won` or `lost_na`.

Practical interpretation:

- `fresh` is the default intake status for newly created CRM leads
- the agent working `fresh` is responsible for verifying contact fields, understanding what information is already present, and choosing the next communication branch

## Escalation Rules

Escalate to the root level when a proposed change would:

- add a new global state,
- merge or split existing states,
- change qualification thresholds across channels,
- alter close reasons in a way that affects reporting or CRM mapping.
