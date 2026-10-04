# Alpha release checklist

This checklist is the gate for the first public testing build.

A checked box means the behavior has been verified, not merely implemented.

## Repository and packaging

- [ ] all stacked implementation PRs intended for alpha are merged in order
- [ ] default branch CI is green
- [ ] hassfest passes on default branch
- [ ] HACS validation passes on default branch
- [ ] repository description/homepage/topics are final
- [ ] MIT license is present and detected
- [ ] production brand icon renders correctly in HACS
- [ ] README accurately labels the release as alpha/pre-alpha
- [ ] manifest version matches the intended release tag

## Home Assistant lifecycle

- [ ] fresh install through HACS works
- [ ] config flow creates exactly one entry
- [ ] Configure opens capture/retention options
- [ ] option changes reload successfully
- [ ] Home Assistant restart restores rolling evidence
- [ ] integration unload/reload is clean
- [ ] integration removal leaves Home Assistant automations unaffected

## Forensic workflow

- [ ] timeline captures each enabled runtime event kind
- [ ] Explain this change reconstructs context evidence correctly
- [ ] same-context sequence is not presented as direct causation
- [ ] evidence gaps are visible
- [ ] live trace enrichment works for retained automation/script traces
- [ ] saved incidents survive restart
- [ ] saved incident Review works without the live rolling buffer
- [ ] safe ZIP export works

## Privacy

- [ ] entity exclusion verified on live capture
- [ ] domain exclusion verified on live capture
- [ ] restored rolling snapshot is re-filtered after options change
- [ ] diagnostics contains no forensic identifiers/payloads
- [ ] safe export contains no seeded secret strings
- [ ] no raw-export control exists in v0.1
- [ ] trace config/variables/arbitrary result payloads are not persisted by HA Forensic Lab

## Performance

- [ ] Recorder health renders on a real instance
- [ ] normal-use callback average recorded
- [ ] normal-use callback maximum recorded
- [ ] persistence writes complete without failures
- [ ] no material Home Assistant event-loop/log regression observed during the test window
- [ ] at least one busy-instance or synthetic high-activity test completed

## Alpha communication

- [ ] known limitations are documented
- [ ] issue template asks for HA version, integration version and safe diagnostics
- [ ] testers are told not to upload raw HA traces
- [ ] release notes explain rolling persistence crash window
- [ ] release notes explain confirmed vs same-context evidence semantics

## Release decision

Do not call the build alpha-ready until the real-instance checks above have been
performed.

Current CI proves repository correctness only; it is not evidence that the
integration has completed a real Home Assistant lifecycle test.
