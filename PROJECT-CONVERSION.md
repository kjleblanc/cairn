# Project Conversion — existing work

Use this when the folder already contains code, documents, Git history, or unfinished
work. Conversion adds Cairn beside what exists. It never cleans the folder or rewrites
history.

Copy `CONTRACT-TEMPLATE.md` into the project folder without renaming it, then paste:

```text
Convert this existing project to Cairn Contract v0.0.1. I am a beginner; explain the
result plainly.

Work read-only first. Identify the real project root, existing AI/contributor rules,
build and test commands, Git branch, complete tracked/staged/modified/untracked
status, and checks already failing. Never print secrets or .env contents.

Show me the preservation list before writing. If ownership is unclear, a Cairn path
would collide, or existing rules conflict in a way that needs my choice, stop and
ask one concrete question.

When the boundary is clear, continue in this same task:
1. Install CONTRACT-TEMPLATE.md as AGENTS.md with STATUS: ACTIVE and fill in project
   facts inferred from the project, asking me only for facts that cannot be known.
2. Preserve any stronger existing safety rule and explain which rule file governs.
3. Create only missing docs/ai-work/PROJECT.md, LOG.md, and tasks/ paths. Do not
   overwrite existing records.
4. Write one conversion report listing what was added and what stayed untouched.
5. Run safe local checks, inspect the exact diff, and commit only the named conversion
   files when Git isolation is clear. Do not push.

Do not change product code, dependencies, remotes, existing history, or protected
work during conversion. Finish with DONE or STOPPED, the final Git status, and the
next command: "Work on: [a small visible result]".
```

The conversion request authorizes only the named local setup files. Any install,
destructive action, credential, external write, or deployment still needs exact
approval at that real boundary.

After conversion, read [Everyday Workflow](EVERYDAY-WORKFLOW.md) and start one small
visible task.
