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

The Qualification Agent's main operational responsibility is the `Fresh` and `Contacted` status areas.

That means the agent should primarily:

- open entities in `Fresh`
- review entities in `Contacted`
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

For `Contacted` review work, conversation history is especially important because the agent must determine whether the client has replied to an earlier request.

## Required Human Inputs

Document the production UI once confirmed:

- label of the workspace page: `Lead Pipelines`
- view modes visible: `List`, `Board`, `Auto Dialer`, `View`
- search control label: `Search Lead  Pipeline`
- grouping control label: `Group By Status (default)`
- whether statuses appear as tables, tabs, or columns: grouped status sections with tables in `List` view
- whether `Fresh` is the default first table: yes, `Fresh` appears as the first status section
- whether `Contacted` is reviewed by the same qualification role: yes, the qualification role should review `Contacted` leads for replies and newly supplied information
- whether rows open in a drawer or full page: row click opens a right-side lead drawer
- whether rows can be reassigned directly from the board: opening a row shows the current status at the top of the drawer as a dropdown control; the visible label is the lead's current workspace status and the dropdown list contains the other available statuses

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
- the `Fresh` or `Contacted` queue is not the correct starting point for qualification work
