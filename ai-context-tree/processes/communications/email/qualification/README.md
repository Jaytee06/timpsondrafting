# Email Qualification Workflow

## Node Type

Process workflow.

## Where You Are

This node owns the decision logic for classifying an email-handled lead into a concrete qualification branch.

## Responsibilities

This workflow determines:

- what information is required,
- whether the lead is complete enough,
- whether the email is usable,
- whether follow-up should request clarification,
- whether the lead should move to text fallback,
- whether the lead is fully qualified.

## Expected Inputs

- lead fields,
- email address,
- phone number,
- project description,
- consent flags,
- prior outreach state.

## Child Nodes

- `required_fields.md`
- `post_contact_required_fields.md`
- `scripts.md`
- `service_specific/`
- `fresh_queue_workflow.md`
- `decision_rules.md`
- `templates.md`
- `branches/`

## Decision Standard

Choose the narrowest branch that explains the current lead state without inventing facts.

If a lead has multiple problems, prefer the branch that best explains the next operational action.

Examples:

- invalid email plus otherwise good data usually goes to `invalid_email`.
- usable email but weak project detail usually goes to `missing_fields`.
- no email response after allowed attempts goes to `no_response`.
- strong information and usable contact method goes to `qualified`.

## Routing Guidance

Stay here when you are selecting a branch or editing shared qualification rules.

Before staying in email, first verify that text is not the primary allowed channel for this lead.

If `consent_to_text` is checked and a usable phone path exists, route toward the text subtree instead of starting normal email qualification.

If neither usable email nor usable phone exists, leave a concise CRM comment documenting the contact problem and do not pretend the lead is contactable.

Descend into `branches/` when handling one specific outcome.

Descend into `service_specific/` when the lead is already classifiable, but the next question set depends on the service type, such as a home addition lead that needs addition-specific scope details.

Escalate upward if the change would affect non-email qualification logic too.
