| Task | Lane | Time to visible result | Visible progress? | DONE/STOPPED | Rework needed later? | Notes |
|---|---|---|---|---|---|---|
| 002 | Standard | One chat; tests green on the first fix | YES | DONE | No — the width bound lives in one shared helper | Spinner flood fixed by bounding the status line to terminal width; no dependency change |
| 003 | High-Stakes | One session; smoke test green and installer built same day | YES | DONE | Yes — signing, Mac build, and a real-engine run remain | Built via spec + plan outside the cairn loop; recorded retroactively; fresh review still available on request |
| 004 | Standard | Two chats; STOPPED once on a slow-start smoke test, finished after a one-line test wait fix | YES | DONE | Yes — a Final task must name the model list and document the feature | Draft candidate: --model flag + app Settings field; default unchanged; debug cruft removed before commit |
