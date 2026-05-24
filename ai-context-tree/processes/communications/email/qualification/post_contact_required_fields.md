# Post-Contact Required Fields

## Node Type

Decision reference.

## Purpose

This file defines the information that should usually be gathered after initial contact, once a lead appears real and in scope, but before estimating or deeper project handling.

## When To Use This Node

Use this node after the lead has moved beyond raw intake and the next goal is to collect enough detail to support qualification, estimating, and channel preference.

## Expected Inputs

- existing lead record
- current workspace status
- current communication channel
- prior responses from the lead
- any contradictions between older stored fields and the newest lead reply
- latest CRM comment summary when visible fields do not contain all qualification answers

## Required Post-Contact Fields

- enough detail to answer `Tell me a little about what you're trying to build?`
- `project_priorities`
- `prior_process_experience`
- `land_status`
- `builder_status`
- approximate `square_footage` or project size
- `budget_range`
- `biggest_concern`
- `plans_ready_goal`
- `additional_notes` when the lead has extra context they want preserved

## Strongly Preferred Fields

- clearer `project_type` if still ambiguous
- `project_city`
- `project_state`
- current `project_stage`
- target `timeline`
- whether the lead has `files`
- whether the requester is the homeowner, contractor, or another decision-maker
- known site or permitting constraints
- preferred communication channel for next steps

## Ordered Qualification Questions

These questions define the canonical qualification structure. Ask them in this order, skipping only the ones already answered by the lead's current record or reply history:

1. `Tell me a little about what you're trying to build.`
2. `What matters most to you in this project?`
3. `Have you gone through this process before, or is this your first time?`
4. `Do you already have land secured, or are you still figuring that out?`
5. `Are you working with a builder yet?`
6. `Roughly how big are you thinking (square footage)?`
7. `Do you have a budget range in mind?`
8. `What's your biggest concern or thing you want to get right?`
9. `If everything went smoothly, when would you love to have plans ready?`
10. `Anything else you want me to know before we get started?`

If the lead answers with a clear `not yet`, `still figuring that out`, `first time`, or similar early-stage response, treat that as usable qualification evidence rather than missing data.

If the service type is known and requires more detailed scoping, descend into a service-specific follow-up node before treating the lead as fully qualified.

If the newest lead reply contradicts older stored lead data, do not treat the contradiction itself as a stopping condition. Resolve it through a narrower clarification question before escalating to human review.

## Comment Preservation Requirement

Some qualification answers do not have dedicated CRM fields. Do not drop those answers just because they cannot be saved into the lead form.

After each meaningful lead response, preserve no-field answers in a succinct CRM comment after saving any visible fields that do exist. Switch the lead activity area back to `Comments`, then post a delta-oriented operational update that captures only what is new, changed, or still blocking from the latest exchange:

- newly learned qualification facts,
- facts relevant to estimate readiness,
- any remaining blocker or next question,
- any normalized interpretation of informal, joking, contradictory, or corrected language.

Do not re-summarize older comment highlights or restate the full lead history. Older comments remain part of the CRM record. Repeat an older fact only when the newest reply changes it, contradicts it, or makes it necessary to explain the current qualification decision.

Examples of facts that usually need comment preservation unless a visible CRM field exists:

- `budget_range`,
- `project_priorities`,
- `biggest_concern`,
- `additional_notes`,
- communication preference,
- decision-maker or homeowner/contractor role,
- file/sketch/photo availability,
- site, permitting, HOA, utility, slope, access, or other constraints,
- estimate-readiness judgment.

Preferred comment shape:

`Qualification update: [new or changed facts]. Remaining before estimate: [missing item or next action].`

If the agent sends a follow-up because the reply is still incomplete, the comment should state the question just asked and why it matters. If the lead becomes qualified, the comment should state the newest facts that changed the qualification decision and any caveat the estimator should know, without replaying older summaries.

Current service-specific reference:

- [service_specific/addition.md](service_specific/addition.md)

## Channel Preference Prompt

Once a lead is qualified enough to continue, the agent may ask:

`Do you prefer to keep using this same communication channel, or would you rather use text, email, or phone calls for next steps?`

The answer should be stored as a communication preference and used for subsequent outreach.

## Status Guidance

Typical progression:

- use `fresh` for newly captured leads not yet worked,
- move to `contacted` once outreach begins or a follow-up exchange is active,
- move to `qualified` once the lead is in scope and the ordered qualification questions are substantially answered,
- move to `estimate_sent` only after the estimate has actually been delivered.

If the lead is responsive but still ambiguous, keep the lead in `contacted` while clarification continues.

## Escalation Rules

- required estimate inputs differ by service type and need their own subtree,
- communication preference conflicts with consent or available contact data,
- workspace status transitions need to change globally.
