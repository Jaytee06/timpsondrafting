# Weekly Probe Framework

## Node Type

Recurring marketing process.

## Purpose

This framework gives the Marketing Agent a repeatable weekly probing structure for Google Ads and landing page optimization.

Default cadence: once per week, preferably Monday morning.

Default comparison window: last 7 complete days vs. the previous 7 complete days, unless the account UI or user specifies a different reporting convention.

## Layer 1: Health & Drift Check

Ask:

`Provide a summary of Campaign #1 performance for the last 7 days vs. the previous 7 days. Focus on CTR and CPA. Identify any drift in conversion health or unexpected traffic spikes.`

When Google Ads access is available, ask this through the top-navigation `Ask Advisor` panel using [../../systems/google_ads/ask_advisor_probe.md](../../systems/google_ads/ask_advisor_probe.md).

Minimum data to inspect:

- campaign name and ID,
- date ranges compared,
- impressions,
- clicks,
- CTR,
- average CPC,
- cost,
- conversions,
- conversion rate,
- CPA,
- search impression share if available,
- top-of-page and absolute-top metrics if available.

Drift checks:

- CTR moved materially while impressions stayed stable,
- CTR improved but CPA worsened,
- clicks or cost spiked without matching conversion lift,
- conversions dropped while traffic volume stayed stable,
- conversion rate changed enough to suggest landing page, tracking, traffic-quality, or market changes,
- one ad group or query theme explains most of the change.

Output:

- a concise performance delta summary,
- likely driver hypotheses,
- data gaps,
- recommended next action.

## Layer 2: Market & Competitor Intelligence

Ask:

`Show me the Auction Insights for the last 7 days. Are there new competitors entering the space for residential drafting? What is our Top of Page rate compared to them?`

When using Google Ads Advisor, run this as the second prompt after the Health & Drift check.

Minimum data to inspect:

- competitor domains,
- impression share,
- overlap rate,
- position above rate,
- top-of-page rate,
- absolute-top-of-page rate,
- outranking share when available,
- changes from the prior comparable period if available.

Competitor checks:

- a new domain appears with meaningful impression share,
- an existing competitor materially increases top-of-page or absolute-top presence,
- Timpson Drafting loses top-of-page rate while CPA rises,
- competitor pressure is concentrated around `residential drafting`, plans, additions, remodels, ADUs, or local drafting service terms.

Output:

- top competitor movement,
- whether the account is losing visibility or only seeing normal auction variation,
- proposed response, such as bid adjustment review, ad copy differentiation, landing page relevance improvement, or no action.

## Layer 3: Cross-Pollination: SEO & Website

Ask:

`Extract the top 20 search categories from last week. Identify high-converting terms that are NOT currently highlighted in my landing page headlines or my organic SEO strategy.`

When conversion volume is low, the Advisor may identify click-heavy or high-interest terms instead of truly high-converting terms. Label them accurately and avoid overstating conversion quality.

Minimum data to inspect:

- top search categories or search terms,
- conversions and CPA by category,
- CTR and conversion rate by category,
- query intent classification,
- current landing page headings and prominent copy,
- current SEO keyword targets if documented.

Search-intent categories should usually include:

- residential drafting,
- house plans,
- home addition plans,
- remodel drafting,
- ADU or accessory dwelling unit plans,
- permit drawings,
- custom home design,
- local drafting service modifiers,
- cost, timeline, and process questions.

Output:

- top 20 categories or terms with performance notes,
- terms already covered by landing page or SEO,
- terms missing from headlines or organic strategy,
- recommended copy, section, FAQ, or keyword-targeting updates.

## Weekly Output Format

Use this structure:

- Reporting window.
- Layer 1 findings.
- Layer 2 findings.
- Layer 3 findings.
- Recommended account changes.
- Recommended landing page or SEO changes.
- Changes implemented now.
- Changes requiring approval.
- Data quality concerns.

## Action Thresholds

Prefer investigation before action when:

- the comparison window includes holidays, outages, tracking changes, or very low conversion volume,
- there are fewer than 3 conversions in either period,
- the proposed account action would affect budget, bidding strategy, conversion tracking, or campaign structure.

Prefer immediate low-risk action when:

- a high-spend irrelevant query theme is obvious and negative-keyword authority has been granted,
- landing page headings fail to mention a high-converting service category already offered by the business,
- reporting docs need to be updated with observed account vocabulary.
