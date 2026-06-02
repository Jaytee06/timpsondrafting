# Marketing Campaign Entity

## Node Type

Entity definition.

## Purpose

`Marketing Campaign` represents a paid-search campaign or equivalent acquisition campaign used to generate residential drafting leads.

This entity exists so marketing agents can reason about Google Ads separately from lead qualification work while still connecting campaign performance back to lead intake and CRM quality.

## Expected Inputs

Google Ads or exported reporting may provide:

- campaign ID,
- campaign name,
- campaign status,
- budget,
- bidding strategy,
- networks,
- location targeting,
- conversion goals,
- final URLs,
- impressions,
- clicks,
- CTR,
- cost,
- average CPC,
- conversions,
- conversion rate,
- CPA,
- search impression share,
- top-of-page rate,
- absolute-top-of-page rate.

## Operational Meaning

A marketing campaign should answer:

- what demand source is being targeted,
- what visitor intent the campaign is expected to capture,
- what landing page or form experience receives the traffic,
- what conversion action defines success,
- whether the campaign is generating qualified lead opportunities at an acceptable CPA,
- whether competitors or search behavior have shifted enough to justify a change.

## Allowed Local Decisions

Agents may:

- summarize performance,
- classify drift,
- compare campaign segments,
- recommend optimization actions,
- connect campaign data to landing page strategy.

Agents should not:

- change budgets or bidding strategy without explicit authorization,
- alter conversion goals casually,
- treat clicks or CTR as success when CPA or lead quality is poor,
- ignore low conversion volume when evaluating significance.

## Escalation Rules

Escalate when:

- account structure changes are proposed,
- conversion tracking changes are proposed,
- budget or bidding strategy changes are proposed,
- the campaign data conflicts with CRM lead quality evidence.
