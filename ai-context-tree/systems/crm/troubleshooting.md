# CRM Troubleshooting

## Node Type

System runbook.

## Purpose

This file captures common CRM operating problems and how an agent should respond.

## Common Problems

### Cannot Log In

- verify the correct URL is being used
- if the workspace URL redirects to the login page, confirm whether the browser session is actually authenticated
- verify the correct account or saved Chrome profile is active
- escalate if MFA or credential entry is required

### Lead Cannot Be Found

- search by email
- search by phone
- search by full name
- check alternate inbox or pipeline views
- check whether the lead has already moved status

### Status Cannot Be Updated

- verify the correct field is being edited
- check for automation or permissions blocking the change
- inspect change history if available

### Permission Toast Or Access Error

If the UI shows an error like `Error: You do not have permissions to access companies`:

- confirm the active account has the permissions required for the current workflow in [auth_and_permissions.md](auth_and_permissions.md)
- retry the action after dismissing the toast
- if core lead views are blocked, escalate and document the missing permission boundary

### Email Cannot Be Sent

- verify the correct mailbox is connected
- verify the lead has a usable email address
- verify the CRM send UI actually completed

### Required Field Is Missing

- check whether it lives in another tab or custom-fields section
- use [field_map.md](field_map.md)
- escalate if the business concept has no visible CRM field

## Escalation Rules

Escalate when the issue blocks work and cannot be resolved from the documented UI path or field map.
