## What does this change?

<!-- Describe the forensic/user problem, not only the implementation. -->

## Evidence semantics

- [ ] This PR does not change evidence classification or causality semantics.
- [ ] This PR changes evidence semantics and the change is documented below.

<!-- If applicable: confirmed vs same-context vs correlated/gap behavior. -->

## Data and privacy

- [ ] No new user/runtime data is retained.
- [ ] New or changed retained data is bounded and documented.
- [ ] Export/diagnostics privacy boundaries remain safe-by-default.
- [ ] No raw Home Assistant trace/config/variable payload is newly persisted.

Describe any data-model, retention, migration, or sanitization change:

## Performance

- [ ] No meaningful hot-path change.
- [ ] Hot-path/persistence behavior changed and performance impact is documented/tested.

Describe expected capture/event-loop/storage impact:

## Testing

- [ ] Ruff
- [ ] Python compile
- [ ] pytest
- [ ] frontend JavaScript syntax
- [ ] frontend unit tests, when applicable
- [ ] hassfest
- [ ] HACS validation
- [ ] real Home Assistant test, when applicable

Real-instance version/environment tested:

## UI

<!-- Add screenshots for visible UI changes. Delete this section when not applicable. -->

## Documentation

- [ ] README/docs updated when public behavior changed.
- [ ] Known limitations updated when a new boundary was introduced.
- [ ] Changelog entry added for user-visible changes.
