# Cairn Desktop

The Cairn workflow as a desktop app: define → approve → build → verify → decide,
with the safety rules enforced by code. One project, one window, one safe step at a time.

## Install

Download the latest release for your computer from
https://github.com/kjleblanc/cairn/releases — the `.exe` Setup on Windows,
the `.dmg` on Mac.

**The honest part about the warnings.** Cairn Desktop is not yet code-signed
(signing certificates cost real money; it's planned). Your computer will warn you
once:

- **Windows** shows "Windows protected your PC". Click **More info**, then
  **Run anyway**.
- **Mac** says the app "can't be opened because it is from an unidentified
  developer". Right-click the app, choose **Open**, then **Open** again.

The app also needs [Claude Code](https://claude.com/claude-code) signed in once —
the first-run screen walks you through it.

## Develop

```sh
npm run build -w @cairn/core   # repo root, once
cd app && npm install
npm start                      # dev window
npm run test:smoke             # offline mock loop, end to end
npm run make                   # local installer for this OS
```

`CAIRN_MOCK=1 npm start` runs the whole app against the offline demo engine —
no AI calls, no sign-in needed.
