# Entities

## Node Type

Entity index.

## Purpose

This folder defines shared vocabulary used across roles, processes, and system runbooks.

Use entity docs when an agent needs to understand what a record, status, campaign, account user, or search-intent concept means before acting.

## Entities

- [lead.md](lead.md): customer inquiry data, qualification facts, contact fields, and attribution fields.
- [workspace_status.md](workspace_status.md): CRM workspace status vocabulary and status interpretation.
- [system_user.md](system_user.md): authenticated account concepts, user types, and permission boundaries.
- [marketing_campaign.md](marketing_campaign.md): paid-search campaign data and optimization meaning.
- [search_intent.md](search_intent.md): interpreted demand behind search terms, search categories, and keyword themes.

## Role Routing

The [Qualification Agent](../agent_roles/qualification_agent.md) primarily uses:

- [lead.md](lead.md)
- [workspace_status.md](workspace_status.md)
- [system_user.md](system_user.md)

The [Marketing Agent](../agent_roles/marketing_agent.md) primarily uses:

- [marketing_campaign.md](marketing_campaign.md)
- [search_intent.md](search_intent.md)
- [lead.md](lead.md), when CRM lead quality or attribution context informs marketing decisions.

## Boundary

Entity docs define shared meaning. Do not redefine fields locally in role, process, or system docs unless the entity doc is updated or the local doc clearly states it is only a UI label mapping.
