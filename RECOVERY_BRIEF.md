# Recovery: Get Sparq Back to a Known, Buildable, Reviewable State

## Context

The state-of-repo review (STATE_OF_REPO.md, AGENT_BRIEF.md, commit 
084299b on branch docs/state-of-repo-2026-04-22) surfaced four 
blocking issues. This brief resolves them, in order, with human 
approval between phases.

**Do not proceed past any phase boundary without explicit approval.**

Decisions already made (do not revisit):
- Build drift: commit properly with a new Prisma migration.
- Stacked branches: rebase each onto main as independent PRs.
- FIND-id collision: keep ROOT_CAUSE_OUTPUT.md definitions as 
  FIND-10 through FIND-13. Renumber READINESS_OUTPUT.md definitions 
  to FIND-14 through FIND-17.
- Escalation re-baseline: ESCALATIONS.md on branch 
  docs/escalations-memo is the source of truth. My earlier 
  conversational claims about AUDIT-002/003/013/020 were wrong and 
  should be discarded wherever they've propagated.

Output: three to four committed branches, each with its own PR, 
plus an updated AGENT_BRIEF.md.

## Ground rules

- Read STATE_OF_REPO.md and AGENT_BRIEF.md from the 
  docs/state-of-repo-2026-04-22 branch before starting. Confirm 
  you've read both.
- Kill orphan dev servers on ports 3000-3010 before starting 
  (lsof check first). Report what you killed.
- Stop and escalate rather than guess. This session is about 
  reducing uncertainty, not creating more.
- If you find anything that contradicts this brief during execution, 
  stop and flag — don't work around it.

---

## PHASE 1 — Investigate and resolve build drift

Goal: understand what the 253-line schema drift represents, then 
commit it cleanly with a migration that makes `next build` green.

### Phase 1a — Investigation (read-only, 30 min budget)

1. `git diff main -- prisma/schema.prisma` — capture the full diff. 
   Identify:
   - New models added (list names)
   - New fields added (list model.field, type)
   - Renamed fields (compare against existing migrations)
   - Removed fields (list, these are the riskiest)
   - Changed field types (list, also risky)

2. For each NEW field referenced by failing TypeScript checks:
   - `src/app/dashboard/customer/page.tsx:145` reads `imminentBookings`
   - `src/app/dashboard/provider/page.tsx:113` reads `portfolioCount`, 
     `unrespondedCount`
   - `src/components/dashboard/customer/ArtistSections.tsx:245` reads 
     `minPrice`, `offerAtHome`, `offerAtStudio` on `FavouriteTalent`

   Determine whether each is:
   - In the drifted schema (the reader intends the new shape — need 
     to land the migration + update contracts)
   - Not in the drifted schema (the reader is wrong — probably a 
     refactor that was abandoned mid-flight)

3. Walk the other ~258 uncommitted files. Categorize:
   - Files in src/ that support the schema drift (expected to land 
     together)
   - Files that look orphaned — no relation to schema changes
   - Test files with stale snapshots
   - Build artifacts / lockfile changes
   - Generated files that shouldn't be committed

4. Check git reflog and stash for context: 
   `git reflog | head -30` and `git stash list`. Is there evidence 
   of an in-flight branch or reset that abandoned work here?

5. Report findings as a table:
   - What the drift represents (one paragraph)
   - Schema changes broken into additive vs destructive
   - TS errors categorized by root cause
   - Orphan file count and recommendation
   - Risk assessment: LOW / MEDIUM / HIGH for landing this as one PR

**STOP at end of Phase 1a. Wait for approval.**

### Phase 1b — Implementation (after approval)

Only after human approves the plan:

1. Create branch `chore/commit-schema-drift` off main.
2. Cherry-pick or apply ONLY the files that belong together: the 
   schema, the migration (generated fresh), the data-contract 
   updates, the dashboard readers. Do not include orphan files.
3. Generate the Prisma migration: 
   `npx prisma migrate dev --name <descriptive_name> --create-only`. 
   Review the generated SQL BEFORE applying. If it contains DROP 
   COLUMN, DROP TABLE, or type-narrowing changes, stop and escalate.
4. Apply the migration locally. Regenerate the Prisma client.
5. Update data-contract TypeScript types that changed. Update 
   consumers.
6. Run: `npx tsc --noEmit` — must be clean.
7. Run: `npx jest` — capture delta vs the 55-fail/279-pass baseline. 
   If net regressions appear, stop and investigate.
8. Run: `npm run build` — must succeed. This is the gate.
9. Commit. Push. Open draft PR with description listing:
   - What the drift was
   - Schema changes summary
   - Migration SQL
   - TS errors resolved
   - Test delta
   - Orphan files NOT included (listed separately for human to 
     decide on)
10. Report.

**STOP after PR opens. Wait for human to review and merge.**

### Phase 1 do-not-do list

- Do not commit orphan files from the working tree without separate 
  human approval per file category. "It was in the working tree" is 
  not sufficient justification.
- Do not run `prisma migrate reset` or `prisma db push`. Migrations 
  only.
- Do not force-push the branch after initial push.
- Do not touch any fix/audit-* branch during this phase.

---

## PHASE 2 — Reconcile FIND-id collisions

Goal: eliminate the double-booked FIND-10 through FIND-13 in the 
documentation.

Only proceed after Phase 1 PR is merged to main.

### Phase 2a — Catalog

1. List every file in the repo that references FIND-10, FIND-11, 
   FIND-12, or FIND-13. Grep across all branches (`git grep` with 
   `--all`).
2. For each reference, classify which definition it uses:
   - ROOT_CAUSE definition (keep at 10-13)
   - READINESS definition (rename to 14-17)
3. Produce a rename table:
   - FIND-10 (READINESS: "No admin UI/API for PromoCode") → FIND-14
   - FIND-11 (READINESS: "Search returns 0 for 'gel nails'") → FIND-15
   - FIND-12 (READINESS: "Search terminology drift") → FIND-16
   - FIND-13 (READINESS: "Register 500s on validation error") → FIND-17
4. Cross-check: are FIND-10 through FIND-13 referenced anywhere in 
   code (comments, test names, branch names)? They shouldn't be, but 
   confirm.

Report the catalog. **STOP. Wait for approval.**

### Phase 2b — Execute rename

1. Create branch `docs/reconcile-find-ids` off main.
2. Rewrite READINESS_OUTPUT.md and any other docs referencing the 
   READINESS definition of 10-13. Change the numbers to 14-17. 
   Do not change the descriptions.
3. Add a "Renumbering note" paragraph at the top of 
   READINESS_OUTPUT.md explaining the change and referencing this 
   PR.
4. Verify no remaining ambiguous references exist. ROOT_CAUSE 
   definitions unchanged.
5. Commit. Push. Open PR.

**STOP. Wait for review and merge.**

---

## PHASE 3 — Update AGENT_BRIEF.md with corrected escalations and 
reconciled FIND-ids

Goal: AGENT_BRIEF.md becomes fully self-consistent with ESCALATIONS.md 
and post-rename FIND-ids.

Only proceed after Phase 2 PR is merged.

1. Create branch `docs/agent-brief-reconciliation` off main.
2. Open AGENT_BRIEF.md. Apply these corrections:

   **Escalations section — replace incorrect descriptions with 
   ESCALATIONS.md canonical text:**
   - AUDIT-002: commission rate ratification + disclosure
   - AUDIT-003: GST / tax remittance model (merchant-of-record vs 
     conduit)
   - AUDIT-010: KYC + identity-verification policy including 
     failed-KYC UX (already correct, verify)
   - AUDIT-013: refund / cancellation-policy tiers (FLEXIBLE / 
     MODERATE / STRICT)
   - AUDIT-015: dispute-resolution SLA & auto-escalation ladder
   - AUDIT-016: review moderation & removal policy
   - AUDIT-020: pricing / surcharge transparency (ACL s.48 compliance)
   - AUDIT-036: data retention & account deletion (APP 11.2)

   **Cross-reference section — add:**
   - FIND-5 overlaps AUDIT-036 (retention matrix). Resolve together.
   - FIND-9 overlaps AUDIT-008 contradiction. Both are blocked on 
     AUDIT-003 (GST decision) — note this explicitly.

   **FIND-ids — apply Phase 2 renames:**
   - Update references from READINESS FIND-10..13 to new FIND-14..17

   **Unknown ids — mark explicitly:**
   - AUDIT-018, 019, 022-035, 038-040 have no documented source. 
     Mark all as UNKNOWN with a note: "Referenced in prior planning 
     but no surviving description. Do not assign work until 
     described."

3. Add a "Decisions log" section at the bottom if not already 
   present. Populate with:
   - 2026-04-22: Build drift resolution strategy: commit with 
     migration (Phase 1).
   - 2026-04-22: Stacked-branch strategy: rebase each to main 
     independently (Phase 4).
   - 2026-04-22: FIND-id collision: ROOT_CAUSE keeps 10-13, 
     READINESS renumbered to 14-17 (Phase 2).
   - 2026-04-22: Earlier conversational escalation descriptions 
     for AUDIT-002/003/013/020 were incorrect. ESCALATIONS.md is 
     the source of truth.

4. Commit. Push. PR.

**STOP. Wait for review and merge.**

---

## PHASE 4 — Rebase the 11 stacked fix/audit branches

Goal: each fix/audit-* branch sits on main with only its own 
commits. Independent, reviewable PRs.

Only proceed after Phase 3 PR is merged. The main branch at this 
point should build cleanly and contain the schema drift + agent 
brief reconciliation.

### Branch order (shallowest first)

The stacking order from STATE_OF_REPO.md Area 2:
- fix/audit-005-instant-book-confirmation-copy (deepest — base of 
  several stacks)
- fix/audit-006-login-gate-preserve-state (builds on 005)
- fix/audit-007-retry-payment-preserve-state (builds on 005/006)
- fix/audit-004-availability-calendar (builds on 005/006/007)
- fix/audit-001-subscription-tier-enforcement (builds on 004/005/006/007)
- fix/audit-021-payment-reconciliation-cron (builds on 001/004/005/006/007)
- fix/audit-014-chargeback-defense-ui (builds on 001/004/005/006/007/021)
- fix/audit-009-012-cancellation-policy-visibility (builds on 
  001/004/005/006/007/014/021)

Plus three already-independent:
- fix/audit-011-next-payout-visibility
- fix/audit-017-velocity-checks
- fix/audit-037-no-show-timezone

### Phase 4a — Rebase strategy confirmation

Before rebasing anything:

1. Confirm current state of each branch: ahead/behind counts vs 
   post-Phase-3 main.
2. For each stacked branch, identify which commits are truly the 
   branch's own work vs. inherited from the stack below it. Use:
   `git log main..<branch> --oneline` after Phase 3 main is current.
3. Propose a rebase plan per branch:
   - What commits will be picked
   - What commits will be dropped (inherited from deeper stack)
   - Anticipated conflicts (given that Phase 1 changed schema + 
     data contracts)

**STOP. Present the plan. Wait for approval.**

### Phase 4b — Execute rebases (one branch at a time, stop between)

For each branch, in the order listed above:

1. Fetch + check out the branch.
2. Create a backup tag: `git tag backup/<branch-name>-<date>`.
3. Interactive rebase onto main: `git rebase -i main`.
4. Drop inherited commits. Keep only the commits that are the 
   branch's own work.
5. Resolve conflicts. If a conflict is substantive (more than 
   whitespace/trivial context), stop and escalate.
6. After rebase: 
   - `npx tsc --noEmit` must be clean.
   - `npm run build` must succeed.
   - `npx jest -- --findRelatedTests <changed files>` should pass 
     or show the pre-existing failures only.
7. Force-push with `--force-with-lease`.
8. Open a PR from the rebased branch to main with description 
   linking to the AUDIT-id in AGENT_BRIEF.md.
9. Update AGENT_BRIEF.md status for that AUDIT-id from IN_REVIEW 
   (stacked) to IN_REVIEW (rebased, PR open). Commit on a separate 
   doc branch batched with others — do NOT mix doc updates into 
   the fix branch.
10. Report. STOP. Wait for approval before next branch.

**Do not rebase more than one branch without checking in.**

### Phase 4 failure modes to watch for

- If a rebase conflict reveals the branch's work was actually 
  coupled to a deeper branch's work (not just stacked on it), stop. 
  Two options to escalate:
  - Keep them merged as a combined PR (defeats the purpose but 
    sometimes right)
  - Split the coupled logic before rebasing (more work)
- If after rebase the branch doesn't build, do not push. The rebase 
  revealed latent breakage. Escalate.
- If a branch's "own work" turns out to be a single commit touching 
  <5 lines, question whether it's worth a separate PR or should 
  fold into a sibling.

---

## PHASE 5 — Final state report

After all 11 branches are rebased and PR'd:

1. Produce RECOVERY_OUTPUT.md covering:
   - Phase 1 summary: what landed, what was orphaned
   - Phase 2 summary: FIND renames applied
   - Phase 3 summary: AGENT_BRIEF.md corrections
   - Phase 4 summary: per-branch rebase outcomes, any escalations
   - Current state of each of the 21 AUDIT-ids + 17 FIND-ids
   - Remaining blockers to shipping (FIND-4/5/6 compliance, 
     undocumented env vars, no CI, etc.)
   - Recommended next session (likely Review C workflow audit, now 
     possible against a buildable baseline)
2. Commit on branch `docs/recovery-complete-<date>`. Open PR.

---

## Hard rules for this session

- The decisions in the "Context" section of this brief are final. 
  Do not second-guess them.
- Approval gates at the end of every phase are non-negotiable.
- If at any point you discover that a decision made earlier was 
  wrong (e.g. the drift turns out to contain 200+ unrelated 
  changes), stop and escalate — don't try to course-correct 
  autonomously.
- Force-push is allowed only for Phase 4b (rebased branches), and 
  only with --force-with-lease, and only after that specific 
  branch's approval.
- Do not delete any branch during this session, even if it looks 
  abandoned or redundant. Leave branch cleanup for a separate pass.
- Do not merge any PR yourself. All merges are done by humans.

## Estimated time

- Phase 1a: 30 minutes (investigation)
- Phase 1b: 4-6 hours (implementation, depends on drift complexity)
- Phase 2: 1 hour
- Phase 3: 30 minutes
- Phase 4a: 30 minutes (plan)
- Phase 4b: 30-60 minutes per branch × 11 branches = 6-11 hours
- Phase 5: 30 minutes

Total: 13-20 hours agent time. Plan for this taking more than one 
session. Hand back to human between phases if the session gets long 
enough to risk context drift.

## Start

Confirm you've read STATE_OF_REPO.md and AGENT_BRIEF.md from 
docs/state-of-repo-2026-04-22. Confirm you've killed orphan dev 
servers. Then begin Phase 1a.
