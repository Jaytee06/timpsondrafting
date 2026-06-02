# Ask Advisor Probe

## Node Type

Google Ads Advisor runbook.

## Purpose

This file documents how a Marketing Agent should use the Google Ads `Ask Advisor` panel to probe `Campaign #1` performance.

Use this as the first path for the weekly probe when an authorized Google Ads account is already logged in and the Google Ads Advisor feature is available.

## Direct Campaign URL

Open:

`https://ads.google.com/aw/overview?src=ads_onebox&campaignId=23625020325&ocid=8070020307&__u=7935446352&__c=1174875643&authuser=0&subid=ww-ww-xs-ip_OB_View_campaign`

Expected landing page:

- Google Ads account: `907-888-9942 Timpson Drafting`
- page title similar to `Overview - Timpson Drafting - Google Ads`
- left navigation shows `Campaigns`, `Goals`, `Tools`, `Billing`, and `Admin`
- campaign selector shows `Campaign #1`
- campaign summary shows a `Performance Max` campaign
- `Overview` is selected
- top navigation includes `Ask Advisor` with a `BETA` label

## Layer 1 Advisor Procedure

1. Open the direct campaign URL in an authorized Chrome session.
2. Confirm the campaign selector shows `Campaign #1`.
3. Do not rely on the date range shown in the overview page. The direct URL may preserve an old custom date range.
4. In the top navigation bar, find `Ask Advisor`.
5. Click `Ask Advisor`.
6. A right-side Advisor chat panel should open.
7. Locate the prompt field labeled `Type message`.
8. Ask the Layer 1 Health & Drift question:

   `Provide a summary of Campaign #1 performance for the last 7 days vs. the previous 7 days. Focus on CTR and CPA. Identify any drift in conversion health or unexpected traffic spikes.`

9. Send the message.
10. Wait for the Advisor response to finish before summarizing.

## Layer 2 Advisor Procedure

After Layer 1 is complete, ask:

`Show me the Auction Insights for the last 7 days. Are there new competitors entering the space for residential drafting? What is our Top of Page rate compared to them?`

Extract:

- exact reporting window,
- Timpson Drafting search impression share,
- competitor domains and impression share,
- Timpson Drafting top-of-page rate,
- competitor top-of-page rates,
- whether the competitor set is genuinely new or only newly visible because the campaign previously had no impressions,
- proposed positioning response.

## Observed Layer 2 Response Pattern

In one observed run, Advisor reported:

- reporting window: `May 25 - May 31, 2026`
- Timpson Drafting search impression share: `17.17%`
- `houseplans.net` impression share: `31.31%`
- `fiverr.com` impression share: `24.24%`
- `architecturaldesigns.com` impression share: `15.15%`
- Timpson Drafting top-of-page rate: `17.65%`
- `houseplans.net` top-of-page rate: `93.55%`
- `thumbtack.com` top-of-page rate: `100.00%`

Advisor framed the competitor set as national plan brokers and marketplaces rather than local custom drafting firms. It recommended emphasizing the local, permit-ready, custom-service advantage instead of trying to outbid national aggregators immediately.

These are observations from that run, not permanent campaign facts.

## Layer 3 Advisor Procedure

After Layer 2 is complete, ask:

`Extract the top 20 search categories from last week. Identify high-converting terms that are NOT currently highlighted in my landing page headlines or my organic SEO strategy.`

Extract:

- exact reporting window,
- search categories or search terms Advisor can identify,
- terms with clicks,
- terms with conversions,
- CTR when provided,
- conversion rate or zero-conversion caveat,
- terms already covered by the landing page,
- terms only broadly covered,
- terms missing from landing page headlines or SEO strategy,
- recommended website, SEO, asset, or ad-copy response.

If Advisor does not return a full 20-category table, record the clusters it does return and note the data limitation.

## Observed Layer 3 Response Pattern

In one observed run, Advisor returned clusters rather than a complete 20-row table. It reported the week of `May 25 - May 31, 2026` and identified:

- `small house designs`, described as having `100% CTR` on recent clicks,
- `house packages with prices`,
- `master bedroom addition plans`,
- `building a mudroom`,
- `modern 500 sq ft house`,
- `15x40 house plan`.

Advisor noted most of these terms had `0% conversion rate`, which means the agent should not treat them as high-converting terms yet. The useful signal is early click interest and possible message mismatch, not proven conversion quality.

Advisor identified three landing page or SEO gaps:

- price-sensitive package intent,
- specific room-addition intent such as mudrooms and master suites,
- small or modern efficient-house design intent.

The current landing page already includes broad coverage for residential drafting, garage and addition plans, permit-ready documents, custom home design, and pricing packages. The gap is specificity, not total absence.

## Observed Advisor Behavior

The Advisor may show prior chat context before the new prompt. Treat prior context as background only. The agent should clearly separate:

- the prompt just sent,
- the Advisor's new response,
- any older Advisor messages already visible in the panel.

During response generation, the Advisor may display intermediate activity such as:

- retrieving performance metrics,
- analyzing daily impression and click trends,
- checking offline conversion action health,
- investigating alerts,
- reviewing change history.

Do not treat intermediate progress text as the final answer.

## Layer 1 Output Fields To Extract

From the Advisor answer, extract:

- exact compared date ranges,
- impressions for both periods,
- clicks for both periods,
- CTR for both periods when provided,
- cost for both periods when provided,
- conversions for both periods,
- CPA or `undefined`/not calculable when conversions are zero,
- stated traffic spikes,
- stated cause or hypothesis for the spike,
- conversion-health warning,
- recommended next check.

## Observed Layer 1 Response Pattern

In one observed run, Advisor compared:

- last 7 days: `May 25 - May 31, 2026`
- previous 7 days: `May 18 - May 24, 2026`

The answer reported:

- previous week had no activity,
- last 7 days had `330 impressions` and `12 clicks`,
- CTR was `3.64%`,
- cost was `$11.00`,
- CPA was undefined because there were no conversions,
- the largest spike occurred on `May 31, 2026`,
- the spike was attributed to budget increases on `May 29, 2026`,
- conversion health needed attention because no conversions were recorded and offline conversion uploads might not be syncing.

These are observations from that run, not permanent campaign facts. Future agents must query Advisor again and record current values.

## Data Quality Notes

- Advisor may include web-sourced market context. Keep that separate from account performance facts.
- Advisor can be wrong or overconfident. Verify critical metrics in the Overview performance summary or exported reports before making account changes.
- If the answer says CPA is undefined because conversions are zero, do not invent a CPA.
- If Advisor references offline conversion uploads or Data Manager API sync, record that as a conversion-health follow-up, not as proof that tracking is broken.
- If Layer 3 terms have clicks but no conversions, call them `early interest terms` rather than `high-converting terms`.

## Escalation Rules

Escalate before:

- changing budgets,
- changing bidding strategy,
- changing conversion actions,
- changing offline conversion upload configuration,
- accepting legal or policy terms on behalf of the account owner.
