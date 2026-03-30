# Branch: No Response

## Node Type

Branch outcome.

## Meaning

A valid outreach attempt was made, but the lead has not replied within the expected response window.

## Typical Triggers

- at least one prior email was sent,
- no usable response has been received,
- the lead remains open.
- no newer substantive reply is present in the communication history.

## Local Objective

Determine whether to wait longer, send one more follow-up, switch channels, or close the lead.

Do not use this branch when the lead has already replied with meaningful project details, even if the reply still leaves contradictions or missing fields.

## Allowed Local Decisions

- typically keep the lead in `contacted` unless a broader workspace policy says otherwise,
- issue a bounded follow-up,
- hand off to `text_fallback` if supported,
- close after local policy is exhausted.

## Escalation Rules

- the permitted follow-up cadence is undefined,
- cross-channel retry policy is changing,
- closure rules affect reporting or CRM automation.
