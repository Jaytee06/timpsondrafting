# Local Mac Bridge

This worker is the private hop between AWS and the local repo-aware intake agent.

The browser never talks to the local machine directly. The bridge polls AWS for pending jobs, builds a prompt from `ai-context-tree/`, and returns the final assistant reply.

## Why Polling First

Polling is the simplest pilot shape:

- easy to run on a Mac with no inbound ports,
- easy to debug with logs,
- easy to replace later with a hosted worker,
- easy to use even when AWS creds are not available on the Mac,
- keeps the trust boundary clear.

## Expected Environment Variables

- `BRIDGE_CLAIM_URL`
- `BRIDGE_COMPLETE_URL`
- `BRIDGE_FAIL_URL`
- `BRIDGE_HEARTBEAT_URL`
  Optional but recommended. If set, the worker publishes online/busy/degraded heartbeats for the browser.
- `BRIDGE_SHARED_SECRET`
- `BRIDGE_WORKER_ID`
  Example: `mac-studio-office`
- `BRIDGE_POLL_INTERVAL_MS`
  Default: `3000`
- `BRIDGE_HEARTBEAT_INTERVAL_MS`
  Default: `10000`
- `CODEX_COMMAND`
  Optional. Shell command that receives the prompt on stdin and returns the final reply on stdout.

## Invocation Modes

Current scaffold supports:

1. Stub mode
   If `CODEX_COMMAND` is unset, the worker returns a safe placeholder answer.
2. Shell mode
   If `CODEX_COMMAND` is set, the worker shells out and passes the generated prompt on stdin.
3. Auto-detected Codex mode
   If `CODEX_COMMAND` is unset, the worker now tries `/opt/homebrew/bin/codex`, `/usr/local/bin/codex`, then `codex` from `PATH`, and runs `codex exec --full-auto --ephemeral -C <repoRoot> -`.

## Local Env Files

The worker will auto-load either of these files if present:

- `local-bridge/.env`
- `.env.local`

Use [local-bridge/.env.example](/Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting/local-bridge/.env.example) as the starting point.

## Install Dependencies

The local bridge uses the root project dependencies, not a separate `local-bridge/package.json`.

Install them from the repo root:

```bash
cd /Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting
source ~/.nvm/nvm.sh
nvm use 20.14
npm install
```

## Run

Start the bridge from the repo root so it can use the root `bridge` script and auto-load `local-bridge/.env`:

```bash
cd /Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting
source ~/.nvm/nvm.sh
nvm use 20.14
npm run bridge
```

Direct invocation also works, but the normal path is `npm run bridge` from the repo root:

```bash
cd /Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting
source ~/.nvm/nvm.sh
nvm use 20.14
node local-bridge/worker.mjs
```
