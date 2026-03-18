# System User Entity

## Node Type

Entity definition.

## Purpose

`System User` represents an authenticated account used to access internal systems such as the CRM.

## Scope

This is a placeholder entity for the account model that the CRM should create and manage. It exists so authentication, authorization, and future user-type distinctions have an explicit home in the context tree.

## Expected Attributes

The final model may change, but likely includes:

- user identifier
- display name
- email or login credential
- auth method
- permission set
- role or user type
- active/inactive status
- linked workspace or organization

## Current Placeholder User Types

These are not final. They exist to reserve space for future differentiation:

- `system_user`
- `admin_user`
- `agent_user`
- `sales_user`
- `read_only_user`

## Test User Placeholder

Do not store real credentials in this repository.

If a testing-only user exists, reference it only in general terms (for example: "a dedicated test user") and supply credentials through an approved operator path at runtime.

## Operational Meaning

A system user answers:

- who is acting in the CRM
- what screens and actions they may access
- what permissions they hold
- whether autonomous browser actions are allowed under that account

## Allowed Local Decisions

Agents may:

- reference the existence of a system user
- document required permissions for workflows
- note when a task depends on a specific user type or permission boundary

Agents should not:

- assume the permission model is finalized
- invent production roles without documenting them as placeholders
- assume a browser session is authenticated unless verified

## Escalation Rules

- the CRM permission model becomes important to a workflow
- a new user type needs canonical definition
- auth behavior changes operational instructions
- sensitive actions require tighter role separation
