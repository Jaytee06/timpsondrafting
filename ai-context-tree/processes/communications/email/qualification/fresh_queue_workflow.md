# Fresh Queue Workflow

## Node Type

Process workflow.

## Purpose

This file defines the main decision loop for the Qualification Agent when working entities from the `Fresh` table in the CRM.

In the CRM integration, new leads enter the workspace in `Fresh`.

## Entry Condition

Use this workflow when:

- the entity is in `Fresh`
- the lead has not yet been meaningfully worked
- the next task is to decide what the entity is, what is needed, and what should happen next

The working order for `Fresh` is top to bottom through the visible list unless a stricter queue rule is documented later.

Current test override:

- `Test Scenario 1` is active for local testing.
- In this scenario, the agent should still handle `Fresh` leads using the normal qualification logic.
- Before clearing the rest of the queue, the agent should send the qualifying email to the first `Fresh` lead that matches the explicitly supplied developer test email address.
- After that email is sent, the agent should revisit the remaining `Fresh` rows and move obvious spam, test submissions, or other clearly non-actionable records into `lost_na`.
- Execute this scenario through the CRM browser UI, not by starting local services or bypassing the UI with direct repo inspection alone.

Required local test input:

- developer test email address: `software_dev@tad.com`
- do not guess this value from heuristics

## Core Questions

For each entity, the agent should ask:

1. What is the state of this entity right now?
2. What information is already known?
3. What information is still required?
4. How should I communicate with this entity?
5. What skill, template, or branch should I use to request what I need?
6. What is the correct next `workspace_status`?

## Standard Operating Loop

1. Work the visible `Fresh` rows from top to bottom unless `Test Scenario 1` is active.
2. If `Test Scenario 1` is active, first locate the `Fresh` lead that exactly matches the documented developer test email address and open that entity before continuing with the rest of the queue.
3. Review current lead details and history.
   - Scroll through the full entity first so lower fields are not missed.
   - Identify which visible fields are qualification-relevant versus marketing-only or attribution context.
   - Confirm whether project type is already present before asking for it again.
   - Review communication history and activity history near the bottom of the entity, using the history-type dropdown and expandable entries as needed.
4. First, screen for obvious spam, solicitation, or other clearly non-customer text.
   - If present, do not send initial contact.
   - Move the lead to `Lost - N/A` / `lost_na`.
5. Decide whether the entity is real, in scope, and contactable.
6. Verify the contact fields and consent signals before choosing a channel.
   - If `consent_to_text` is checked and the phone is usable, route the lead into the text pipeline.
   - Otherwise use email when a usable email exists.
   - If neither usable email nor usable phone exists, add a concise CRM comment explaining the contact problem.
7. Inspect which fields are already present.
8. Compare the current fields against the required qualification fields and any service-specific follow-up fields.
9. Determine the narrowest qualification branch that explains the current case.
10. If initial contact has not yet happened and the lead is contactable through email, send the first clarification email.
11. Use the recommended script that matches the lead state, asking only for the minimum needed next.
   - First parse the current entity fields and description so the script only asks for what is still missing.
   - If the lead is missing service-specific scope details for a known project type, use the matching service-specific follow-up reference before drafting the message.
12. If communication preference is not known and the lead is progressing, ask for it when appropriate.
13. Move the entity into the correct next `workspace_status`.
14. Under `Test Scenario 1`, after the developer test email has been sent, return to the remaining `Fresh` rows and clear obvious spam or testing data into `lost_na`.
15. Leave enough history or notes that the next worker does not need to reconstruct the decision.

## Test Scenario 1

Use this local-only scenario when validating the qualification email flow.

Rules:

- stay inside `app.timpsondrafting.com`
- handle the selected developer-email lead as a normal `Fresh` lead, not as a special status case
- send the qualifying questions by email first when that lead matches the documented developer test email address
- once that email is sent, continue through `Fresh` and move obvious spam, solicitation, duplicates, or testing records to `lost_na`
- do not leave obvious spam or test data sitting in `Fresh` after the pass is complete

## Obvious Spam And Testing Heuristics

Treat a lead as obvious spam, solicitation, or test data when one or more of the following is present and there is no stronger real-customer signal:

- the message is selling SEO, marketing, web development, lead generation, or similar services to Timpson Drafting
- the message is generic outreach aimed at "improving your business" rather than requesting drafting work
- the message contains clear test markers such as `test`, `asdf`, `123123`, `fake`, or obvious placeholder names
- the description is empty or effectively content-free and the rest of the record also looks synthetic
- the lead is a duplicate of an already-worked record and adds no new customer information

Do not classify as spam based on brevity alone.

If a message is short, awkward, or poorly written but still appears to request drafting help, treat it as a real lead unless stronger spam or test indicators are present.

## Notes Requirement

Do not add a separate comment for routine status changes alone. The CRM activity log already captures those changes.

Add a comment at the very bottom of the lead only when extra context is useful.

This is especially useful when moving a lead to `lost_na` or when no usable email or phone exists.

Minimum comment content:

- what specific signal caused a move to `lost_na`, if applicable
- what contact problem prevents normal follow-up, if applicable
- what the next worker should know without re-reading the entire record

Keep the comment brief and operational.

- one short sentence is preferred
- avoid spilling unnecessary detail into the comment

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

## Contacted Follow-Up

After a lead is moved from `fresh` to `contacted`, the Qualification Agent still owns the next review pass.

For `Contacted` leads:

1. Open the entity.
2. Scroll to the bottom activity area.
3. Open the `Show activity type` dropdown.
4. Select `Conversations`.
5. Expand the relevant conversation entries.
6. Determine who last replied.
7. If the client replied with the information that was requested, use that reply to continue qualification and update the lead accordingly.
8. If the last message was from the business and the client has not replied yet, keep the lead aligned with the waiting state rather than pretending new qualification data arrived.

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
