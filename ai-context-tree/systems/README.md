# Systems

## Node Type

System runbook index.

## Purpose

This folder contains software and browser operation runbooks. Use system docs when the agent needs to operate an external UI, inspect a screen, or complete a concrete software action.

## System Branches

- [crm/](crm/README.md): CRM workspace navigation, lead review, communication actions, status updates, and troubleshooting.
- [google_ads/](google_ads/README.md): Google Ads account navigation, Campaign #1 entry point, Ask Advisor probes, weekly campaign review, and account-data extraction.

## Role Routing

Use [crm/](crm/README.md) with the [Qualification Agent](../agent_roles/qualification_agent.md).

Use [google_ads/](google_ads/README.md) with the [Marketing Agent](../agent_roles/marketing_agent.md).

## Boundary

System runbooks describe how to use a tool. They do not independently authorize business changes. Check the relevant role and process docs before sending messages, changing statuses, changing ads, changing budgets, or modifying tracking.
