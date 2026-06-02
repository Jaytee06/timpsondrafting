# Marketing Process Domain

## Node Type

Process root.

## Purpose

This subtree defines how agents should reason about paid search, landing page optimization, and SEO cross-pollination for Timpson Drafting & Design.

The marketing process is evidence-driven. It should connect account performance to actual website messaging and lead quality instead of treating Google Ads metrics as isolated dashboard numbers.

Primary role: [../../agent_roles/marketing_agent.md](../../agent_roles/marketing_agent.md).

Primary system branch: [../../systems/google_ads/](../../systems/google_ads/README.md).

## Scope

Use this subtree when the task involves:

- Google Ads performance review,
- campaign drift detection,
- competitor and Auction Insights review,
- keyword, search term, or search category analysis,
- landing page headline and offer adjustments,
- organic SEO strategy opportunities,
- marketing recommendations that affect lead intake.

## Expected Inputs

- Google Ads reports or UI access,
- campaign and ad group names,
- search term or search category exports,
- Auction Insights reports,
- conversion and cost metrics,
- CRM lead quality feedback when available,
- current landing page content from the frontend repo,
- existing SEO strategy notes if present.

## Child Nodes

- [weekly_probe.md](weekly_probe.md)
- [google_ads_data_contract.md](google_ads_data_contract.md)
- [landing_page_strategy.md](landing_page_strategy.md)
- [optimization_actions.md](optimization_actions.md)
- [early_data_strategy.md](early_data_strategy.md)

## Routing Guidance

Stay here when the task is a broad marketing analysis or strategy update.

Descend into `weekly_probe.md` for the recurring Monday review.

Descend into `google_ads_data_contract.md` when validating account metrics, reports, or exports.

Descend into `landing_page_strategy.md` when translating search intent into website copy, headlines, or SEO coverage.

Descend into `optimization_actions.md` when deciding what the agent can safely change versus what requires human approval.

Descend into `early_data_strategy.md` when Google Ads has impressions and clicks but too little conversion volume for confident CPA decisions.

Escalate when:

- budget, billing, conversion tracking, or account structure would materially change,
- data is missing but the requested answer depends on it,
- landing page claims need business confirmation,
- paid-search findings conflict with lead quality evidence from CRM or sales outcomes.
