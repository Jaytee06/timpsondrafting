# System Overview

## Node Type

Global system map.

## Purpose

This system exists to convert website traffic into qualified residential drafting leads for Timpson Drafting & Design.

The production behavior currently centers on:

- a single-page marketing site,
- lead capture through the contact form,
- attribution capture from Google Ads and UTM parameters,
- submission into a custom CRM endpoint,
- optional file attachments,
- post-submit conversion tracking.

## Primary Surfaces

### Frontend Site

The frontend is the active intake surface. It:

- presents the business offer,
- guides visitors to request a quote,
- collects lead details,
- stores campaign attribution in session storage,
- submits lead payloads to the CRM webhook,
- triggers a Google Ads conversion event after successful submission.

### CRM Webhook

The CRM endpoint is the current system of record for submitted web leads. Agents should assume:

- the webhook is the authoritative downstream handoff point,
- the form payload structure matters,
- attribution fields are intentionally preserved for marketing analysis,
- changes to field names are integration-sensitive.

### Legacy Or Alternate Backend

The `backend/` folder appears to represent an alternate or older serverless intake path. It includes:

- multipart form parsing,
- email delivery through AWS SES,
- spam heuristics,
- IP blacklist handling.

Unless confirmed otherwise, agents should treat this backend as reference infrastructure rather than the active submission path for the frontend.

## Core Entities

- `Lead`: the prospective customer record assembled from form data and attribution metadata.
- `Workspace Status`: the working status label applied as the lead moves through outreach, qualification, estimating, and closeout.
- `System User`: the authenticated account concept for CRM access, permissions, and future user types.

Entity definitions live in `entities/`.

## Core Process Domains

- `communications/`: all outbound and inbound communication handling.
- `communications/email/`: email-specific lead qualification and response rules.
- `communications/text/`: SMS or texting behavior and fallback expectations.

Process definitions live in `processes/`.

## Core System Runbooks

- `systems/crm/`: browser and UI runbooks for operating the CRM workspace.
- `systems/crm/auth_and_permissions.md`: CRM account, auth, and permission assumptions.

System operation runbooks live in `systems/`.

## Routing Guidance

Stay at the root when the task is about:

- system-wide architecture,
- cross-process coordination,
- shared vocabulary,
- state-machine changes,
- role boundaries.

Descend into a child node when the task is about:

- one communication channel,
- one workflow stage,
- one branch condition,
- one role.

Escalate upward when a local decision would:

- change global entity definitions,
- alter state transitions,
- rename shared fields,
- modify compliance-sensitive communication behavior,
- affect other sibling branches.
