# Post-Contact Required Fields

## Node Type

Decision reference.

## Purpose

This file defines the information that should usually be gathered after initial contact, once a lead appears real and in scope, but before estimating or deeper project handling.

## When To Use This Node

Use this node after the lead has moved beyond raw intake and the next goal is to collect enough detail to support qualification, estimating, and channel preference.

## Expected Inputs

- existing lead record
- current workspace status
- current communication channel
- prior responses from the lead

## Required Post-Contact Fields

- clearer `project_type` if still ambiguous
- approximate `square_footage` or project size
- `project_location`
- current `project_stage`
- enough scope detail to understand what is being designed or drafted
- preferred communication channel for next steps

## Strongly Preferred Fields

- target `timeline`
- whether the lead has `existing_plans_or_files`
- whether the requester is the homeowner, contractor, or another decision-maker
- known site or permitting constraints

If the service type is known and requires more detailed scoping, descend into a service-specific follow-up node before treating the lead as fully qualified.

Current service-specific reference:

- [service_specific/addition.md](service_specific/addition.md)

## Channel Preference Prompt

Once a lead is qualified enough to continue, the agent may ask:

`Do you prefer to keep using this same communication channel, or would you rather use text, email, or phone calls for next steps?`

The answer should be stored as a communication preference and used for subsequent outreach.

## Status Guidance

Typical progression:

- use `fresh` for newly captured leads not yet worked,
- move to `contacted` once outreach begins or a follow-up exchange is active,
- move to `qualified` once the lead is in scope and the key post-contact fields are substantially known,
- move to `estimate_sent` only after the estimate has actually been delivered.

## Escalation Rules

- required estimate inputs differ by service type and need their own subtree,
- communication preference conflicts with consent or available contact data,
- workspace status transitions need to change globally.
