# Notes — RunWithFriends

**What it is:** RunWithFriends — a social/run-tracking app (inferred from name). The actual project lives in a `runwithfriends/` git submodule or nested repo; the parent folder is only a wrapper.

**Status / milestone:** Unknown from the copied docs. The root `AGENTS.md` and `CLAUDE.md` are pointer-only wrappers.

**Doc health:** The root-level docs are effectively empty — they redirect to `runwithfriends/AGENTS.md` and `runwithfriends/CLAUDE.md` respectively. We did not successfully copy the actual project docs because they live inside the nested repo, not the parent folder.

**Staleness / drift:**
- The wrapper files are identical in structure and both dated (no date inside them). They are current enough to be functional but contain zero project-specific information.
- The `docs/` folder in staging contains only `evidence/021/` with no files inside it.

**Missing pieces:**
- The actual `AGENTS.md`, `CLAUDE.md`, and any `docs/` content from the `runwithfriends/` subdirectory were **not copied** because the copy script only looked at the parent-folder root.
- No README at the parent level.
- No project facts, no milestone, no task records visible.

**Surprising:**
- The parent folder exists solely as a wrapper. This is an unusual repo layout. A documentation review that only sees the wrapper learns almost nothing about the real project.
