# Text Communication Domain

## Node Type

Process domain.

## Where You Are

This node owns SMS or text-message handling for lead follow-up.

## Responsibilities

This channel is responsible for:

- receiving handoff from email or other intake logic,
- checking that text outreach is allowed,
- using phone-based follow-up when it is the best next step,
- preserving context from prior qualification attempts.

## Expected Inputs

- phone number,
- consent status,
- lead summary,
- missing-information summary,
- prior email attempt history.

## Allowed Local Decisions

- whether text follow-up is permitted,
- whether the phone number is usable enough,
- whether texting should request missing information or simply re-open contact,
- whether the lead should remain open or escalate.

## Relationship To Sibling Nodes

This subtree is commonly entered from the email `text_fallback` branch. It should assume that email handling has already established some context and should not restart the workflow unnecessarily.

## Escalation Rules

- text consent is unclear,
- phone outreach policy conflicts with email policy,
- the change affects cross-channel routing contracts.
