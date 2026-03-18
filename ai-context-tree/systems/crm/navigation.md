# CRM Navigation

## Node Type

System runbook.

## Purpose

This file explains how an agent enters the CRM and gets to the main working areas.

## Restart And Failure Routing

If a major navigation or authentication step fails:

- Use [troubleshooting.md](troubleshooting.md) to classify the failure (login, missing lead, missing UI, permissions).
- After resolving, restart this runbook from **Standard Entry Procedure** step 1.

## Required Human Inputs

Current known values:

- development CRM URL: `http://localhost:4930`
- CRM base URL: `https://app.timpsondrafting.com/op/ws/kbCGfx2A`
- login URL if different: `https://app.timpsondrafting.com/auth/login` (redirect target when not authenticated)
- expected landing page after login: workspace at `https://app.timpsondrafting.com/op/ws/kbCGfx2A`
- whether Chrome should reuse an existing session or sign in each time: reuse existing authenticated browser session when available

Additional inputs to confirm from the live UI:

- login method: email + password form
- whether MFA exists and what type: `TODO` (not observed yet)
- the exact label for the pipeline view entry point (example: `Lead Pipelines`), `TODO`

## Standard Entry Procedure

1. Open Chrome.
2. Navigate to the CRM base URL.
3. If the browser already holds a valid authenticated session or bearer token, continue into the workspace.
4. If not authenticated, follow the CRM login flow.
   - If login fails or requires MFA you cannot complete, stop and route to [troubleshooting.md](troubleshooting.md) → **Cannot Log In**.
5. Confirm the expected workspace or dashboard is visible.
   - If you land in the wrong workspace or see multiple workspaces, stop and route to [troubleshooting.md](troubleshooting.md).
6. Navigate to the lead list, pipeline view, inbox, or whichever screen is the normal lead-management entry point.
   - If you cannot find the lead-management entry point, capture the visible navigation labels and route to [troubleshooting.md](troubleshooting.md).

## Authentication Note

Current assumption:

- the browser may already hold the bearer token or equivalent authenticated session
- the token should be supplied at runtime through the browser or an approved operator path
- token handling and long-term login behavior should be treated as CRM-owned concerns

Do not store raw bearer tokens in this documentation tree.

## UI Anchors To Document

Replace these placeholders once the CRM is documented from the live UI:

- top navigation labels: `TODO`
- left sidebar labels: `TODO`
- lead list menu label: `TODO`
- search bar location: `TODO`
- filter or saved-view location: `TODO`

## Live UI Capture Checklist (One-Time)

To remove the `TODO` anchors above, capture:

- a screenshot of the post-login workspace with the left nav visible
- a screenshot showing the lead list / pipeline view entry point
- the exact text of the menu item that opens the `Fresh` queue

## Success Condition

The agent can reliably reach the screen where leads are reviewed and selected for action.

## Escalation Rules

- login fails
- MFA blocks autonomous operation
- the expected navigation labels are missing
- multiple workspaces exist and the correct one is unclear
