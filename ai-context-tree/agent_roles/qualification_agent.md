# Qualification Agent Role

## Node Type

Role contract.

## Role Summary

The Qualification Agent is responsible for turning raw lead submissions into clear operational routing decisions.

In the current CRM operating model, this role is responsible for working entities in the `Fresh` and `Contacted` status areas of the `Lead Pipelines` workspace.

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
- route to text when text consent is present and the phone path is usable,
- request missing information when needed,
- review `Contacted` leads for replies and newly supplied qualification details,
- run the canonical ordered qualification discovery sequence before classifying a lead as `qualified`,
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

Primary execution mode for CRM work:

- use browser navigation and browser UI interaction inside `app.timpsondrafting.com`
- work the visible CRM interface directly
- do not start or troubleshoot the CRM environment unless the task explicitly shifts into setup or debugging

## Allowed Local Decisions

The Qualification Agent may:

- classify a lead into existing states,
- choose among documented branch outcomes,
- interpret communication chronology and treat the newest meaningful inbound reply as primary evidence,
- treat the ordered qualification discovery questions as the gating structure for `qualified`,
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
3. If working in CRM, begin with [../systems/crm/lead_pipelines.md](../systems/crm/lead_pipelines.md) and the `Fresh` or `Contacted` status area, depending on which queue needs action.
4. Open the lead and go to the entity detail view.
5. Check the current state against [../STATE_MACHINE.md](../STATE_MACHINE.md).
6. Before making a qualification decision, inspect the lead drawer carefully.
   - Scroll through the entity fields rather than relying only on the initially visible fields.
   - Distinguish qualification-relevant fields from marketing or attribution fields.
   - Always check whether core qualification fields such as project type, description, location, timeline, email, and phone are present.
   - Use marketing and attribution data as supporting context, not as a substitute for qualification fields.
7. Review communication history and activity history before deciding on outreach or status.
   - These controls appear near the bottom of the entity.
   - In the entity detail view, switch the `activity` area to `Communication` when message history matters.
   - Use the history-type dropdown to inspect the available history categories.
   - Expand individual entries when more context is available.
   - For `Contacted` leads, switch `Show activity type` to `Conversations`.
8. Identify the newest meaningful outbound message and the newest meaningful inbound message, including their timestamps and channels.
9. If a newer inbound reply exists, digest that reply before making any status or follow-up decision.
10. Extract any newly learned lead facts from the reply and treat them as current evidence for qualification.
11. Compare the current evidence against the canonical ordered qualification discovery sequence in [../processes/communications/email/qualification/post_contact_required_fields.md](../processes/communications/email/qualification/post_contact_required_fields.md).
   - Preserve the order of that question structure.
   - Treat equivalent already-supplied information as satisfying a question even if the customer did not answer it verbatim.
   - Treat explicit answers such as `first time`, `no builder yet`, or `still figuring out land` as valid qualification evidence rather than missing data.
12. If the reply leaves contradictions, ambiguities, or missing discovery answers, send a targeted clarification request instead of pausing the lead or assuming a human must immediately take over.
13. If the lead has already given substantive new information, do not use a generic `no_response` template. Ask only for the specific mismatch or remaining blocking fields.
14. Use the newest meaningful communication event rather than an older outbound message as the primary timing reference.
15. If the lead is obvious spam, solicitation, or otherwise non-actionable, do not run the normal qualification loop.
   Move it to `Lost - N/A` / `lost_na` unless a more specific non-actionable path is documented later.
16. Choose the communication branch from verified contact data.
   - If text consent is checked and the phone is usable, route into the text pipeline and use the CRM `chat` icon, not the adjacent `phone` call icon.
   - Otherwise use email when a usable email exists.
   - If neither usable phone nor usable email exists, leave a concise CRM comment documenting the contact problem and treat the lead as not normally contactable.
17. Descend to the narrowest process node that owns the decision.
18. Choose the branch that best explains the next action.
19. Ask for the next unanswered discovery question or communication preference when the documented threshold is met.
20. Before sending, verify that the final subject and body are professional, complete, and free of placeholder or junk text.
21. If send verification fails, attempt at most one clean retry.
22. If CRM evidence and external evidence disagree, report a verification conflict instead of claiming no send occurred.
23. Move the entity into the correct next `workspace_status`.
24. Escalate if the decision would change a shared contract, if the composer cannot reliably preserve the reviewed message, if verification remains conflicted after one clean retry, or if normal clarification work has been exhausted and real human judgment is now required.

## Exit Criteria

A lead is correctly routed with enough context that the next agent or human does not need to reconstruct the decision from scratch.
