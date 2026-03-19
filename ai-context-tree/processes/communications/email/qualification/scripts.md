# Email Qualification Scripts

## Node Type

Script reference.

## Purpose

This file stores simple reusable outreach scripts for the qualification workflow.

Use these scripts when the lead is in `Fresh`, initial contact has not yet been sent, and the next action is to gather the minimum additional fields needed to move the lead forward.

## Usage Rules

- read the entity fields and the description field before choosing or drafting a script
- pick the narrowest script that matches the missing information
- personalize the message with the lead's known name, project type, and any concrete scope detail already present
- only ask for information that is still missing or still ambiguous from the visible CRM context
- ask for only a few missing fields at a time
- keep the tone concise and operational
- use the CRM's `Custom Message` email template when sending these scripts from the UI

Do not send a script as a rigid checklist if the CRM already answers some of the questions.

Adapt the script to the entity:

- omit questions already answered by the current fields or description
- prefer conditional wording when only part of the information is missing
- if the description already identifies the project type, do not ask for project type again
- if the description suggests a service-specific branch such as an addition, use that branch and only ask for the missing addition details

## Script: Generic Initial Contact

Use when the lead is real and contactable, but the current details are too thin for qualification.

This is the default script for `Test Scenario 1` when the developer test lead is the first valid email case being exercised.

Suggested subject:

`A few details needed for your quote request`

Suggested body:

`Hi [First Name],`

`Thanks for reaching out to Timpson Drafting & Design about your project. To help us review it, please reply with the missing details below:`

- `project type`
- `project location`
- `approximate size or square footage`
- `timeline`

`Once we have that, we can follow up with next steps.`

Use only the bullets that are still missing from the current record.

## Script: Home Addition Initial Contact

Use when the lead is clearly asking about an addition and the next step is to gather addition-specific scope details.

Suggested subject:

`A few details about your addition project`

Suggested body:

`Hi [First Name],`

`Thanks for reaching out about your addition project. To help us review it, please reply with the missing details below:`

- `what kind of addition you want to build`
- `the approximate size or dimensions`
- `the project location`
- `whether you have any plans, sketches, or photos`
- `anything important about how it connects to the existing house`

`Once we have that, we can review next steps with you.`

Do not ask for addition details that are already clear from the entity fields or description.

## Escalation Rules

- no existing script fits the missing-information pattern
- the required questions would be too long for one email
- the script would introduce a new shared policy rather than a local wording change
