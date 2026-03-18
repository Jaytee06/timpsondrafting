# Service-Specific Follow-Up: Home Addition

## Node Type

Decision reference.

## Purpose

This file defines the communication step for gathering the extra project details that are commonly needed when the lead is a home addition inquiry.

Use it to turn a generally valid addition lead into a lead with enough detail for meaningful qualification and estimate preparation.

## When To Use This Node

Use this node when:

- `project_type` is `addition` or `home addition`,
- the description clearly indicates an addition to an existing home,
- the lead is real and contactable,
- generic intake details are not enough to understand the addition scope.

## Expected Inputs

- existing lead record
- current workspace status
- prior communication history
- current known project description
- any existing files or photos already attached

## Required Addition Follow-Up Fields

Request the minimum missing details needed to understand the addition:

- what type of addition is planned
- approximate size of the addition
- whether it is single-story, upper-story, or otherwise tied into the existing roof structure
- what part of the existing home is being expanded or reworked
- project location
- current project stage
- whether the lead has existing plans, sketches, surveys, or photos

## Strongly Preferred Addition Fields

- target timeline
- whether the work is for more living space, a garage conversion, a bedroom/bathroom expansion, or another use
- whether structural openings or major interior rework are expected in the existing home
- whether HOA, zoning, setback, or permitting constraints are already known
- whether the requester is the homeowner or another decision-maker

## Communication Guidance

Keep the first clarification request short and specific.

For an addition lead, the first message should usually ask for:

- the kind of addition being planned
- approximate square footage or dimensions
- the property address or city
- whether any sketches, plans, or photos already exist

If the lead replies and still leaves estimate-blocking gaps, send one narrower follow-up for the remaining unknowns instead of repeating the whole questionnaire.

## Suggested Prompt Pattern

`Thanks for reaching out about your addition project. To help us review it, please reply with:`

- `what kind of addition you want to build,`
- `the approximate size or dimensions,`
- `the property location,`
- `whether you have any existing plans, sketches, or photos,`
- `and anything important about how it connects to the existing house.`

## Status Guidance

- keep the lead in `fresh` if no real outreach has been sent yet
- move to `contacted` once the addition clarification request has been sent
- move to `qualified` once the generic post-contact fields and the key addition details are substantially known

## Escalation Rules

- estimate requirements differ materially between types of additions and need their own deeper subtree
- the CRM has no consistent place to store the added scope details
- the requested information would create new shared lead fields rather than local qualification notes
