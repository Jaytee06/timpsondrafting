# Lead Entity

## Node Type

Entity definition.

## Purpose

`Lead` is the primary business entity in this system. It represents a person or organization that submitted an inquiry through the landing page or entered the qualification workflow through an equivalent intake path.

## Expected Inputs

The current frontend and adjacent systems may provide:

- `full_name`
- `email`
- `phone`
- `project_type`
- `description`
- `consent_to_text`
- `website` (honeypot)
- `keyword`
- `gclid`
- `gbraid`
- `wbraid`
- `campaignid`
- `utm_source`
- `utm_campaign`
- `utm_term`
- `landingPageUrl`
- `referrer`
- file attachments

Later qualification or follow-up may also introduce:

- `square_footage`
- `project_location`
- `project_stage`
- `timeline`
- `existing_plans_or_files`
- `communication_preference`

## Operational Meaning

A lead should answer, at minimum:

- who is asking,
- how they can be contacted,
- what project they are asking about,
- whether text outreach is permitted,
- what communication channel they prefer for next steps,
- what attribution context accompanied the submission.

## Validation Notes

The current frontend already enforces some basic constraints, but downstream agents should not assume the data is perfect.

Important checks:

- email may still be syntactically or operationally invalid,
- phone may be present but unusable,
- project descriptions may be too vague for qualification,
- spam may survive lightweight frontend validation,
- attribution fields may be absent on organic traffic.

## Allowed Local Decisions

Agents working with a lead may:

- classify completeness,
- classify contactability,
- decide whether more information is required,
- choose the appropriate communication branch,
- preserve attribution metadata through downstream handling.

Agents should not:

- redefine lead field names locally,
- discard attribution data without cause,
- assume consent beyond the fields present,
- silently reinterpret malformed data without documenting the assumption.

## Escalation Rules

- a new canonical lead field is needed,
- field naming must change,
- qualification policy changes across the entire system,
- compliance interpretation of consent changes.
