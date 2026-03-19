# Workspace Status Entity

## Node Type

Entity definition.

## Purpose

`Workspace Status` is the normalized status label used to describe where a lead currently sits in the working sales or qualification process.

In the CRM, each entity belongs to a workspace, and within that workspace the entity belongs to exactly one workspace status.

## Canonical Values

- `fresh`
- `contacted`
- `qualified`
- `estimate_sent` or display label `Estimate Sent`
- `won`
- `lost_na` or display label `Lost - N/A`

These values are the current working status set. They may evolve, but local docs should treat them as the canonical workspace labels until the root docs are updated.

## Operational Meaning

Agents use workspace status to answer:

- what action is next,
- whether a lead still needs outreach,
- whether qualification is complete,
- whether an estimate has already been sent,
- whether the opportunity is still active.

Default intake rule:

- CRM-integrated leads enter the workspace in `fresh`
- the `fresh` handler decides whether the lead should continue through email, text, qualification, or closure

For the typical move from first contact into `qualified`, see [../processes/communications/email/qualification/post_contact_required_fields.md](../processes/communications/email/qualification/post_contact_required_fields.md).

## Constraints

Workspace status should be:

- mutually understandable across process domains,
- coarse enough for routing and reporting,
- stable enough for reporting and CRM mapping.

Local branches may add reasons, notes, or flags, but should not invent incompatible status names without root-level updates.

## Escalation Rules

- a status is ambiguous in the workspace or CRM,
- a new status is needed globally,
- CRM mapping depends on status renaming,
- reporting logic assumes a state model different from this one.
