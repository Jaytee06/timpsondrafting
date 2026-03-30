# Email Qualification Decision Rules

## Node Type

Decision reference.

## Purpose

This file provides the branch-selection logic for email qualification.

## Evaluation Order

Evaluate in this order:

1. Spam or obviously irrelevant inquiry
2. Invalid or unusable email
3. Missing required qualification fields
4. No response after permitted outreach
5. Text fallback conditions
6. Qualified

## Branch Rules

### Obvious Spam Or Irrelevant Inquiry

If the entity is clearly spam, irrelevant, or non-actionable, do not force it through the normal qualification branches.

Typical next outcome:

- record the reason in notes
- if the text is an obvious solicitation or spam pitch, treat it as non-actionable immediately from `Fresh`
- move the entity toward `lost_na` or the CRM-equivalent non-actionable outcome

Implementation `TODO`:

- decide whether obvious spam/solicitation should set a dedicated lead field,
- decide whether the primary operational action should be a direct move to `Lost - N/A` / `lost_na`,
- document the final rule once the CRM implementation choice is made.

### Duplicate Or Already Worked Entity

If the entity is a duplicate or has already been meaningfully worked by another user, do not restart qualification from scratch.

Typical next outcome:

- link or note the duplication if the CRM supports it
- preserve the more authoritative record
- keep or move the entity to the status that reflects the real active record

### Invalid Email

Choose `invalid_email` when:

- the email is malformed,
- the address is obviously fake,
- prior delivery failed or bounced,
- the address cannot reasonably support follow-up.

### Missing Fields

Choose `missing_fields` when:

- contactability is acceptable,
- the inquiry is relevant,
- but required project or identity context is too weak.
- or the newest reply introduces contradictions or ambiguity that can be resolved with one or more targeted clarification questions.

This is a common outcome for entities first opened from `Fresh`.

When this branch applies after a real reply, keep the lead active and continue clarification. Do not treat the contradiction itself as a reason to stop work.

When the lead has already given substantive new information, the next message should be a targeted clarification request, not a generic `no_response` follow-up.

### No Response

Choose `no_response` when:

- a valid outreach attempt has already occurred,
- the response window has expired by local policy,
- there is not yet enough signal to close or qualify.
- no newer substantive reply is present.

Do not choose `no_response` when the lead has already replied with new project information, even if important contradictions or gaps remain.

### Text Fallback

Choose `text_fallback` when:

- email is absent, invalid, or ineffective,
- phone is available,
- consent supports text outreach,
- texting is the next best operational move.

### Qualified

Choose `qualified` when:

- the lead is contactable,
- the project is in scope,
- the available information is sufficient for normal follow-up,
- any material contradictions in the lead record have been resolved enough to continue without guessing,
- no narrower exception branch better explains the case.

When a lead qualifies and next-step handling should continue, the agent may also request preferred communication channel if it is not yet known.

## Escalation Rules

Escalate upward if branch ordering itself needs to change across multiple channels or agent roles.

Escalate for human review only after normal clarification work is exhausted and the lead still cannot be qualified or cleanly routed.
