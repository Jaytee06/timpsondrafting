# CRM System

## Node Type

System runbook root.

## Purpose

This subtree documents how an agent should operate the CRM user interface and related workspace actions.

## Scope

Use this subtree when the task requires browser or desktop-level interaction with the CRM, including:

- opening the CRM
- locating new or active leads
- reviewing lead fields
- choosing the next lead to work
- sending email from the CRM
- updating `workspace_status`
- recording communication preference
- working within the allowed CRM user permissions
- reviewing the entity `activity` log

## Expected Inputs

- access to desktop/browser control
- CRM workspace URL and login access if required
- a lead to review or a queue of leads
- workspace status definitions from [../../entities/workspace_status.md](../../entities/workspace_status.md)
- system user and permission context from [../../entities/system_user.md](../../entities/system_user.md)

## Child Nodes

- `navigation.md`
- `auth_and_permissions.md`
- `lead_pipelines.md`
- `field_map.md`
- `leads_inbox.md`
- `lead_detail_view.md`
- `send_email.md`
- `update_workspace_status.md`
- `troubleshooting.md`

## Routing Guidance

Stay here when the task is about CRM operations generally.

Descend when the task is about one exact CRM screen or one action sequence.

Escalate when:

- the CRM UI has changed enough that the runbook no longer matches
- login or permissions block access
- a required field or action cannot be found
- a documented status transition conflicts with actual business practice

This subtree is also a likely reference source for a future CRM operation skill if the UI workflow becomes stable and repetitive.
