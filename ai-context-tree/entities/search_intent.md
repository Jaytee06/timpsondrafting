# Search Intent Entity

## Node Type

Entity definition.

## Purpose

`Search Intent` represents the interpreted need behind a search term, search category, or keyword theme.

Marketing agents use this entity to decide whether paid-search demand should affect ads, landing page copy, SEO strategy, or negative keywords.

## Expected Inputs

- raw search term,
- search category,
- matched keyword,
- campaign and ad group,
- impressions,
- clicks,
- CTR,
- cost,
- conversions,
- CPA,
- landing page,
- CRM lead quality feedback when available.

## Intent Classes

Common classes:

- service type,
- project type,
- location,
- price or cost question,
- timeline question,
- permit or process question,
- competitor or brand query,
- research-only query,
- irrelevant or low-intent query.

## Operational Meaning

For each high-volume or high-converting search intent, the agent should decide:

- whether the business actually serves the intent,
- whether the landing page makes that service or answer prominent,
- whether SEO content should target it,
- whether ad copy should mirror it,
- whether the term should be excluded as irrelevant.

## Allowed Local Decisions

Agents may:

- classify search intent,
- recommend landing page or SEO coverage,
- recommend keyword expansion,
- recommend negative keyword candidates,
- mark intent as unsupported by current business scope.

Agents should not:

- add unsupported service claims,
- assume location or service coverage not documented elsewhere,
- treat one conversion as a trend without noting low sample size.

## Escalation Rules

Escalate when:

- the search intent implies a service the business may not offer,
- organic SEO strategy would require new service-area claims,
- the paid-search action would materially change account targeting or spend.
