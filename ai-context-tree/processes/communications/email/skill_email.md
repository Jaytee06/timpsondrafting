# Email Skill Contract

## Node Type

Skill contract.

## Purpose

This file defines the local operating skill for agents working inside the email subtree.

## Objective

Handle email-based lead qualification in a way that is:

- operationally consistent,
- conservative with assumptions,
- persistent about clarification,
- professionally written,
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
- newest meaningful inbound reply, if one exists
- contradictions between stored lead data and the latest reply
- current workspace status

## Allowed Local Decisions

- classify the lead's current communication outcome and align it with the correct workspace status,
- select the matching qualification branch,
- continue contacting a real lead when the latest reply is incomplete or contradictory,
- send a targeted clarification request that resolves the smallest blocking question next,
- prefer a custom clarification message over a generic follow-up when the lead already supplied substantive details,
- block or retry an outbound send when the final message body is malformed, placeholder-like, or not the reviewed professional content,
- perform one clean retry when the send path fails without a trustworthy verification result,
- classify the outcome as a verification conflict when CRM and external evidence do not agree,
- use or update local templates,
- recommend text fallback if email is not viable and text is permitted.

Do not force an email-first workflow when `consent_to_text` is already present and a usable phone path exists.

## Disallowed Local Decisions

- redefine global states,
- overwrite shared entity definitions,
- assume contact consent not present in source data,
- stop active qualification solely because the latest reply contradicts older field values,
- use the `no_response` branch or template when a newer substantive reply is present,
- send debug text, placeholder text, partial drafts, or other unprofessional content to a lead,
- continue retrying an unstable send flow beyond one clean retry,
- report that no email was sent when the available evidence is actually conflicting,
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
- the send result remains ambiguous after one clean retry,
- the lead remains unresolved after bounded clarification work and now needs real human judgment.
