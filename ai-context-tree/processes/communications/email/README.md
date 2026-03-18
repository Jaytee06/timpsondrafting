# Email Communication Domain

## Node Type

Process domain.

## Where You Are

This node owns email as a communication channel for lead follow-up and qualification.

## Responsibilities

Email is responsible for:

- determining whether the lead can be handled through email,
- applying email-specific qualification checks,
- choosing the correct response branch,
- using templates appropriate to the lead state,
- deciding when email should yield to text fallback or closure.

## Expected Inputs

- lead identity and project details,
- provided email address,
- phone number and text consent,
- prior outreach attempts,
- current workspace status.

## Allowed Local Decisions

- whether the email address is usable enough to proceed,
- whether required information is missing,
- whether the lead is immediately qualified,
- whether to send a clarification email,
- whether to hand off to text fallback.

## Local References

Preferred local references:

- `skill_email.md`
- `qualification/`

Agents may:

- inspect templates,
- classify branch conditions,
- route to sibling `text/` when policy allows.

## Child Nodes

- `qualification/`: the email qualification workflow and branch rules.

## Routing Guidance

Stay here when the task is generally about email operations.

Descend into `qualification/` when the task is about required fields, decision rules, or branch selection.

Escalate upward when the decision becomes cross-channel or changes shared lead semantics.
