# Cairn changelog

The app and the contract share one version number, declared in
`CONTRACT-TEMPLATE.md` and the three package files. Changes are explicit local
work; they are never downloaded or activated silently.

## 0.0.1 — formal reset — 2026-07-22

- Gave the app and the contract one shared version number and restarted the
  count at 0.0.1. The earlier "Contract vN.N" numbering (v1.0 through v3.0) is
  a retired scheme, so 0.0.1 is a fresh start, not a downgrade.
- Rewrote the contract from scratch: outcomes get verified rather than
  paperwork, briefs state a boundary of intent rather than a file whitelist,
  reviews are advisory, large work gets a written plan first, and two stopped
  attempts at one goal force a step-back diagnosis.
- Rewrote the front door: README absorbed Getting Ready, and Everyday Workflow
  absorbed High-Stakes. The contract holds the single canonical risk-boundary
  list.
- Moved all pre-reset docs, task records 000–047, the work log, and the pilot
  table to `docs/legacy/`, unmodified, and pinned the pre-reset state at git
  tag `legacy-v3.0`. Task numbering restarts at 001.
- Pre-reset version history:
  [docs/legacy/CHANGELOG-pre-reset.md](docs/legacy/CHANGELOG-pre-reset.md).
- Changed no product behavior.
