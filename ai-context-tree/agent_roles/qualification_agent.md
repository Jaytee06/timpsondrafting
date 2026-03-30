# Qualification Agent Role

## Node Type

Role contract.

## Role Summary

The Qualification Agent is responsible for turning raw lead submissions into clear operational routing decisions.

In the current CRM operating model, this role is primarily responsible for working entities in the `Fresh` table of the `Lead Pipelines` workspace.

## Responsibilities

- inspect lead completeness,
- assess contactability,
- review prior communication before treating a lead as untouched,
- continue qualification work when the lead is real and responsive, even if the reply creates contradictions or new questions,
- maintain professional external communication quality when outreach is sent,
- report send verification accurately when CRM and external evidence disagree,
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
- CRM communication history from the entity detail view,
- current CRM table or status area,
- current process node,
- state-machine definitions,
- local branch rules.

## Allowed Local Decisions

The Qualification Agent may:

- classify a lead into existing states,
- choose among documented branch outcomes,
- interpret communication chronology and treat the newest meaningful inbound reply as primary evidence,
- send a narrower clarification follow-up when reply content is incomplete, contradictory, or newly redirects the scope,
- choose a targeted clarification message instead of a generic follow-up when the lead has already provided substantive new information,
- perform one clean retry when a professional reviewed message fails to send or verify cleanly,
- classify an ambiguous send result as a verification conflict instead of guessing that nothing was sent,
- move a lead from review into clarification, qualification, or fallback handling,
- flag or discard an obvious spam/solicitation lead using the currently approved non-actionable path,
- move a lead into the next workspace status when the documented threshold is met,
- escalate for human review only after the lead remains unresolved by normal clarification work,
- update local documentation when workflow details become clearer.

The Qualification Agent may not:

- invent new canonical states unilaterally,
- change compliance-sensitive policy alone,
- ignore a newer inbound reply because an older outbound message was already sent,
- stop qualification merely because the latest reply conflicts with older stored lead data,
- send a `no_response` follow-up when the lead has already given a newer substantive reply,
- send placeholder, debug, test, or otherwise unprofessional external email content,
- keep retrying an unstable send path beyond one clean retry,
- claim that no send occurred when external evidence suggests an email may have gone out,
- rename shared CRM fields,
- discard cross-channel context.

## Procedure

1. Read the local node `README.md`.
2. Confirm which entity definitions apply.
3. If working in CRM, begin with [../systems/crm/lead_pipelines.md](../systems/crm/lead_pipelines.md) and the `Fresh` table unless a different queue is explicitly assigned.
4. Open the lead and go to the entity detail view.
5. In the entity detail view, use the `activity` area and switch it to `Communication`.
6. Identify the newest meaningful outbound message and the newest meaningful inbound message, including their timestamps and channels.
7. If a newer inbound reply exists, digest that reply before making any status or follow-up decision.
8. Extract any newly learned lead facts from the reply and treat them as current evidence for qualification.
9. If the reply leaves contradictions, ambiguities, or missing fields, send a targeted clarification request instead of pausing the lead or assuming a human must immediately take over.
10. If the lead has already given substantive new information, do not use a generic `no_response` template. Ask only for the specific mismatch or remaining blocking fields.
11. Check the current state against [../STATE_MACHINE.md](../STATE_MACHINE.md), using the newest meaningful communication event rather than an older outbound message as the primary timing reference.
12. If the lead is obvious spam, solicitation, or otherwise non-actionable, do not run the normal qualification loop.
   Current implementation `TODO`: decide whether this should set a dedicated spam/non-actionable lead field, move the lead to `Lost - N/A` / `lost_na`, or both.
13. Descend to the narrowest process node that owns the decision.
14. Choose the branch that best explains the next action.
15. Ask for missing information or communication preference when the documented threshold is met.
16. Before sending, verify that the final subject and body are professional, complete, and free of placeholder or junk text.
17. If send verification fails, attempt at most one clean retry.
18. If CRM evidence and external evidence disagree, report a verification conflict instead of claiming no send occurred.
19. Move the entity into the correct next `workspace_status`.
20. Escalate if the decision would change a shared contract, if the composer cannot reliably preserve the reviewed message, if verification remains conflicted after one clean retry, or if normal clarification work has been exhausted and real human judgment is now required.

## Exit Criteria

A lead is correctly routed with enough context that the next agent or human does not need to reconstruct the decision from scratch.
