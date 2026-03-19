# Communications Process Domain

## Node Type

Process domain.

## Where You Are

This node owns outbound and inbound communication behavior after a lead exists.

## Responsibilities

This domain is responsible for:

- selecting the right communication channel,
- preserving context between intake and outreach,
- deciding whether a lead is complete enough to respond to,
- routing unclear, incomplete, or invalid cases into the correct branch,
- determining when follow-up should continue or stop.

## Expected Inputs

- a lead record or equivalent form payload,
- contact fields,
- project scope details,
- consent indicators,
- attribution context,
- prior communication status.

## Allowed Local Decisions

- whether to work in email or text,
- whether the lead is qualified enough for normal follow-up,
- whether missing data must be requested,
- whether contactability is questionable,
- whether escalation to another channel is appropriate.

Current routing rule:

- if `consent_to_text` is checked and a usable phone exists, route into the text pipeline
- otherwise use email when a usable email exists
- if neither usable email nor usable phone is available, leave a concise CRM comment explaining the contact problem

## Child Nodes

- `email/`: email-specific operating rules and qualification workflow.
- `text/`: text-message-specific operating rules and fallback behavior.

## Routing Guidance

Stay here when the task is cross-channel.

Descend when the task is channel-specific.

Escalate upward when the decision changes:

- entity definitions,
- system-wide state transitions,
- consent interpretation,
- CRM field contracts.
