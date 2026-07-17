# Everyday Workflow — your daily reference

Use this page once setup is done. Your project's contract (`AGENTS.md`) defines every
command below, so your messages stay short — the AI already knows the full procedure
behind each one. If the AI ever seems to have forgotten the rules, say:
**"Follow the project contract in AGENTS.md."**

Remember the session rule: **one task, one chat.** Start a fresh chat for each task;
the project's files carry the memory.

## The loop at a glance

| Step | You type | You get back |
|---|---|---|
| **1. Define** | `Define a task: [what you want to see]` | A saved brief and a plain summary. Nothing is built yet. |
| **2. Build** | `I approve the brief at [path]. Build it.` | The work, plus a saved report ending in DONE or STOPPED. |
| **3. Verify** | `How do I try it?` | Exact safe steps to see the result yourself. |
| **4. Decide** | `My decision for task [N]: … What I saw: …` | The task logged and closed. Then a new chat for the next task. |

## A worked example

```text
You:  Define a task: the home page shows my list of books.
AI:   (proposes the Standard lane, saves docs/ai-work/tasks/001-brief.md,
       summarizes it, and waits)

You:  I approve the brief at docs/ai-work/tasks/001-brief.md. Build it.
AI:   (builds only that, runs its checks, writes 001-report.md — DONE)

You:  How do I try it?
AI:   (gives you the exact steps; you look at the page yourself)

You:  My decision for task 1: accept. What I saw: the list shows all
      three books I typed in.
AI:   (records it; you open a new chat for task 2)
```

That's a normal day. Everything below handles the exceptions.

## Small stuff: the Tiny lane

For a change so small it needs no paperwork — a typo, a label, a color:

```text
Tiny change: [describe it]
```

The AI checks it truly qualifies (small, obvious, reversible, no side effects). If it
does not qualify, the AI must decline and ask you to define a task instead — that
refusal is the system working. After three Tiny changes in a row, the next change goes
through a Standard task.

## Draft tasks: judging before adopting

Most first attempts should be **Drafts** — candidates for you to look at, not
commitments. When a Draft task finishes, your decision includes judging it:

- **Keep it:** `My decision for task [N]: accept — keep this draft.` A later task
  makes it the project's real behavior, and the contract requires that step to name
  exactly what you chose.
- **Reject it:** `My decision for task [N]: revise — not this one. What I observed: [what felt wrong]`.
  The project's current behavior stays unchanged, and a different attempt gets a new
  brief.

## When to get a second look

A **fresh-context review** means opening a brand-new chat and typing:

```text
Review task [N].
```

The new chat re-examines the work skeptically without repairing it and gives one
verdict: PASS, PASS WITH CONCERNS, FAIL, or VALID STOPPED. Do this:

- when a milestone is reached;
- after any STOPPED, reopened, or confusing task;
- whenever you feel unsure;
- routinely, at least every third Standard task.

A fresh chat avoids the builder's tunnel vision, but it is still the same kind of AI
on the same code — for high-stakes work it never replaces a qualified human.

## When you feel lost

```text
Stop. What just happened?
```

Works in any chat, at any moment. The AI freezes, changes nothing, and explains where
things stand and what your options are. Use it freely — it costs nothing.

## When progress stalls: the Direction Gate

Patching the same problem forever is the most common way AI projects die. The contract
forces a halt when the same blocker hits twice, two tasks pass with nothing visible to
show, a "fixed" problem comes back twice, or your timebox runs out. When any of those
happens, type:

```text
Direction check: [what happened].
```

You will get two or three *genuinely different* options — a smaller milestone, a
different approach, experienced help, or a pause — each with its cost and its fastest
visible test. Pick one. No third patch is allowed until you do.

## The first five tasks

Your project's `docs/ai-work/PILOT.md` tracks the first five tasks: how long until you
saw something, whether it moved the milestone, and whether it needed rework. After
five, look at the table and decide what to simplify. The workflow must earn its
paperwork; where it only cost time, cut it.

Beyond the pilot, every closed task lands as one row in `docs/ai-work/LOG.md` — the
project's one-glance history. The Cairn app can read it: connect your project folder
on the Daily screen (Chrome or Edge) to see your real recent work and share it.

## High-Stakes work

When a task touches money, personal data, security, dependencies, deployment, or
anything hard to reverse, the AI must propose the High-Stakes lane. Switch to the
[High-Stakes guide](HIGH-STAKES.md) — and note that some of that work requires an
experienced human, full stop.

## Stop the moment

- an AI asks you to paste a secret — refuse; the contract forbids it from asking;
- code appears without an approved brief;
- the AI wants more scope than the brief allows — that needs a new brief, not a yes
  in chat;
- anything could delete or overwrite files nobody has examined.

When in doubt: `Stop. What just happened?`

## When Cairn updates

Your project's contract carries its version (`Cairn Contract v1.2` in the header of
`AGENTS.md`), and nothing updates by itself — an update is a change to your project's
rules, so you approve it like any other change. The
[changelog](https://github.com/kjleblanc/cairn/blob/main/CHANGELOG.md) says what each
version changed.

The easy way to notice: connect your project folder in the Cairn app — when a newer
contract exists, the dashboard shows an update button with these same steps.

**Step 1.** Copy the new `CONTRACT-TEMPLATE.md` into your project folder (drag the
file in, or use the app's copy button and save it under exactly that name).

**Step 2.** Paste the check message — nothing changes yet:

```text
Check this project's Cairn contract against the new version I placed at
CONTRACT-TEMPLATE.md. Read both files and change nothing yet.

Confirm the template is a Cairn contract with a newer version number than
AGENTS.md. Then explain in plain language what would change in the rules and
what stays the same. My Project facts block (STATUS, PROJECT NAME, and the
rest) must carry over exactly as it is.

If the template is missing, older, or not a Cairn contract, say so and stop.

Then stop and wait. The only message that applies the update begins:
"I approve the contract update. Apply it."
```

**Step 3.** Read the summary. If you're happy, paste:

```text
I approve the contract update. Apply it.

Replace the contents of AGENTS.md with the new template's text, then restore
my existing Project facts block exactly as it was, including STATUS. Remove
the CONTRACT-TEMPLATE.md copy afterward. Change no other files — my log,
tasks, and reports stay untouched.

Show me the restored Project facts and the new version line. If Git is
available and the state is safe, commit the contract update staged by name,
with a message naming the old and new versions. Do not push.
```

That's it — the update touches one file, and your project's history stays exactly as
it was.

**The even easier way (Chrome/Edge):** with your project connected in the app, press
**Apply it for me** on the update notice. Cairn rewrites `AGENTS.md` only, keeps your
Project facts exactly, and hands you this message so Git records the change:

```text
I used the Cairn app to update this project's contract. Verify that AGENTS.md is
a complete Cairn contract at the new version with my Project facts intact, and
that no other file changed. Then commit only AGENTS.md with a message naming the
old and new contract versions. Do not push. If anything looks wrong, stop and
show me.
```

## Troubleshooting

**"The AI asks for approval in its own words."** After defining a task, the AI may
ask "shall I proceed?" or "just say yes." Don't. Approval is always the scripted
message — `I approve the brief at [path]. Build it.` — and the contract tells the AI
to accept nothing else. Paste the real thing.

**"The AI is ignoring the workflow."** Start your message with "Follow the project
contract in AGENTS.md." If it persists, start a new chat — long chats drift.

**"The AI's answer contradicts its own report."** Ask for a fresh-context review of
that task in a new chat. The saved files, not the chat, are the record.

**Windows: an npm command fails before it even starts.** If PowerShell blocks a
script with an error mentioning `npm.ps1`, the AI may retry the identical command
through `npm.cmd` and must tell you it did so. If the command starts and *then* fails,
that is a real failure and requires an honest STOPPED — not a retry trick.
