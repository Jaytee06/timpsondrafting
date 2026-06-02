# System Overview

## Node Type

Global system map.

## Purpose

This system exists to convert website traffic into qualified residential drafting leads for Timpson Drafting & Design.


The current development behavior centers on:

- a single-page marketing site,
- lead capture through the contact form,
- attribution capture from Google Ads and UTM parameters,
- submission into a custom CRM endpoint,
- optional file attachments,
- post-submit conversion tracking,
- recurring paid-search and landing-page optimization.

## Primary Surfaces

### Frontend Site

The frontend is the active local intake surface. It:

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
- changes to field names are integration-sensitive,
- newly created leads are placed into the CRM workspace in `fresh`
- downstream agents are responsible for selecting the correct next workspace status and communication branch from there

### Google Ads And Marketing Optimization

Google Ads is the current paid-search demand source and should be treated as an externally visible business system. Agents may inspect campaign, search-term, and Auction Insights data when access or exports are available.

Marketing optimization should connect:

- account performance,
- competitor pressure,
- search intent,
- landing page message match,
- CRM lead quality when available.

The weekly marketing probe lives in [processes/marketing/weekly_probe.md](processes/marketing/weekly_probe.md). Google Ads UI runbooks live in [systems/google_ads/](systems/google_ads/).

### Legacy Or Alternate Backend

The `backend/` folder appears to represent an alternate or older serverless intake path. It includes:

- multipart form parsing,
- email delivery through AWS SES,
- spam heuristics,
- IP blacklist handling.

Unless confirmed otherwise, agents should treat this backend as reference infrastructure rather than the active submission path for the frontend.

## Core Entities

- [Lead](entities/lead.md): the prospective customer record assembled from form data and attribution metadata.
- [Workspace Status](entities/workspace_status.md): the status an entity belongs to inside a CRM workspace as it moves through outreach, qualification, estimating, and closeout.
- [System User](entities/system_user.md): the authenticated account concept for CRM access, permissions, and future user types.
- [Marketing Campaign](entities/marketing_campaign.md): the paid-search campaign context used for optimization decisions.
- [Search Intent](entities/search_intent.md): the interpreted demand behind search terms and search categories.

Entity definitions live in `entities/`.

## Core Process Domains

- [communications/](processes/communications/README.md): all outbound and inbound communication handling.
- [communications/email/](processes/communications/email/README.md): email-specific lead qualification and response rules.
- [communications/text/](processes/communications/text/README.md): SMS or texting behavior and fallback expectations.
- [marketing/](processes/marketing/README.md): Google Ads analysis, landing page strategy, SEO cross-pollination, and optimization action rules.

Process definitions live in `processes/`.

## Core System Runbooks

- [systems/crm/](systems/crm/README.md): browser and UI runbooks for operating the CRM workspace.
- [systems/crm/auth_and_permissions.md](systems/crm/auth_and_permissions.md): CRM account, auth, and permission assumptions.
- [systems/google_ads/](systems/google_ads/README.md): account data and UI runbooks for paid-search review.

## Role Routing

- [Qualification Agent](agent_roles/qualification_agent.md): use for CRM lead review, communication qualification, and workspace status movement.
- [Marketing Agent](agent_roles/marketing_agent.md): use for Google Ads review, marketing probes, landing page strategy, SEO cross-pollination, and paid-search recommendations.

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
