# CRM Field Map

## Node Type

Reference.

## Purpose

This file maps the business concepts in the context tree to the actual fields visible in the CRM.

## Core Lead Fields

Document the exact CRM field names here:

- full name: `TODO`
- email: `TODO`
- phone: `TODO`
- project type: `TODO`
- description: `TODO`
- workspace status: `TODO`
- communication preference: `TODO`
- project priorities / what matters most: `TODO`
- prior process experience: `TODO`
- land status: `TODO`
- builder status: `TODO`
- timeline: `TODO`
- square footage: `TODO`
- budget range: `TODO`
- biggest concern: `TODO`
- plans ready goal: `TODO`
- project location: `TODO`
- project stage: `TODO`
- existing plans or files: `TODO`

## Qualification-Relevant Versus Supporting Fields

Qualification agents should prioritize:

- project type
- description
- email
- phone
- project location
- timeline
- square footage or dimensions when relevant
- project priorities
- prior process experience
- land status
- builder status
- budget range
- biggest concern
- plans ready goal
- project stage
- existing plans or files
- communication preference if already known

Marketing and attribution fields may still matter, but they are supporting context rather than the primary qualification decision inputs.

## Attribution Fields

If visible in the CRM, document where these appear:

- `gclid`: `TODO`
- `gbraid`: `TODO`
- `wbraid`: `TODO`
- `utm_source`: `TODO`
- `utm_campaign`: `TODO`
- `utm_term`: `TODO`
- `campaignid`: `TODO`
- landing page URL: `TODO`
- referrer: `TODO`

## Notes

If the CRM uses different labels than the docs, preserve both:

- business meaning
- CRM label

If the CRM has no dedicated field for one of the ordered qualification answers, preserve that answer in notes, comments, or the communication history summary rather than dropping it from the qualification record.

Operational rule:

- Prefer structured visible fields when a clear field exists.
- Use CRM comments for qualification answers or estimate-readiness facts that have no clear field.
- When both exist, save the structured field and comment only the additional context that the field cannot express.
- Comments should be written after reviewing the latest conversation and after saving any field updates.
- A comment should let the next qualification worker or estimator understand what changed in the latest pass without rereading the full conversation thread.
- Comments should be succint and well organized.

Common no-field or context-heavy facts to preserve in comments:

- budget range,
- what matters most / design priorities,
- biggest concern,
- additional notes,
- preferred communication channel,
- whether the requester is the homeowner, builder, contractor, or another decision-maker,
- site, permitting, HOA, utility, access, slope, zoning, or jurisdiction constraints,
- file, sketch, plan, photo, survey, or inspiration availability,
- any ambiguity, contradiction, correction, joke, or informal answer that needs normalization.

## Escalation Rules

- a required business field has no CRM equivalent
- multiple CRM fields could represent the same concept
- a field is write-only, hidden, or automation-controlled
