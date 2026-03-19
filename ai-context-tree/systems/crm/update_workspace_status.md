# CRM Update Workspace Status

## Node Type

System runbook.

## Purpose

This file defines how an agent updates `workspace_status` in the CRM.

## Restart And Failure Routing

If status update fails (field missing, value missing, permission blocked, automation overwrites change):

- Use [troubleshooting.md](troubleshooting.md) → **Status Cannot Be Updated**.
- After resolving, repeat the **Standard Procedure** below and verify the change in the UI and `activity`.

## Canonical Status Values

Use the status definitions in [../../entities/workspace_status.md](../../entities/workspace_status.md):

- `fresh`
- `contacted`
- `qualified`
- `estimate_sent`
- `won`
- `lost_na`

## Trigger Examples

- keep in `fresh` if no meaningful action has yet occurred or the record still needs first-pass review
- move to `contacted` when meaningful outreach begins or a conversation is active
- move to `qualified` when the lead is in scope and the key post-contact fields are known
- move to `estimate_sent` when the estimate has actually been delivered
- move to `won` when the sale is confirmed
- move to `lost_na` when the opportunity is closed without a sale or no longer relevant

## Related References

- [../../processes/communications/email/qualification/post_contact_required_fields.md](../../processes/communications/email/qualification/post_contact_required_fields.md)
- [field_map.md](field_map.md)

## Required Human Inputs

Document the exact UI details here:

- where the status field appears: inside the opened entity detail view
- whether it is a dropdown, chips, or board column: dropdown select
- whether save happens automatically: does not appear to auto-save; the lead drawer has an explicit `Save` button
- where change history can be verified: `activity` section inside entity detail view
- current observed interaction: when the row is opened, the drawer header shows the current workspace status as the selected dropdown value and the arrow reveals the remaining statuses

## Standard Procedure

1. Open the correct lead.
2. Locate the `workspace_status` dropdown at the top of the entity detail drawer.
3. Confirm the currently displayed value matches the lead's present status.
4. Click the dropdown arrow and choose the correct next status from the remaining options.
5. Press `Save`.
6. Verify the updated value is visible in the drawer header after save.
7. Confirm the `activity` section reflects the action if the CRM records status changes.

## Escalation Rules

- the target status is not available in the CRM
- multiple fields appear to control status
- automation immediately overwrites the manual change
- the correct next status is unclear from the documented rules
