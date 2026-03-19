# CRM Leads Inbox

## Node Type

System runbook.

## Purpose

This file explains how an agent finds the current leads that need action.

For the pipeline-oriented workspace model, see [lead_pipelines.md](lead_pipelines.md).

## Inputs

- a logged-in CRM session
- access to the lead list, inbox, or pipeline view

## Decision Goal

Determine:

- which leads are new
- which leads need follow-up
- which lead should be worked next

In the current operating model, the Qualification Agent should usually start with entities in the `Fresh` table and then continue reviewing `Contacted` leads that may contain replies.

## Required Human Inputs

Document the real queue rules here:

- page or tab name for active leads: `Lead Pipelines` (sidebar label)
- page or tab name for new leads: `Fresh` (status section header within `Lead Pipelines`)
- page or tab name for replied or in-progress leads: `Contacted` (status section header within `Lead Pipelines`)
- sort order to use: top to bottom through the visible `Fresh` list
- filters to apply: `TODO`
- rules for prioritizing who to work next: iterate top to bottom unless a stricter priority rule is documented

## Typical Selection Logic

The current operating rule is simple:

1. open `Fresh`
2. start at the top visible row
3. work each lead in order
4. send initial contact when needed before moving to the next lead
5. review `Contacted` leads to check whether the client replied with qualification information

## Related Workflow

For the detailed Fresh-queue decision loop, see [../../processes/communications/email/qualification/fresh_queue_workflow.md](../../processes/communications/email/qualification/fresh_queue_workflow.md).

## Output

The chosen next lead and the reason it was selected, including whether it came from `Fresh` or `Contacted`.

Once chosen, the agent should click the row to open the full entity and continue with the detail-view, qualification, and send-email workflow docs.

## Escalation Rules

- queue ordering rules are ambiguous
- two leads appear equally urgent and no tie-breaker is documented
- a lead is duplicated across views
