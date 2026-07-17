# Project Kickoff — brand-new project

Use this guide when your project folder is empty. If the folder already contains code,
documents, or anything you might need, stop and use
[Project Conversion](PROJECT-CONVERSION.md) instead — it protects what exists.

Before starting, finish [Getting Ready](GETTING-READY.md): you need an AI coding
agent, Git, and an empty project folder.

Setup takes three steps and about fifteen minutes. Because the rules come pre-written
in this framework, the AI only fills in blanks — it does not invent your rulebook.

## Step 1 — copy in the contract

Copy the file `CONTRACT-TEMPLATE.md` from this framework folder into your empty
project folder (drag it over, or copy and paste in your file explorer). This file
becomes your project's rulebook.

Then answer these five questions in plain language — you will paste them in Step 2:

```text
PROJECT NAME:
WHAT I WANT TO BUILD:
WHO WILL USE IT:
FIRST VISIBLE MILESTONE:
DIRECTION GATE TIMEBOX:
```

The **first visible milestone** is the first thing you could actually see or try —
"a page that shows my recipe list," not "set up the database." If you have no timebox
in mind, write "default" (two tasks without visible progress).

## Step 2 — run the setup

Open your project folder in your AI coding agent and paste this, with your five
answers filled in. This is the longest prompt in the whole framework, and you use it
once.

```text
Set up the AI coding workflow in this folder. I am a complete beginner; explain
everything in plain language.

My answers:
PROJECT NAME: [NAME]
WHAT I WANT TO BUILD: [DESCRIPTION]
WHO WILL USE IT: [USERS]
FIRST VISIBLE MILESTONE: [MILESTONE]
DIRECTION GATE TIMEBOX: [TIMEBOX OR "default"]

First inspect the folder. If it contains anything besides CONTRACT-TEMPLATE.md, stop
without writing and tell me to use the Project Conversion guide.

If the folder is clean:
1. Rename CONTRACT-TEMPLATE.md to AGENTS.md and fill in its Project facts section
   with my answers, keeping STATUS: ACTIVE.
2. Create docs/ai-work/PROJECT.md holding the goal, users, first milestone, what is
   out of scope for now, and the Direction Gate timebox.
3. Create docs/ai-work/PILOT.md containing only the empty pilot table defined in the
   contract.
4. Create the empty folder docs/ai-work/tasks/.
5. Initialize Git in this folder and make one setup commit of exactly these files,
   staged by name. If Git is missing or has no name and email configured, create the
   files anyway, skip the commit, and tell me plainly what to do.

Create nothing else. Do not install anything, connect to any service, add a remote,
change settings outside this folder, or write any product code.

Finish by showing me: every file you created, the filled-in Project facts, the Git
status, and a one-paragraph summary of what the contract makes you do from now on.
```

## Step 3 — check the setup

You do not need to judge any code — just confirm these plain facts:

- `AGENTS.md` exists and its Project facts match your five answers;
- `docs/ai-work/` contains `PROJECT.md`, `PILOT.md`, and an empty `tasks/` folder;
- the pilot table is empty — no invented results;
- nothing else was created, installed, or connected;
- the AI's summary mentions waiting for your approval before building anything.

If something is off, say so in plain language ("The milestone is wrong — it should
be…") and let the AI correct it before you continue.

## Your first task

Open [Everyday Workflow](EVERYDAY-WORKFLOW.md) and type your first command:

```text
Define a task: [the smallest version of your first milestone].
```

Make the first task a **Draft** that puts something on the screen you can actually
look at. Avoid invisible groundwork — if two tasks pass with nothing to see, the
Direction Gate exists for exactly that.
