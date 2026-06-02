# Processes

## Node Type

Process index.

## Purpose

This folder contains workflow rules. Use process docs when the agent needs to decide what should happen, not just which software screen to use.

## Process Domains

- [communications/](communications/README.md): lead outreach, inbound response handling, qualification branches, email and text routing.
- [marketing/](marketing/README.md): Google Ads analysis, weekly probes, landing page strategy, SEO cross-pollination, and marketing optimization actions.

## Role Routing

The [Qualification Agent](../agent_roles/qualification_agent.md) primarily uses:

- [communications/](communications/README.md)
- [../systems/crm/](../systems/crm/README.md)

The [Marketing Agent](../agent_roles/marketing_agent.md) primarily uses:

- [marketing/](marketing/README.md)
- [../systems/google_ads/](../systems/google_ads/README.md)

## Escalation Rules

Escalate upward when a process decision would:

- change shared entity definitions,
- change global lifecycle states in [../STATE_MACHINE.md](../STATE_MACHINE.md),
- alter consent or compliance-sensitive communication rules,
- alter conversion tracking, billing, campaign budget, or paid-search account structure.
