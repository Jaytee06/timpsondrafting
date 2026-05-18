# Required Fields For Email Qualification

## Node Type

Decision reference.

## Purpose

This file defines the minimum information needed to treat a lead as qualified for normal email follow-up.

## Minimum Required Data

- identifiable sender name or equivalent human identifier,
- at least one usable contact method,
- understandable project category or project description,
- enough detail to continue the conversation productively.

## Preferred Fields

- `full_name`
- `email`
- `phone`
- `project_type`
- `description`

## Qualification Threshold

A lead can usually qualify through email when all of the following are true:

- the email appears usable,
- the lead identity is not obviously fake,
- the project description is meaningful,
- the request is relevant to residential drafting or adjacent services,
- the ordered qualification discovery structure has been covered enough to continue without guessing basic facts.

## Ordered Qualification Discovery Structure

Do not consider a lead fully `qualified` until the agent has asked, in order, for the substance of these questions and received usable answers or equivalent evidence:

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

Equivalent information already present in the lead, CRM history, or later replies can satisfy one or more of these questions without repeating them verbatim.

An explicit early-stage answer still counts as usable qualification evidence. For example:

- `this is my first time`
- `we do not have land yet`
- `no builder yet`
- `I do not have a budget yet`

## Missing-Information Threshold

Route to `missing_fields` when the next human responder would still need to ask one or more unanswered discovery questions before any useful follow-up can occur.

Common examples:

- no meaningful project description,
- no project type and vague free text,
- name omitted or clearly placeholder text,
- only one fragmentary sentence with no project context.

## Routing Note

If email is weak or absent but phone and text consent are strong, the correct next step may be `text_fallback` rather than repeated email attempts.

For information that should be gathered after initial contact, see [post_contact_required_fields.md](post_contact_required_fields.md).
