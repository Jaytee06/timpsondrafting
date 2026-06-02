# Agent Roles

## Node Type

Role index.

## Purpose

This folder defines role-specific operating contracts. Start here when the task names an agent type or asks for work that belongs to a distinct operating role.

## Roles

- [qualification_agent.md](qualification_agent.md): owns lead review, qualification, communication routing, CRM status movement, and follow-up decisions.
- [marketing_agent.md](marketing_agent.md): owns Google Ads review, weekly marketing probes, landing page and SEO cross-pollination, and controlled marketing optimization recommendations.

## Routing Guidance

Use the Qualification Agent when the task is about:

- CRM lead queues,
- `Fresh` or `Contacted` leads,
- email or text follow-up,
- lead completeness,
- contactability,
- workspace status movement.

Primary supporting branches:

- [../processes/communications/](../processes/communications/README.md)
- [../systems/crm/](../systems/crm/README.md)
- [../entities/lead.md](../entities/lead.md)
- [../entities/workspace_status.md](../entities/workspace_status.md)

Use the Marketing Agent when the task is about:

- Google Ads performance,
- Auction Insights,
- search terms or search categories,
- landing page strategy,
- SEO opportunities,
- paid-search optimization.

Primary supporting branches:

- [../processes/marketing/](../processes/marketing/README.md)
- [../systems/google_ads/](../systems/google_ads/README.md)
- [../entities/marketing_campaign.md](../entities/marketing_campaign.md)
- [../entities/search_intent.md](../entities/search_intent.md)

Escalate to the root when a task crosses roles in a way that changes shared entities, conversion tracking, CRM field contracts, compliance-sensitive communication behavior, or global workflow states.
