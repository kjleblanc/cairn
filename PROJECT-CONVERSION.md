# Project Conversion — existing project

Use this guide when the folder already contains code, documents, Git history, or
unfinished work. The workflow is installed **beside** what exists, stays inactive
while you review it, and only starts governing future work when you explicitly turn
it on. Nothing in the past gets rewritten, and nothing gets "tidied up."

Finish [Getting Ready](GETTING-READY.md) first if you haven't.

## Step 1 — pause and protect what exists

Before anything else:

- open the correct project folder — if you are not sure which folder is the real
  project, find out first;
- do not delete, move, rename, or "clean up" anything, and do not let the AI do it;
- do not paste secret file contents into chat;
- do not start building features during conversion.

Files that look messy or unfinished may be someone's unsaved work. A messy folder is
information, not permission to erase.

Then copy `CONTRACT-TEMPLATE.md` from this framework folder into the project folder.
Leave its name unchanged — it does not become the rulebook until Step 5.

## Step 2 — audit, then save one conversion brief

Open the project folder in your AI coding agent and paste this. It looks around
without changing anything, then saves a single plan file for you to review.

```text
Prepare a safe, future-only conversion of this project to the workflow defined in
CONTRACT-TEMPLATE.md. I am a complete beginner; explain everything in plain language.

Work read-only first. Do not edit, create, delete, move, stage, commit, reset,
install, or push anything while auditing, and never print passwords, keys, or .env
contents.

Find out and note:
- the real project root and any existing rule files for AIs or contributors;
- what the project does, and which build, test, or run commands actually exist;
- the Git state: branch, remotes, and the complete status, including modified and
  untracked files that must be preserved;
- any existing task, review, or release habits worth keeping;
- any checks that already fail today, so they are not blamed on the conversion later.

Then create exactly one file, docs/ai-work/tasks/000-conversion-brief.md (if that
path would collide with existing work, stop and tell me). The brief must contain, in
plain language:
1. a summary of the project and its current state;
2. a preservation list: every modified, untracked, or unclear path that stays
   untouched;
3. what happens to any existing rule files — kept, pointed to, or replaced, with the
   stronger practice always preserved;
4. the exact files the conversion will create, including installing the contract
   with STATUS: CANDIDATE — NOT ACTIVE;
5. checks that already fail today;
6. how activation will later work, and how the conversion can be abandoned without
   rewriting history.

Show me the full brief and the complete Git status before and after. Then stop for
my approval. Do not implement anything.
```

## Step 3 — review the brief

Confirm the brief answers these questions before going on:

- Which files stay untouched, and does that list include everything modified or
  unclear?
- If the project already has a rules file, which one wins until activation? (The
  existing one must.)
- Which checks were already failing before the conversion?
- How would you abandon the conversion, and does that path avoid rewriting history?

If anything is wrong or confusing, say so plainly and have the AI revise the brief.
Approve only what you understand.

## Step 4 — install in candidate mode

```text
I approve the exact current contents of docs/ai-work/tasks/000-conversion-brief.md.

Re-check that the brief still matches reality: the Git status, the preservation
list, and the paths to be created. If anything changed, stop and explain.

Implement only the brief: install the contract with STATUS: CANDIDATE — NOT ACTIVE,
create the docs/ai-work files it names, and write a short conversion report at
docs/ai-work/tasks/000-conversion-report.md saying what was created and what stayed
untouched. Change no product code, no dependencies, no existing files outside the
brief, and nothing in the preservation list.

If Git can commit safely, make one conversion commit of exactly the created files,
staged by name. Do not push. Then show the complete final status and stop.
```

## Step 5 — review from a fresh chat

Conversion changes how every future AI session behaves, so it gets a skeptical second
look. Open a **new chat** in the same folder and paste:

```text
Review this project's workflow conversion. Do not assume it succeeded, do not
activate it, and do not fix anything.

Read docs/ai-work/tasks/000-conversion-brief.md, the conversion report, the actual
diff or conversion commit, and the complete Git status. Confirm that: only the files
named in the brief were created; everything in the preservation list is untouched;
the contract still says STATUS: CANDIDATE — NOT ACTIVE; and already-failing checks
are recorded rather than hidden.

Give one verdict — PASS, PASS WITH CONCERNS, or FAIL — and explain in plain language
what you observed, what the evidence cannot prove, and whether I should activate,
correct, or abandon the conversion.
```

## Step 6 — activate

Continue only after `PASS`, or after you understand and accept every named concern.

```text
I accept the review verdict and authorize activation.

Re-check that the contract still says STATUS: CANDIDATE — NOT ACTIVE and that
nothing in the preservation list changed since the review. If anything changed,
stop.

Then change only the STATUS line to ACTIVE, note today's date and the verdict I
accepted beside it, and commit only that change. Do not touch anything else, start
any task, push, or deploy. Show the final status.
```

From this commit forward, the contract governs all new work. Past work is not
retroactively judged by it.

## Step 7 — first tasks

Open [Everyday Workflow](EVERYDAY-WORKFLOW.md). Make the first task a small **Draft**
that produces something visible, and use the five-task pilot in
`docs/ai-work/PILOT.md` to judge whether the workflow is earning its keep in this
project.

## Abandoning or rolling back

- **Before activation:** the old ways remain authoritative; the candidate files can
  simply be removed in a normal commit.
- **After activation:** roll back with a new commit that reverts the conversion's own
  files. Never rewrite history, and never delete records to make the conversion look
  like it never happened.

Stop the conversion at any point where ownership of files is unclear, a path would
collide with existing work, a supposedly read-only step tries to write, or product
behavior changes. Those are all `STOPPED` moments, and stopping is the correct result.
