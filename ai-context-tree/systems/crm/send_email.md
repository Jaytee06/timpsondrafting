# CRM Send Email Workflow

## Node Type

System runbook.

## Purpose

This file defines how an agent sends an email from inside the CRM.

## Preconditions

- the correct lead record is open
- an email address is present and usable
- the intended message matches the current branch or follow-up objective

## Required Human Inputs

Document the exact UI steps here:

- button or tab to open the email composer: email button next to the lead's email field
- whether email templates exist in the CRM: yes, use `Custom Message` for these qualification emails
- where the email tool appears: near the bottom-middle of the screen after clicking the email icon
- where the subject field appears: in the email tool that opens near the bottom-middle of the screen
- where the message body field appears: in the same email tool, below the subject area
- where attachments are added: `TODO`
- where send confirmation appears: `TODO`

## Standard Procedure

1. Open the correct lead.
2. Click the email button next to the lead's email field.
3. Use the email tool that opens near the bottom-middle of the screen.
4. Select the `Custom Message` email template.
5. Fill in the appropriate subject for the lead state.
6. Fill in the message body using the matching script and the lead's known details.
7. Verify recipient, subject, and body.
8. Press `Send`.
9. Reload the lead or workspace view.
10. Confirm the sent message appears in the lead history or activity log.
11. Update status if the workflow requires it.

## Content Guidance

Use the communication and qualification docs in:

- [../../processes/communications/email/README.md](../../processes/communications/email/README.md)
- [../../processes/communications/email/qualification/scripts.md](../../processes/communications/email/qualification/scripts.md)
- [../../processes/communications/email/qualification/templates.md](../../processes/communications/email/qualification/templates.md)

## Escalation Rules

- email composer is unavailable
- the CRM cannot send from the expected mailbox
- send confirmation is missing
- the lead should not be emailed due to contact or consent uncertainty
