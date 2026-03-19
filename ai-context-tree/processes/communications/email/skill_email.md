# Email Skill Contract

## Node Type

Skill contract.

## Purpose

This file defines the local operating skill for agents working inside the email subtree.

## Objective

Handle email-based lead qualification in a way that is:

- operationally consistent,
- conservative with assumptions,
- easy to route,
- compatible with the broader intake state machine.

## Expected Inputs

Expect some or all of:

- `full_name`
- `email`
- `phone`
- `project_type`
- `description`
- `consent_to_text`
- prior email attempt history
- current workspace status

## Allowed Local Decisions

- classify the lead's current communication outcome and align it with the correct workspace status,
- select the matching qualification branch,
- use or update local templates,
- recommend text fallback if email is not viable and text is permitted.

Do not force an email-first workflow when `consent_to_text` is already present and a usable phone path exists.

## Disallowed Local Decisions

- redefine global states,
- overwrite shared entity definitions,
- assume contact consent not present in source data,
- create cross-channel policy without updating parent docs.

## Routing Guidance

Hand off deeper into `qualification/` when a concrete branch decision is needed.

Hand off sideways to `../text/` when:

- email is unavailable or failing,
- text consent exists,
- direct text routing from `fresh` is the documented first channel,
- the fallback rule applies.

Hand off upward when:

- the issue is really about communications policy in general,
- a CRM or compliance contract is implicated,
- the lead cannot be resolved by channel-local rules.
