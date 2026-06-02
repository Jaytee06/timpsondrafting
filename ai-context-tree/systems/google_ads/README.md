# Google Ads System

## Node Type

System runbook root.

## Purpose

This subtree documents how an agent should interact with Google Ads account data for marketing optimization.

Primary role: [../../agent_roles/marketing_agent.md](../../agent_roles/marketing_agent.md).

Primary process branch: [../../processes/marketing/](../../processes/marketing/README.md).

## Scope

Use this subtree when the task requires:

- opening or navigating Google Ads,
- reading campaign performance,
- reading search terms or search categories,
- reading Auction Insights,
- exporting account data,
- making approved account changes.

## Expected Inputs

- authenticated Google Ads access or exported reports,
- campaign name or campaign ID,
- direct campaign URL when available,
- requested date range,
- permission boundaries for account changes,
- marketing process rules from [../../processes/marketing/README.md](../../processes/marketing/README.md).

## Known Campaign Entry Point

Use this direct campaign URL for `Campaign #1` when an authorized Google Ads account is already logged in:

`https://ads.google.com/aw/overview?src=ads_onebox&campaignId=23625020325&ocid=8070020307&__u=7935446352&__c=1174875643&authuser=0&subid=ww-ww-xs-ip_OB_View_campaign`

Observed campaign context:

- account label: `907-888-9942 Timpson Drafting`
- campaign name: `Campaign #1`
- campaign ID: `23625020325`
- campaign type: `Performance Max`
- default status observed: `Enabled` / `Eligible`
- observed budget: `$20.00/day`
- observed optimization score: `99.9%`

Do not assume these observed values are current without checking the page. Google Ads account data can change.

## Operating Rules

- Record exact date ranges.
- Prefer account UI, official exports, or directly supplied reports over memory.
- Do not invent missing metrics.
- Treat account actions as externally visible business changes.
- Separate observations, recommendations, and implemented changes.

## Child Nodes

- [weekly_probe_runbook.md](weekly_probe_runbook.md)
- [ask_advisor_probe.md](ask_advisor_probe.md)

## Escalation Rules

Escalate when:

- login or permissions block access,
- the requested metric is unavailable,
- account data conflicts with conversion tracking or CRM quality evidence,
- the requested change affects budget, billing, conversion tracking, bidding strategy, or campaign structure.
