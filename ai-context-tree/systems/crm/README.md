# CRM System

## Node Type

System runbook root.

## Purpose

This subtree documents how an agent should operate the CRM user interface and related workspace actions.

Primary operating mode:

- use browser navigation and browser interaction against the CRM UI
- treat the CRM as an existing browser-accessed system
- use `https://app.timpsondrafting.com/op/ws/kbCGfx2A` as the default workspace entry point unless a different workspace is explicitly assigned
- do not start, restart, or manage CRM infrastructure unless the task explicitly requires server work
- do not substitute API-only or mock-data-only handling when the task is to work the CRM UI

Selector note:

- until explicit UI selectors are documented, agents should use semantic browser navigation based on visible labels and stable layout cues
- if the CRM is updated later with stable attributes such as `data-test-id`, record them in these runbooks and prefer them over visual matching

History note:

- entity communication history and activity history are found near the bottom of the opened record
- a dropdown in that area switches between available history types
- individual entries can usually be expanded for more detail and should be reviewed before making routing decisions

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
