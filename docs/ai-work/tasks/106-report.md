# Task 106 report — the Level 3 spike: six questions against a real Kimi Code CLI

## What actually changed

- Kimi Code CLI 0.29.2 was installed (owner-approved exact action) at
  `C:\Users\KenJL\.kimi-code\bin\kimi.exe` and signed into the owner's
  membership by the owner personally (`/login`, OAuth device-code). No
  Cairn files were touched by the install.
- `docs/superpowers/specs/2026-07-28-cairn-kimi-cli-body-worker-design.md`
  — appended "Amendment 2026-07-28 (spike findings) — Task 106": every
  answer below, with docs-vs-observation disagreements named.
- This report, `106-brief.md` (committed at task start to claim the
  number), and one LOG.md row.
- Probe scripts and the throwaway work directory lived under `%TEMP%`
  (`cairn-spike`, `cairn-spike-work`) and were deleted at the spike's end,
  per the brief. Nothing probe-related entered Git.

## The six answers, observed

1. **Worker transport:** native `kimi.exe` (no shim); `-p` takes the prompt
   as argv only — piped stdin is not a prompt channel. Task prompt rides
   one argv element (~4 KB vs the ~32 KB Windows limit, with a length guard
   planned). Stream-json schema observed: whole-message assistant lines,
   OpenAI-style `tool_calls`, `role:"tool"` results, a trailing
   `meta/session.resume_hint`; no usage records; terminal state is process
   exit; claims carrier is the last assistant message. **Print mode
   persists sessions under `~/.kimi-code/sessions/`** — the disclosure's
   data sentence must name that second at-rest copy.
2. **Schema details:** as above; failure exit codes and provider retry
   notices not observed (no failure occurred) — recorded unverified.
3. **Auth probe:** ~500 ms handshake; `authenticate` takes camelCase
   `methodId` (docs' `method_id` errors -32602); signed-in `result {}`,
   signed-out `-32000`. Output-free, fast, store undisturbed.
4. **Credentials/config:** a redirected `KIMI_CODE_HOME` is a signed-out
   home (credentials are not separable from home). **`kimi provider list`
   prints `source=oauth`** — membership vs API-key is distinguishable in
   one secret-free line, so consent/disclosure wording sharpens from the
   design's "cannot tell" floor. API-key-mode output not observed (no
   second account): anything not `source=oauth` is treated as "not the
   membership".
5. **The body's shell hazard — cleared.** ACP `session/new` exposes a
   `mode` config option; plan mode ("no tool execution") plus a client that
   refuses every `session/request_permission` and `fs/*` reverse-RPC
   contained everything observed: a Bash attempt arrived as a permission
   request, refusal cancelled it, no execution; a file read arrived as
   `fs/read_text_file`, refusal failed the tool cleanly. Residual honestly
   recorded: one sample is not proof every shell path requests permission —
   the implementation pins it at the wire and treats any execution without
   a prior client permission request as a containment breach (abort and
   report). Cancel: `session/cancel` is a **notification**, not a request
   (request form errors -32601); as a notification it stops the stream
   immediately with `stopReason: "cancelled"`. Chunk streaming is
   word-level and plentiful — typing-as-it-thinks fully supported.
6. **Membership vs key:** answered by `source=oauth` above. How the
   constitution rides an ACP session was not observed (no `systemPrompt`
   parameter on `session/new`) — implementation verifies at the wire.

**Consequence:** Decision 5's hazard gate passed — the body (3b) may be
planned. Both halves now proceed against observed fact.

## Checks run and their real results

- All six questions have recorded answers marked observed / partially
  observed / not-observed, with the exact probes named (brief check 1).
- The spec amendment cites only observed facts and keeps the unobserved
  marked (check 2).
- Quota spend: **7 small real model calls** (2 print-mode, 5 ACP prompts),
  all in the temp directory, all approved by the owner beforehand with the
  exact list (check 4). A rerun of call 3 (to keep the full transcript) is
  included in that count and disclosed here.
- No credentials, tokens, or account details in any record; probe output
  was filtered through `sk-` redaction defensively and none appeared
  (check 3).

## How to try it

Read the amended spec's "Amendment 2026-07-28 (spike findings)" section.
The CLI is installed and signed in — `kimi` works in any new terminal. To
undo everything: `/logout` inside `kimi`, then delete
`C:\Users\KenJL\.kimi-code\bin\kimi.exe` and remove that directory from the
user PATH (the docs' own uninstall).

## Limitations and remaining human judgment

- One day, one machine, CLI 0.29.2: behaviors marked observed are observed
  for this version; the CLI updates itself (`kimi upgrade`) and the
  implementation's wire-level pins exist precisely to catch drift.
- The permission-coverage residual (5 above) and the
  constitution-carriage question are the two things the implementation must
  prove in tests rather than assume.
- The owner's membership now has a signed-in device (manageable in the Kimi
  console; sign-out is `/logout`).

Disposition: DONE
