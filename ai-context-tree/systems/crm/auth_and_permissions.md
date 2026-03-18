# CRM Auth And Permissions

## Node Type

System runbook.

## Purpose

This file defines the authentication and permission assumptions for CRM operation.

## Restart And Failure Routing

If authentication or permissions block CRM work:

- Use [troubleshooting.md](troubleshooting.md) (especially **Cannot Log In**).
- After resolving, restart at [navigation.md](navigation.md) and re-verify permissions using the checklist below.

## Related Entity

See [../../entities/system_user.md](../../entities/system_user.md).

## Current Placeholder Assumption

The CRM should create and manage a `system_user` account with the permissions needed for normal lead-management workflows.

This may later branch into multiple user types with distinct permissions.

Current known access assumption:

- the agent may enter through an already authenticated browser session
- the browser may already hold the bearer token needed for access
- if no valid session or token is present, the agent must use the CRM login flow
- long-term handling of login, bearer tokens, and permissions remains CRM-defined

## Test Credentials

Do not store credentials in this repository.

If testing credentials exist, they must be supplied through an approved operator path at runtime and rotated as needed.

## Tasks That Depend On Permissions

- opening the CRM
- viewing leads
- viewing custom fields
- sending email
- updating `workspace_status`
- viewing attachments
- viewing activity history
- editing communication preference

## Required Human Inputs

Document the real auth model here:

- development CRM URL: `http://localhost:4930`
- CRM workspace URL: `https://app.timpsondrafting.com/op/ws/kbCGfx2A`
- login method: email + password form at `https://app.timpsondrafting.com/auth/login` when not already authenticated
- whether Chrome session reuse is expected: yes, when a valid browser session already exists
- whether MFA exists: `TODO` (not observed yet)
- default user type for agent operation: `TODO`
- restricted actions: `TODO`
- permission differences between user types: `TODO`

Operational note:

- Do not store raw bearer tokens in this repository. If a token is required for runtime access, it must be supplied through an approved operator path and treated as ephemeral.

## Verification Checklist

Before relying on a CRM session, confirm:

- the expected account is logged in
- the session or bearer token is still valid
- the account can view the lead queue
- the account can open a lead
- the account can send email if required
- the account can edit `workspace_status` if required

If any checklist item fails, route to [troubleshooting.md](troubleshooting.md) and treat the CRM as not ready for autonomous operation until resolved.

## Future User Types

Reserve this section for the real permission model, for example:

- admin
- operator
- sales
- reviewer
- read-only

## Escalation Rules

- login requires human intervention
- bearer token or browser session is missing or expired
- the active account lacks a required permission
- a workflow step fails because of permissions
- the documented account type does not match actual CRM behavior
