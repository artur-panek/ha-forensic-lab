# Remaining alpha work

Implemented behavior is listed in [v0.1 scope](v0.1-scope.md).

Before the first public alpha:

1. Install an exact-SHA candidate and complete the
   [real-instance matrix](alpha-testing.md), including restart persistence,
   incident review, export and capture filters.
2. Record callback cost, storage observations and any HA log regressions.
3. Fix failures and retest the affected paths with a new exact-SHA candidate.
4. Complete the [release checklist](alpha-release-checklist.md), then publish the
   matching pre-release tag.

Default HACS catalogue submission also needs repository topics and validation
without ignored checks. See [HACS status](hacs-readiness.md).

There are no committed v0.2 or v0.3 features. Investigation workflow changes
should follow alpha feedback and a concrete reproducible need.
