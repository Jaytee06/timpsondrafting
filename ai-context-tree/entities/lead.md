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

- `project_priorities`
- `prior_process_experience`
- `land_status`
- `builder_status`
- `square_footage`
- `budget_range`
- `biggest_concern`
- `plans_ready_goal`
- `project_city`
- `project_state`
- `project_stage`
- `timeline`
- `files`
- `additional_notes`
- `communication_preference`

## Operational Meaning

For a lead to be considered fully qualified, the system should be able to answer:

- who is asking,
- how they can be contacted,
- what project they are asking about,
- what matters most to them in the project,
- whether this is their first time through the process or not,
- whether land is secured yet,
- whether a builder is already involved,
- roughly how large the project should be,
- whether they have a budget range in mind,
- what they most want to get right,
- when they would ideally like plans ready,
- anything else they want the team to know before starting,
- whether text outreach is permitted,
- what communication channel they prefer for next steps, if already known,
- what attribution context accompanied the submission.

## Validation Notes

The current frontend already enforces some basic constraints, but downstream agents should not assume the data is perfect.

Important checks:

- email may still be syntactically or operationally invalid,
- phone may be present but unusable,
- project descriptions may be too vague for qualification,
- spam may survive lightweight frontend validation,
- attribution fields may be absent on organic traffic.
- consent to text should be used as a routing signal, not ignored as passive metadata

## Allowed Local Decisions

Agents working with a lead may:

- classify completeness,
- classify contactability,
- decide whether more information is required,
- choose the appropriate communication branch,
- route to text when `consent_to_text` is present and a usable phone path exists,
- leave a concise comment when no usable email or phone path exists and the lead cannot be contacted normally,
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
