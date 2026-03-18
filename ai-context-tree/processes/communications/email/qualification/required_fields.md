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
- the next-step response can be drafted without guessing basic facts.

## Missing-Information Threshold

Route to `missing_fields` when the next human responder would need to ask obvious baseline questions before any useful follow-up can occur.

Common examples:

- no meaningful project description,
- no project type and vague free text,
- name omitted or clearly placeholder text,
- only one fragmentary sentence with no project context.

## Routing Note

If email is weak or absent but phone and text consent are strong, the correct next step may be `text_fallback` rather than repeated email attempts.

For information that should be gathered after initial contact, see [post_contact_required_fields.md](post_contact_required_fields.md).
