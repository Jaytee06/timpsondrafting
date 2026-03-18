# CRM Lead Pipelines

## Node Type

System runbook.

## Purpose

This file explains how the CRM workspace is organized around lead pipeline tables and how an agent should interpret them.

## Current Workspace Assumption

After successful authentication, the primary CRM workspace should display `Lead Pipelines`.

That workspace is expected to contain tables, columns, boards, or grouped lists corresponding to `workspace_status` values.

## Expected Pipeline Status Areas

The workspace may contain areas for:

- `Fresh`
- `Contacted`
- `Qualified`
- `Estimate Sent`
- `Won`
- `Lost - N/A`

The exact UI format may be tables, grouped rows, kanban-style columns, or filtered views.

## Primary Agent Focus

The Qualification Agent's main operational responsibility is the `Fresh` table.

That means the agent should primarily:

- open entities in `Fresh`
- determine current state
- decide what information is missing
- choose the right communication path
- request needed information
- move the entity into the correct next `workspace_status`

## Row Interaction

Current known behavior:

- clicking a row opens that entity
- opening the row reveals the full entity structure
- the entity view contains editable fields
- the entity view contains a status dropdown for moving the entity between statuses
- the entity view contains an `activity` section

## Activity Section

The `activity` section should be treated as a primary source of truth for operational history.

It may include:

- status updates
- conversations by email
- conversations by text
- comments
- other entity updates

## Required Human Inputs

Document the live UI once confirmed:

- label of the workspace page: `Lead Pipelines`
- view modes visible: `List`, `Board`, `Auto Dialer`, `View`
- search control label: `Search Lead  Pipeline`
- grouping control label: `Group By Status (default)`
- whether statuses appear as tables, tabs, or columns: grouped status sections with tables in `List` view
- whether `Fresh` is the default first table: yes, `Fresh` appears as the first status section
- whether rows open in a drawer or full page: row click opens a right-side lead drawer
- whether rows can be reassigned directly from the board: status appears as a chip-like control in the drawer header (shows `Fresh`), but the exact control type/options still need verification `TODO`

Observed note:

- A toast error appeared: `Error: You do not have permissions to access companies`. If this blocks work, route to [auth_and_permissions.md](auth_and_permissions.md) and [troubleshooting.md](troubleshooting.md).

## Related References

- [../../entities/workspace_status.md](../../entities/workspace_status.md)
- [leads_inbox.md](leads_inbox.md)
- [update_workspace_status.md](update_workspace_status.md)
- [../../agent_roles/qualification_agent.md](../../agent_roles/qualification_agent.md)
- [../../processes/communications/email/qualification/fresh_queue_workflow.md](../../processes/communications/email/qualification/fresh_queue_workflow.md)

## Future Skill Reference

If CRM work becomes repetitive enough, this node is a natural reference point for a future CRM operator skill such as:

- `crm-workspace-operator`
- `crm-qualification-operator`

## Escalation Rules

- the workspace does not show pipeline groupings as expected
- status areas do not match the documented status model
- the `Fresh` queue is not the correct starting point for qualification work
