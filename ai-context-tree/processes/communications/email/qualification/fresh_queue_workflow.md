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
4. First, screen for obvious spam, solicitation, or other clearly non-customer text.
   - If present, do not send initial contact.
   - Current implementation `TODO`: decide whether to flag the lead through a dedicated field, move it to `Lost - N/A` / `lost_na`, or both.
5. Decide whether the entity is real, in scope, and contactable.
6. Inspect which fields are already present.
7. Compare the current fields against the required qualification fields and any service-specific follow-up fields.
8. Determine the narrowest qualification branch that explains the current case.
9. If initial contact has not yet happened and the lead is contactable, send the first clarification email.
10. Use the recommended script that matches the lead state, asking only for the minimum needed next.
   - If the lead is missing service-specific scope details for a known project type, use the matching service-specific follow-up reference before drafting the message.
11. If communication preference is not known and the lead is progressing, ask for it when appropriate.
12. Move the entity into the correct next `workspace_status`.
13. Leave enough history or notes that the next worker does not need to reconstruct the decision.

## Common Outcomes From Fresh

- remain effectively `fresh` if no real work occurred or the record is not yet actionable
- move to `contacted` if first real outreach was sent
- move to `qualified` if the lead is clearly in scope and enough information is known
- move to `lost_na` if the entity is spam, irrelevant, duplicate, or clearly not actionable

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
- the status model does not fit the actual case
- the CRM workflow requires a branch or outcome not yet documented
