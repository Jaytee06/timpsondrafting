# Google Ads Data Contract

## Node Type

Data contract.

## Purpose

This file defines the minimum Google Ads data the Marketing Agent should request, inspect, and preserve before making optimization recommendations.

## Core Objects

### Campaign

Represents a paid-search campaign such as `Campaign #1`.

Important fields:

- campaign ID,
- campaign name,
- status,
- budget,
- bidding strategy,
- network settings,
- location targeting,
- conversion goals,
- cost,
- impressions,
- clicks,
- CTR,
- average CPC,
- conversions,
- conversion rate,
- CPA.

### Ad Group

Represents a cluster of keywords, ads, and search intent inside a campaign.

Important fields:

- ad group name,
- status,
- keyword themes,
- final URLs,
- ads active in the group,
- cost,
- clicks,
- CTR,
- conversions,
- CPA.

### Search Term Or Search Category

Represents user demand actually entering the account.

Important fields:

- query or category label,
- matched keyword when available,
- match type,
- impressions,
- clicks,
- CTR,
- cost,
- conversions,
- CPA,
- conversion rate,
- landing page or final URL,
- recommended action.

### Auction Insight

Represents competitor visibility for an auction segment.

Important fields:

- competitor domain,
- impression share,
- overlap rate,
- position above rate,
- top-of-page rate,
- absolute-top-of-page rate,
- outranking share if available.

## Required Date Handling

When comparing periods, always report exact date ranges.

Default weekly comparison:

- last 7 complete days,
- previous 7 complete days.

Do not mix partial current-day data into the comparison unless the user explicitly asks for live or same-day monitoring.

## Data Quality Rules

- State when conversion volume is too low for confident conclusions.
- Treat missing conversion data as a blocker for CPA conclusions.
- Treat missing cost data as a blocker for CPA conclusions.
- Treat missing Auction Insights as a blocker for competitor conclusions.
- Do not infer competitor names from search results or memory when the task is specifically about account Auction Insights.
- Distinguish `top-of-page rate` from `absolute-top-of-page rate`.
- Compare lead quantity with CRM lead quality when that feedback is available.

## Escalation Rules

Escalate before:

- changing conversion actions,
- changing attribution settings,
- changing campaign budget,
- changing bidding strategy,
- changing location targeting,
- pausing or deleting campaign assets,
- making claims based on incomplete or statistically weak data.
