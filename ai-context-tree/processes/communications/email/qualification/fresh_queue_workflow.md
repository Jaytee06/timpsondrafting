# Fresh Queue Workflow

## Node Type

Process workflow.

## Purpose

This file defines the main decision loop for the Qualification Agent when working entities from the `Fresh` table in the CRM.

## Entry Condition

Use this workflow when:

- the entity is in `Fresh`
- the lead has not yet been meaningfully worked
- the next task is to decide what the entity is, what is needed, and what should happen next

The working order for `Fresh` is top to bottom through the visible list unless a stricter queue rule is documented later.

## Core Questions

For each entity, the agent should ask:

1. What is the state of this entity right now?
2. What information is already known?
3. What information is still required?
4. How should I communicate with this entity?
5. What skill, template, or branch should I use to request what I need?
6. What is the correct next `workspace_status`?

## Standard Operating Loop

1. Work the visible `Fresh` rows from top to bottom.
2. Open the next entity from the `Fresh` table.
3. Review current lead details and history.
4. In the entity detail view, switch the `activity` area to `Communication` before deciding what the latest conversation state is.
5. Identify the newest meaningful outbound message, the newest meaningful inbound message, and whether the lead has already replied.
6. If a newer inbound reply exists, extract the new facts from that reply before choosing a branch or deciding that follow-up is too soon.
7. Do not treat the lead as untouched, no-response, or waiting-only when a newer inbound reply already changes the available information.
8. If the reply conflicts with older stored lead data, treat the reply as a clarification opportunity and ask the narrowest next question needed to resolve the contradiction.
9. First, screen for obvious spam, solicitation, or other clearly non-customer text.
   - If present, do not send initial contact.
   - Current implementation `TODO`: decide whether to flag the lead through a dedicated field, move it to `Lost - N/A` / `lost_na`, or both.
10. Decide whether the entity is real, in scope, and contactable.
11. Inspect which fields are already present, including any facts learned from the latest reply.
12. Compare the current fields against the required qualification fields and any service-specific follow-up fields.
13. Determine the narrowest qualification branch that explains the current case.
14. If initial contact has not yet happened and the lead is contactable, send the first clarification email.
15. Use the recommended script that matches the lead state, asking only for the minimum needed next.
   - If the lead is missing service-specific scope details for a known project type, use the matching service-specific follow-up reference before drafting the message.
16. If the lead is real and responsive but still blocked by one or more unresolved questions, keep working the clarification loop rather than treating the case as done.
17. If communication preference is not known and the lead is progressing, ask for it when appropriate.
18. Move the entity into the correct next `workspace_status`.
19. Leave enough history or notes that the next worker does not need to reconstruct the decision.

## Common Outcomes From Fresh

- remain effectively `fresh` if no real work occurred or the record is not yet actionable
- move to `contacted` if first real outreach was sent
- move to `qualified` if the lead is clearly in scope and enough information is known
- move to `lost_na` if the entity is spam, irrelevant, duplicate, or clearly not actionable

Responsive but still ambiguous leads should usually remain in `contacted` while the agent continues targeted clarification. They should not be treated as resolved merely because the latest reply introduced conflicting information.

## Related Decision References

- [required_fields.md](required_fields.md)
- [post_contact_required_fields.md](post_contact_required_fields.md)
- [scripts.md](scripts.md)
- [service_specific/addition.md](service_specific/addition.md)
- [decision_rules.md](decision_rules.md)
- [branches/invalid_email.md](branches/invalid_email.md)
- [branches/missing_fields.md](branches/missing_fields.md)
- [branches/no_response.md](branches/no_response.md)
- [branches/text_fallback.md](branches/text_fallback.md)
- [branches/qualified.md](branches/qualified.md)

## Suggested Additional Branches

These may need dedicated files later if they become common:

- duplicate lead
- obvious spam
- out of scope project
- missing contact method
- already worked by another user

## Escalation Rules

- a Fresh entity cannot be explained by existing branches
- multiple next actions seem equally valid
- the lead remains blocked after normal clarification attempts and now needs real human review
- the status model does not fit the actual case
- the CRM workflow requires a branch or outcome not yet documented
