# CRM Send Text Workflow

## Node Type

System runbook.

## Purpose

This file defines how an agent sends SMS/text outreach from inside the CRM.

## Critical Button Distinction

The phone field can expose two adjacent action buttons:

- `phone` icon: opens the call/dialer widget.
- `chat` icon: opens the SMS/text widget.

For text outreach, use the `chat` icon only.

Do not click the first generic phone action button just because it has class `sc-phone__btn`. The CRM uses the same button class for both phone and text actions. If selecting by DOM, choose the visible `button.sc-phone__btn` whose icon or text is exactly `chat`, not the one whose icon or text is `phone`.

The `twilio-phone-ca` panel with labels such as `Ready`, `Mute`, `Keypad`, `call`, or `Disconnected` is the call widget, not the text composer. Opening or expanding that widget does not count as text outreach.

If the `chat` action appears to do nothing, or a stale call widget remains on screen after a prior mistake, refresh the CRM browser page and reopen the lead before retrying the `chat` action.

## Failure Interpretation

Treat send outcomes conservatively:

- `verified_send`: the intended reviewed text is confirmed in the CRM conversation/activity log or equivalent send record.
- `blocked_send`: the text widget is unavailable, the wrong call widget opens, the composer cannot be found, or the final reviewed message cannot be preserved well enough to send.
- `verification_conflict`: evidence suggests a text may have been sent, but the available systems do not confirm the intended reviewed message.

Do not move a lead to `Contacted` unless text outreach is verified.

## Preconditions

- the correct lead record is open
- the lead has a usable phone number
- text consent is checked or otherwise operationally valid
- the intended message matches the current branch or follow-up objective
- the final outbound content has been reviewed for professionalism and completeness

## Required Human Inputs

Document the exact UI steps here:

- button to open the text widget: the `chat` icon next to the lead's phone field
- button to avoid: the `phone` icon next to the lead's phone field, because it opens the call/dialer widget
- wrong-widget signal: a `twilio-phone-ca` panel showing call controls such as `Mute`, `Keypad`, or `call`
- where send confirmation appears: `TODO`
- where text conversation history appears: the entity activity area when set to `Conversations` or `Communication`

## Standard Procedure

1. Open the correct lead.
2. Verify the phone number and text consent.
3. Locate the phone field actions.
4. Click the `chat` icon action, not the `phone` icon action.
5. If a call/dialer widget opens instead, close it and treat that click as the wrong action.
6. Use only the SMS/text composer or text conversation UI that opens from the `chat` action.
7. Fill in the message body using the matching qualification script and the lead's known details.
8. Re-read the exact final text visible in the composer before pressing send.
9. Confirm the message is professional and complete:
   - no placeholder text such as `asdf`, `def`, `test`, or draft fragments
   - no stale content from another lead or earlier attempt
   - clear opening, project context, and next requested action
10. Press send only after the final text has been reviewed.
11. Confirm the sent text appears in the CRM conversation/activity history.
12. Update notes or status only if the workflow requires it and the send is verified.

## Retry Rule

If the text widget does not open or the call widget opens instead:

1. Close the wrong widget if it is open.
2. Refresh the browser page, reopen the same lead, and verify the lead drawer loaded cleanly again.
3. Retry at most once by explicitly selecting the `chat` icon beside the phone field.
4. Do not use the call widget as a workaround for SMS.
5. If the clean retry also fails, stop and report `blocked_send`.

## Verification Rule

If no CRM text conversation or sent-message record appears:

- report the outcome as `blocked_send` or `verification_conflict`
- describe exactly what was visible
- do not claim text outreach was completed
- do not move the lead to `Contacted`

## Escalation Rules

- text consent is missing or unclear
- phone data is likely invalid
- the `chat` icon is missing
- the CRM opens only the call widget
- the SMS composer is unavailable
- send confirmation is missing
- more than one clean retry would be required to continue
