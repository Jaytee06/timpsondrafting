# Branch: Invalid Email

## Node Type

Branch outcome.

## Meaning

The lead exists, but the provided email is not usable enough for reliable email follow-up.

## Typical Triggers

- malformed address,
- obvious placeholder or fake address,
- prior bounce or delivery failure,
- contradictory contact data suggesting the email cannot work.

## Local Objective

Avoid wasting effort on an email path that is unlikely to succeed.

## Allowed Local Decisions

- keep the workspace status aligned with the real sales stage while separately flagging the contact issue,
- check whether phone and text consent support alternate outreach,
- hand off to `text_fallback` when appropriate,
- escalate if no valid communication path exists.

## Escalation Rules

- the lead has no other viable contact method,
- compliance interpretation of fallback is unclear,
- the CRM requires a different invalid-contact handling policy.
