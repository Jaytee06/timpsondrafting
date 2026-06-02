# Marketing Optimization Actions

## Node Type

Action authority guide.

## Purpose

This file defines which marketing optimization actions are safe for an agent to recommend, draft, or implement.

## Action Classes

### Observe

Allowed without approval:

- summarize metrics,
- compare date ranges,
- classify search intent,
- identify drift,
- identify data gaps,
- document recommendations.

### Draft

Allowed without approval, but not externally published unless authorized:

- new ad copy variants,
- negative keyword candidates,
- keyword expansion candidates,
- landing page headline alternatives,
- FAQ or section-copy proposals,
- SEO content brief ideas.

### Implement In Repo

Allowed when the user asks for landing page or repo changes:

- update local marketing documentation,
- update frontend copy for already-confirmed services,
- add or adjust page sections that preserve existing contact-form and tracking behavior,
- add SEO-oriented copy that matches verified service scope.

### Implement In Google Ads

Requires explicit account-action authorization unless the user has already granted that authority for the specific class of change.

Examples:

- add negative keywords,
- add keywords,
- edit ad copy,
- adjust bids,
- adjust audiences,
- adjust schedules,
- pause keywords,
- pause ads.

### Escalate

Always escalate before:

- changing budgets,
- changing billing,
- changing bidding strategy,
- changing conversion actions or tags,
- changing account access,
- deleting campaigns, ad groups, ads, or keywords,
- launching claims not verified by the business,
- making structural changes based on weak data.

## Recommendation Format

Each recommendation should include:

- evidence,
- expected impact,
- risk,
- confidence,
- implementation surface,
- approval requirement,
- rollback or review plan.

## Bias

Prefer small, reversible changes tied to clear evidence.

Avoid broad restructures unless repeated weekly probes show the same pattern and the account has enough conversion volume to support the decision.
