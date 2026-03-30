# CRM Lead Detail View

## Node Type

System runbook.

## Purpose

This file explains what to inspect once an agent opens an individual lead.

## Open Procedure

Current known behavior:

1. Find the entity row in the relevant pipeline table.
2. Click the row.
3. Review the full entity structure in the opened detail view (currently a right-side drawer).
4. In the drawer's `activity` area, switch to `Communication` before reviewing message history.

The opened entity should expose editable fields rather than a read-only summary.

Observed UI:

- the row click opens a right-side lead drawer (not a separate page)
- the drawer includes `Cancel` and `Save` buttons, indicating edits require an explicit save

## Checklist

Review the following:

- current `workspace_status`
- editable field values across the entity
- which qualification fields are already populated versus missing
- last contact attempt
- last response from the lead
- newest meaningful inbound message versus newest meaningful outbound message
- available contact methods
- consent or communication preference
- project type and description
- post-contact fields from [../../processes/communications/email/qualification/post_contact_required_fields.md](../../processes/communications/email/qualification/post_contact_required_fields.md)
- existing files or attachments
- notes, tasks, or prior estimate activity
- the `activity` section for status changes, conversations, comments, and updates

## Required Human Inputs

Document the exact CRM screen regions or tabs here:

- header area location: top of the right-side lead drawer, `TODO` (needs screenshot-based mapping)
- status field location: status is shown as a chip-like indicator in the drawer header (example: `Fresh`), but the exact control type/options are not yet enumerated `TODO`
- notes/activity location: `activity` section inside entity detail view
- communication history view: switch the `activity` area to `Communication`
- email composer entry point: `TODO`
- attachments location: `TODO`
- custom fields section: `TODO`

## Activity Section Guidance

Treat the `activity` section as the running log of the entity.

When message history matters, switch the `activity` area to `Communication` and treat that communication history as the primary evidence for outbound attempts and lead replies.

The newest meaningful communication event controls the next decision. If a newer inbound reply exists, do not justify the current state from an older outbound message alone.

Use it to confirm:

- whether outreach has already happened
- whether the lead has replied
- whether the lead reply is newer than the latest outbound attempt
- whether status was recently changed
- whether email or text conversations already exist
- which reply is the newest meaningful inbound message
- which new lead facts were provided in that reply
- whether another user already worked the entity
- whether comments provide special handling instructions

## Decision Output

After reviewing a lead, the agent should be able to answer:

- what is known
- what is missing
- what new facts came from the latest reply
- which script should be used next, if outreach is required
- what action is next
- whether the status should change

For the main qualification loop from `Fresh`, see [../../processes/communications/email/qualification/fresh_queue_workflow.md](../../processes/communications/email/qualification/fresh_queue_workflow.md).

## Escalation Rules

- lead history is incomplete or contradictory
- required fields are not visible
- the lead appears to belong to the wrong contact or project
