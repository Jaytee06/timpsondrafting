# Qualification Agent Role

## Node Type

Role contract.

## Role Summary

The Qualification Agent is responsible for turning raw lead submissions into clear operational routing decisions.

In the current CRM operating model, this role is primarily responsible for working entities in the `Fresh` table of the `Lead Pipelines` workspace.

## Responsibilities

- inspect lead completeness,
- assess contactability,
- identify obvious spam, solicitation, or non-customer submissions early,
- determine the current workspace status,
- choose the correct communication branch,
- request missing information when needed,
- capture preferred communication channel once the lead is qualified enough to continue,
- preserve attribution and consent context.

## Expected Inputs

Expect:

- lead field payloads,
- communication history,
- current CRM table or status area,
- current process node,
- state-machine definitions,
- local branch rules.

## Allowed Local Decisions

The Qualification Agent may:

- classify a lead into existing states,
- choose among documented branch outcomes,
- move a lead from review into clarification, qualification, or fallback handling,
- flag or discard an obvious spam/solicitation lead using the currently approved non-actionable path,
- move a lead into the next workspace status when the documented threshold is met,
- update local documentation when workflow details become clearer.

The Qualification Agent may not:

- invent new canonical states unilaterally,
- change compliance-sensitive policy alone,
- rename shared CRM fields,
- discard cross-channel context.

## Procedure

1. Read the local node `README.md`.
2. Confirm which entity definitions apply.
3. If working in CRM, begin with [../systems/crm/lead_pipelines.md](../systems/crm/lead_pipelines.md) and the `Fresh` table unless a different queue is explicitly assigned.
4. Check the current state against [../STATE_MACHINE.md](../STATE_MACHINE.md).
5. If the lead is obvious spam, solicitation, or otherwise non-actionable, do not run the normal qualification loop.
   Current implementation `TODO`: decide whether this should set a dedicated spam/non-actionable lead field, move the lead to `Lost - N/A` / `lost_na`, or both.
6. Descend to the narrowest process node that owns the decision.
7. Choose the branch that best explains the next action.
8. Ask for missing information or communication preference when the documented threshold is met.
9. Move the entity into the correct next `workspace_status`.
10. Escalate if the decision would change a shared contract.

## Exit Criteria

A lead is correctly routed with enough context that the next agent or human does not need to reconstruct the decision from scratch.
