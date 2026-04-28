# Refresh AGENT_BRIEF.md to Current Reality

## Context

`AGENT_BRIEF.md` was last updated 2026-04-27, but multiple sessions
have shipped since then. Several items have wrong status, missing
new findings aren't recorded, and the "Notes on the queue" section
contains stale facts (e.g. claims main has only Initial commit,
which has been false for weeks).

This is a documentation refresh, not a code change. Your job is to
reconcile the brief with what actually shipped, then commit the
updated brief.

## Sources of truth (in priority order)

1. **`git log main --oneline`** — what's actually merged
2. **The codebase itself** — what's actually present
3. **The existing AGENT_BRIEF.md** — for ids, status legend,
   formatting, escalations
4. **Your investigation** — to fill gaps

The third one is structurally authoritative for format. The first
two are authoritative for facts. When they conflict, code wins.

## Phase 1 — Reconciliation audit

Before writing any changes, produce a written reconciliation
report covering:

### 1.1 What's actually merged on main

Run `git log main --oneline | head -100`. For each merge commit
referencing an AUDIT-id or FIND-id, note:
- The id
- The merge commit SHA
- The merge date
- The corresponding AGENT_BRIEF.md entry (if any) and its current
  status
- The correct status it should be (`MERGED` if landed)

### 1.2 What's missing entirely from the brief

The following items were shipped in recent sessions but may not be
in the brief at all. Verify each:
- **FIND-18 (Tip payout bug)** — pre-existing P0 caught during
  Item 6a investigation. Tips were captured but never transferred
  to artists. Fixed in `feat/remove-premium-tiers` follow-up or
  `fix/find-18-tip-payout`.
- **Premium tier removal** — the brief mentions this in Decisions
  log 2026-04-27 but should also reflect that AUDIT-001 is now
  formally `SUPERSEDED` (already correct in some places).
- **Bio field removal (Session 2)** — needs an entry. Likely a
  new FIND-id (FIND-18 is taken, so FIND-19 or whatever's next).
- **Categories restriction (Session 2)** — needs an entry. New
  FIND-id.
- **Headings to Title Case (Session 2)** — minor; could be a new
  FIND-id or a "Decisions log" entry only.
- **Search 500 + ratings audit fix** — already shipped
  (`fix/search-500-raw-sql-rename`). Mentions FIND-1/2/3 fallout
  and homepage/nearby query bugs the audit caught.
- **Items 3+4 from booking batch (availability profile/booking
  mismatch)** — landed on `fix/availability-profile-booking-mismatch`.
- **Item 5 (address validation)** — landed on
  `fix/address-validation-booking-and-service-area`.
- **CI infrastructure** — landed on `chore/ci-setup`. Worth a
  Decisions log entry; the brief currently doesn't mention CI exists.

### 1.3 Stale claims to remove

The following are out of date in the current brief:
- "Notes on the queue" claims main has only `Initial commit`.
  False — main has many commits since the recovery brief landed.
- Some `IN_REVIEW` branches are now `MERGED`. Verify each.
- The escalations table has entries with dates 2026-04-21 that
  may have status updates worth noting (e.g. AUDIT-002's collapse
  is captured, but the table doesn't reflect it).
- Anything else that contradicts current main.

### 1.4 New escalations or decisions

Any decision or escalation reached in recent sessions that should
be in the Decisions log:
- 2026-04-27 — CI setup (typecheck/build/test gating, lint
  non-blocking, test.failing pattern adopted)
- 2026-04-27 — Premium tiers removed (already in log)
- (Latest date) — Bio field removed
- (Latest date) — Categories restricted to 3
- (Latest date) — Headings normalized to Title Case
- (Latest date) — FIND-18 tip payout shipped

Stop after Phase 1 with the written report. Wait for my approval
before editing AGENT_BRIEF.md.

## Phase 2 — Apply the updates

After approval, apply changes to `AGENT_BRIEF.md`:

### Header
- Update `Last updated` to today's date
- Update `Last AUDIT-id assigned` if any new AUDIT-ids were
  assigned (probably not — recent work has used FIND-ids)
- Update `Last FIND-id assigned` to the new highest

### "Notes on the queue" section
- Remove or rewrite the "main has only Initial commit" claim
- Update any other facts that have changed
- Note that the local-merge workflow is in effect (which it is,
  per WORKFLOW_UPDATE.md)

### Per-item updates
For each item identified in Phase 1.1 as wrong-status, update:
- Status field
- Add a "Merged: {date} via commit {sha}" line in Notes
- Preserve all existing notes; add new ones, don't replace

### New entries
For each gap identified in Phase 1.2, add a full entry following
the existing format:
- Id
- Status
- Branch
- Evidence
- Notes

### Cross-references
Update if any new dependencies emerged. For example:
- FIND-18 might cross-reference AUDIT-021 (payment
  reconciliation) or the Stripe webhook routes.
- Categories restriction may obsolete certain category-related
  items if any exist.

### Decisions log
Append new entries for each decision made since the last entry.
Keep them in date order. Format follows existing entries.

### Escalations table
Update statuses where escalations have been resolved or
collapsed. AUDIT-002's collapse to "is 15% right?" should be
reflected; FIND-4 and FIND-6 are now IN_REVIEW (technical work
done, awaiting legal text); FIND-5 / AUDIT-036 still ESCALATED.

## Phase 3 — Verify the brief is internally consistent

Before committing:
- Every cross-reference points at an id that exists in the brief
- Every "blocks X" or "blocked by Y" is reciprocal
- Status legend matches what's used in entries
- No orphan ids or duplicate ids
- Header `Last updated` and `Last FIND-id assigned` match the
  body content

## Workflow

Per WORKFLOW_UPDATE.md: branch `docs/refresh-agent-brief`, commit
locally, no PR, no push. Report and stop.

One commit, with a message like "docs: refresh AGENT_BRIEF.md to
match current main state". The diff should be substantial
(multiple status changes, new entries, decisions log additions)
but mechanical — no opinions, no scope changes, just reconciling
the brief with reality.

## Out of scope

- Don't fix any bugs you find while reading
- Don't add new escalations of your own
- Don't reorganize the brief's structure (sections, headings,
  status legend) — preserve the existing format
- Don't shorten or rewrite existing entries unless they're
  factually wrong
- Don't remove the "AUDIT-018, AUDIT-019, AUDIT-022..AUDIT-035 —
  UNKNOWN" bulk entry; that's intentionally preserved

## Final report

After committing, report:
- Branch + commit SHA
- Diff stat (files, lines)
- Summary of changes:
  - Items moved to MERGED
  - New entries added (with their ids)
  - Decisions log entries appended
  - Escalation status updates
- Any contradictions you found between code and brief that you
  couldn't resolve cleanly (escalate, don't guess)

## Start

Phase 1 only. Read AGENT_BRIEF.md and `git log main`. Produce the
reconciliation report. Stop.
