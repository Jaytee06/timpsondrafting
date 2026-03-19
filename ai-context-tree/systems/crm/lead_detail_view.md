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

The opened entity should expose editable fields rather than a read-only summary.

Observed UI:

- the row click opens a right-side lead drawer (not a separate page)
- the drawer includes `Cancel` and `Save` buttons, indicating edits require an explicit save
- the top of the drawer shows the current workspace status as a dropdown control
- opening that dropdown should reveal the remaining available statuses for reassignment
- lower sections of the drawer may require scrolling before all fields and history become visible
- the email action is triggered from the email icon next to the lead's email field
- comments can be added at the very bottom of the lead

## Checklist

Review the following:

- current `workspace_status`
- editable field values across the entity
- which qualification fields are already populated versus missing
- which visible fields are core qualification inputs versus marketing or attribution context
- last contact attempt
- last response from the lead
- available contact methods
- consent or communication preference
- project type and description
- post-contact fields from [../../processes/communications/email/qualification/post_contact_required_fields.md](../../processes/communications/email/qualification/post_contact_required_fields.md)
- existing files or attachments
- notes, tasks, or prior estimate activity
- the `activity` section for status changes, conversations, comments, and updates

Do not rely only on the first visible fields in the drawer.

Scroll through the full entity before deciding that a field is missing.

## Required Human Inputs

Document the exact CRM screen regions or tabs here:

- header area location: top of the right-side lead drawer
- status field location: top of the right-side lead drawer; it shows the current workspace status label and an arrow dropdown with the remaining status options
- notes/activity location: near the bottom of the entity detail view after scrolling
- communication and activity history type selector: near the bottom of the entity; use the dropdown there to switch between available history types
- `Show activity type` conversation review: switch the dropdown to `Conversations` when you need to inspect who replied last
- expandable history entries: entries in the history area can usually be expanded to reveal additional context
- comment entry point: very bottom of the lead; use the comment control there when a manual comment is needed
- email composer entry point: email icon next to the lead's email field; this opens the email tool near the bottom-middle of the screen
- attachments location: `TODO`
- custom fields section: `TODO`

## Activity Section Guidance

Treat the `activity` section as the running log of the entity.

Use it to confirm:

- whether outreach has already happened
- whether status was recently changed
- whether email or text conversations already exist
- whether another user already worked the entity
- whether comments provide special handling instructions

Also review the communication and activity history controls near the bottom of the record:

- open the history-type dropdown to inspect the available categories
- for reply review, set `Show activity type` to `Conversations`
- switch through the relevant history types before deciding the lead is untouched
- expand entries when more detail is available instead of relying only on collapsed summaries
- determine who last sent the conversation message before choosing the next action
- if the client replied with requested details, use that information to continue qualification

Comments can be added at the very bottom of the lead.

Do not add a separate comment for routine status changes alone. The CRM activity log already captures status changes.

Use a manual comment mainly when extra human context is useful, especially when moving a lead to `lost_na`.

Keep comments concise:

- one short sentence is usually enough
- include the decision and the reason
- avoid repeating the full lead history or copying large parts of the description

Suggested comment pattern:

- `Marked lost_na due to obvious spam/testing data: [short reason].`

## Decision Output

After reviewing a lead, the agent should be able to answer:

- what is known
- what is missing
- which script should be used next, if outreach is required
- what action is next
- whether the status should change

For the main qualification loop from `Fresh`, see [../../processes/communications/email/qualification/fresh_queue_workflow.md](../../processes/communications/email/qualification/fresh_queue_workflow.md).

## Escalation Rules

- lead history is incomplete or contradictory
- required fields are not visible
- the lead appears to belong to the wrong contact or project
