# Google Ads Weekly Probe Runbook

## Node Type

System interaction runbook.

## Purpose

This runbook translates the marketing weekly probe into Google Ads UI or export actions.

## Before Starting

Confirm:

- account access is available,
- the target campaign is `Campaign #1` or the user has named another campaign,
- the comparison windows use complete days,
- conversion columns are visible,
- Auction Insights is available for the selected campaign or segment.

For `Campaign #1`, begin from the direct URL and `Ask Advisor` path in [ask_advisor_probe.md](ask_advisor_probe.md) when an authorized Chrome session is available.

## Step 1: Campaign Performance

1. Open Google Ads or use the direct `Campaign #1` URL in [ask_advisor_probe.md](ask_advisor_probe.md).
2. Confirm the account and campaign context.
3. In the top navigation bar, click `Ask Advisor`.
4. Send the Layer 1 prompt from [../../processes/marketing/weekly_probe.md](../../processes/marketing/weekly_probe.md).
5. Wait for the Advisor response to complete.
6. Capture exact date ranges, impressions, clicks, CTR, cost, conversions, conversion rate, CPA, traffic spikes, and conversion-health warnings.
7. Verify critical values in the Overview performance summary or export when the resulting recommendation would change the account.
8. Segment by ad group or search category if the summary changed materially.

## Step 2: Auction Insights

1. Continue in the `Ask Advisor` panel or open Auction Insights directly.
2. Ask the Layer 2 prompt from [../../processes/marketing/weekly_probe.md](../../processes/marketing/weekly_probe.md).
3. Capture competitor domains, impression share, and top-of-page metrics.
4. Compare against the previous period when Advisor or the UI supports it.
5. Flag whether competitors are genuinely new or only newly visible because the previous period had little or no traffic.
6. Identify whether the competitive response should be bidding, message differentiation, landing page relevance, or no action.

## Step 3: Search Categories Or Terms

1. Continue in the `Ask Advisor` panel or open search terms, insights, or search categories directly.
2. Ask the Layer 3 prompt from [../../processes/marketing/weekly_probe.md](../../processes/marketing/weekly_probe.md).
3. Extract the top 20 relevant categories or terms if Advisor provides them.
4. If Advisor returns clusters instead of a full table, document the clusters and the limitation.
5. Preserve clicks, CTR, conversions, conversion rate, and CPA when available.
6. Mark zero-conversion click themes as early interest terms, not high-converting terms.
7. Compare the themes against the landing page and SEO strategy.

## Output

Return the weekly probe format from [../../processes/marketing/weekly_probe.md](../../processes/marketing/weekly_probe.md).

If account access is unavailable, ask for exports using the data contract in [../../processes/marketing/google_ads_data_contract.md](../../processes/marketing/google_ads_data_contract.md) instead of guessing.
