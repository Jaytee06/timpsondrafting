# CRM Send Email Workflow

## Node Type

System runbook.

## Purpose

This file defines how an agent sends an email from inside the CRM.

## Failure Interpretation

Treat send outcomes conservatively:

- `verified_send`: the intended reviewed message is confirmed in the CRM activity log or equivalent send record.
- `blocked_send`: the composer is malformed, unstable, unavailable, or cannot preserve the reviewed message well enough to attempt a valid send.
- `verification_conflict`: evidence suggests an email may have been sent, but the available systems do not agree on whether the correct reviewed message actually went out.

Do not collapse `verification_conflict` into `no send occurred`.

## Preconditions

- the correct lead record is open
- an email address is present and usable
- the intended message matches the current branch or follow-up objective
- the final outbound content has been reviewed for professionalism and completeness

## Required Human Inputs

Document the exact UI steps here:

- button or tab to open the email composer: email button next to the lead's email field
- whether email templates exist in the CRM: yes, use `Custom Message` for these qualification emails
- where the email tool appears: near the bottom-middle of the screen after clicking the email icon
- how the composer should be prepared: after the email tool opens, select the `Custom Message` template first
- where the subject field appears: the `Email Subject` input in the email tool that opens near the bottom-middle of the screen
- where the message body field appears: the body field below the subject area, with `Custom Message` shown as its placeholder
- where attachments are added: `TODO`
- where send confirmation appears: `TODO`

## Standard Procedure

1. Open the correct lead.
2. Click the email button next to the lead's email field.
3. Use the email tool that opens near the bottom-middle of the screen.
4. Select the `Custom Message` email template before editing any other field.
5. Fill in the `Email Subject` input with the reviewed subject for the lead state.
6. Fill in the body field that shows `Custom Message` as its placeholder using the matching script and the lead's known details.
7. Verify recipient, subject, and body.
8. Re-read the exact final subject and body visible in the composer before pressing `Send`.
9. Confirm the message is professional and complete:
   - no placeholder text such as `asdf`, `def`, `test`, or draft fragments
   - no empty or malformed subject
   - no stale composer content from another lead or earlier attempt
   - clear opening, project context, and next requested action
10. If the composer content is malformed, unstable, or inconsistent with the intended reviewed message, do not send. Reset the composer and treat the attempt as blocked.
11. Press `Send`.
12. Reload the lead or workspace view.
13. Confirm the sent message appears in the lead history or activity log.
14. If possible, confirm the sent message content matches the reviewed subject and body, not just that an event exists.
15. Update notes or status if the workflow requires it.

## CRM Verification Notes

When verifying email in the CRM:

- go to the lead drawer `Activity` area
- set `Show` to `Conversations`, not `Comments`
- inspect the newest email conversation entry first
- prefer an expanded conversation card that shows:
  - outbound email summary
  - recipient email
  - timestamps
  - delivery or open chips
  - any inbound reply content

If the CRM shows only a row-level `mail_outline` or `send` indicator, treat that as partial evidence until the conversation entry is reviewed.

If the CRM records `Original message content is not available for this activity yet`, that still supports that an outbound email event happened, but it does not prove the full reviewed subject/body content. Use the best available evidence and classify carefully.

## Retry Rule

If a send attempt closes, errors, or fails verification:

1. Perform at most one clean retry.
2. A clean retry means:
   - reopen the composer from scratch
   - reselect `Custom Message`
   - re-enter the reviewed recipient, subject, and body
   - re-read the final visible subject and body before sending again
3. Do not rely on repeated retries, DOM-only field state, or forced dirty-state tricks as a normal operating method.
4. If the clean retry also fails or remains ambiguous, stop retrying and escalate.

## Recommended Follow-Up Shape For Contacted Replies

When a `Contacted` lead replies with some qualification data:

- extract the newly answered fields first
- do not repeat fields the lead already answered
- ask only for the next highest-value missing field
- prefer one narrow follow-up over a fresh questionnaire

Example:

- if land status, builder status, first-time status, and priorities are now known, the next follow-up can narrow to budget range instead of restarting the full discovery sequence

## Verification Rule

If CRM evidence and external evidence disagree:

- report the outcome as `verification_conflict`
- describe exactly what each source showed
- do not claim that no email was sent unless the evidence actually supports that conclusion
- do not move status as though the intended reviewed message was verified

## Content Guidance

Use the communication and qualification docs in:

- [../../processes/communications/email/README.md](../../processes/communications/email/README.md)
- [../../processes/communications/email/qualification/scripts.md](../../processes/communications/email/qualification/scripts.md)
- [../../processes/communications/email/qualification/templates.md](../../processes/communications/email/qualification/templates.md)

Outbound lead email should be professional by default:

- concise but complete
- personalized to the lead and project
- free of placeholder, junk, or debugging text
- limited to the actual next question or action needed
- safe to stand on its own if the lead forwards it or reads it without extra context

## Escalation Rules

- email composer is unavailable
- the CRM cannot send from the expected mailbox
- send confirmation is missing
- the actual sent content does not match the reviewed content
- the composer appears to send malformed, placeholder, or stale draft content
- CRM and external email evidence conflict about whether the intended message was sent
- more than one clean retry would be required to continue
- the lead should not be emailed due to contact or consent uncertainty
