# Alpha release checklist

This checklist is the gate for the first public testing build.

Use a copy of this checklist for each exact candidate SHA. A checked box means
the behavior has been verified and recorded in the test report.

## Repository and packaging

- [ ] all intended changes are included in the tested candidate commit
- [ ] default branch CI is green
- [ ] hassfest passes on default branch
- [ ] HACS validation passes on default branch
- [ ] repository description/homepage/topics are final
- [ ] MIT license is present and detected
- [ ] local brand icon renders correctly in HACS
- [ ] README accurately labels the release as an unreleased alpha candidate
- [ ] manifest version matches the intended release tag
- [ ] CHANGELOG has a matching version section
- [ ] deterministic manual-install ZIP builds successfully
- [ ] ZIP checksum is generated and verified
- [ ] real-instance testing uses an exact-SHA CI candidate artifact
- [ ] tested candidate commit SHA is recorded in the alpha test report
- [ ] release workflow has been reviewed before the first tag is pushed

## Home Assistant lifecycle

- [ ] fresh install through HACS custom repository works
- [ ] manual ZIP install works from a clean custom_components directory
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
- [ ] storage logs are clean and written evidence survives restart
- [ ] no material Home Assistant event-loop/log regression observed during the test window
- [ ] at least one busy-instance or synthetic high-activity test completed

## Alpha communication

- [ ] known limitations are documented
- [ ] issue template asks for HA version, integration version and safe diagnostics
- [ ] testers are told not to upload raw HA traces
- [ ] release notes explain rolling persistence crash window
- [ ] release notes explain confirmed vs same-context evidence semantics
- [ ] installation docs clearly mark the build as experimental
- [ ] release remains a GitHub pre-release

## Release decision

Do not call the build alpha-ready until the real-instance checks above have been
performed.

CI covers code checks, unit regressions, HA helper compatibility and packaging.
The full installation and lifecycle checks still require a real test instance.

Only after this checklist passes should the exact manifest version tag described
in [releasing.md](releasing.md) be pushed.
