# Notes — SpecDeck

**What it is:** SpecDeck (parent folder name) / Menu Study App (product name) / menu-mastery (repo name). A multi-tenant B2B tool for bars and restaurants to train staff on rotating cocktail menus. Two front ends (manager web dashboard + staff mobile app) share a Firebase backend.

**Status / milestone:** In migration. The `Migration_Brief.md` is a handoff document for moving the project out of Claude "Projects" workspace into a real repo. Phases 1–5 and half of Phase 6 are built and verified on real devices.

**Doc health:** Only two files were found and copied:
- `Migration_Brief.md` — extremely detailed, well-structured, with explicit warnings about critical migration risks (especially capturing `Project_Instructions.md` from the Claude Project settings).
- `spec.json` — **this is NOT a project spec**. It is the StabilityAI REST API v2beta OpenAPI schema. This is confusing and likely misplaced.

**Staleness / drift:**
- `Migration_Brief.md` references current build state and recent work. No internal dates in the file.
- No contract version detected. The project does not appear to have adopted any Cairn-style contract yet.

**Missing pieces:**
- No `README.md` (tried README.md, README.rst, README — none found).
- No `AGENTS.md` or `CONTRACT-TEMPLATE.md`.
- The four governing documents (`App_Master_Context.md`, `Project_State_Handoff.md`, `Theme_Specification.json`, `Project_Instructions.md`) were **not found** in the parent folder; they may live inside the `menu-mastery/` monorepo subfolder or in the Claude Project knowledge files.
- No `docs/` folder at the SpecDeck root.

**Surprising:**
- The presence of `spec.json` (StabilityAI API) in the root is misleading. It has nothing to do with the project's own specification.
- The project uses a three-party workflow model (Orchestrator / Executor / User) that is more complex than Cairn's conductor-worker model.
- The terminology ban: never use "AI / LLM / Prompt" anywhere in the app — the parsing service is called "Smart Import."
