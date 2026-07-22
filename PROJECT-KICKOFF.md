# Project Kickoff — empty folder

Use this only when the project folder is empty. If it contains anything you may need,
use [Project Conversion](PROJECT-CONVERSION.md).

Copy `CONTRACT-TEMPLATE.md` into the empty folder, then open that folder in your
coding agent and paste:

```text
Set up Cairn in this empty folder. I am a beginner; explain the result plainly.

PROJECT NAME: [NAME]
WHAT I WANT TO BUILD: [DESCRIPTION]
WHO WILL USE IT: [USERS]
FIRST VISIBLE MILESTONE: [MILESTONE]

First inspect the folder. If it contains anything besides CONTRACT-TEMPLATE.md,
stop without writing and tell me to use Project Conversion.

If it is empty:
1. Rename CONTRACT-TEMPLATE.md to AGENTS.md, keep STATUS: ACTIVE, and fill in my
   project facts.
2. Create docs/ai-work/PROJECT.md with the goal, users, milestone, and current scope.
3. Create docs/ai-work/LOG.md containing only the log table header defined in
   the contract, and create the empty docs/ai-work/tasks folder.
4. Initialize Git and commit only these setup files by exact name. If Git or identity
   is unavailable, leave the files uncommitted and explain the next step.

Create nothing else. Do not install software, connect a provider, add a remote, or
write product code.

Finish by showing the files, project facts, and Git status. Then tell me to use:
"Work on: [my first visible milestone]".
```

Check that the facts are right and no unexpected files appeared. Then start one small
visible task:

```text
Work on: [the smallest useful version of the milestone].
```

The task proceeds continuously and pauses only immediately before a concrete
risky action; see [Everyday Workflow](EVERYDAY-WORKFLOW.md).
