export const meta = {
  name: 'dev-pipeline',
  description: 'Two senior coders (one writes, one peer-reviews), then a code reviewer, a UI/UX reviewer, and a tester — looping until clean',
  whenToUse: 'Run a full implement→peer-review→fix→review(code+UX)→fix→test cycle with the role-based agents (two senior-coders, code-reviewer, ux-reviewer, tester).',
  phases: [
    { title: 'Implement', detail: 'Coder A writes the code' },
    { title: 'Peer review', detail: 'Coder B reviews Coder A\'s work' },
    { title: 'Peer fix', detail: 'Coder A addresses peer feedback' },
    { title: 'Review', detail: 'code-reviewer critiques the diff' },
    { title: 'UX review', detail: 'ux-reviewer critiques the UI/UX' },
    { title: 'Fix', detail: 'Coder A addresses blocker/should-fix findings' },
    { title: 'Test', detail: 'tester writes and runs tests' },
  ],
}

// The task to work on comes in via `args` (a string, or {task: "..."}).
const task = typeof args === 'string' ? args : args?.task
if (!task) {
  return { error: 'No task provided. Pass the task description as args, e.g. Workflow({name:"dev-pipeline", args:"Add X to Y"}).' }
}

const REVIEW_SCHEMA = {
  type: 'object',
  required: ['clean', 'findings'],
  properties: {
    clean: { type: 'boolean', description: 'true if there are no blocker or should-fix findings' },
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['severity', 'location', 'problem', 'fix'],
        properties: {
          severity: { type: 'string', enum: ['blocker', 'should-fix', 'nit'] },
          location: { type: 'string' },
          problem: { type: 'string' },
          fix: { type: 'string' },
        },
      },
    },
  },
}

const TEST_SCHEMA = {
  type: 'object',
  required: ['passed', 'summary'],
  properties: {
    passed: { type: 'boolean', description: 'true if all tests ran and passed' },
    summary: { type: 'string', description: 'what was tested and the result' },
    failures: { type: 'string', description: 'verbatim failing output, empty if none' },
    blameCode: { type: 'boolean', description: 'true if a failure points to a real bug in the app code (not the test)' },
  },
}

// Turn a set of findings into a fix instruction for a coder.
const fixPrompt = (intro, findings) =>
  `${intro}\n\n` +
  findings
    .map((f, i) => `${i + 1}. [${f.severity}] ${f.location}\n   Problem: ${f.problem}\n   Suggested fix: ${f.fix}`)
    .join('\n\n')

const mustFixOf = (review) =>
  (review?.findings || []).filter(f => f.severity === 'blocker' || f.severity === 'should-fix')

const MAX_ROUNDS = 3

// ── 1. Coder A implements ────────────────────────────────────────────────────
phase('Implement')
let lastWork = await agent(
  `You are Coder A. Implement this task in the codebase:\n\n${task}\n\nWrite the code now. When done, summarise what you changed and which files.`,
  { agentType: 'senior-coder', label: 'coderA:implement', phase: 'Implement' }
)

// ── 2. Coder B peer-reviews Coder A's work ───────────────────────────────────
phase('Peer review')
const peer = await agent(
  `You are Coder B, a second senior engineer doing a peer review of Coder A's changes (run \`git diff\`). ` +
  `Review it as an engineer who will share ownership of this code: catch bugs, risky edge cases, and anything you'd do differently. ` +
  `The task was:\n\n${task}\n\nReport findings.`,
  { agentType: 'senior-coder', label: 'coderB:peer-review', phase: 'Peer review', schema: REVIEW_SCHEMA }
)

// ── 3. Coder A addresses peer feedback ───────────────────────────────────────
const peerFixes = mustFixOf(peer)
if (peerFixes.length > 0) {
  phase('Peer fix')
  lastWork = await agent(
    fixPrompt('You are Coder A. Your peer (Coder B) reviewed your work and raised these. Address each in the code, no unrelated changes.', peerFixes),
    { agentType: 'senior-coder', label: 'coderA:peer-fix', phase: 'Peer fix' }
  )
}

// ── 4–6. Reviewers (code + UI/UX) + tester loop ──────────────────────────────
let review, uxReview, tests
for (let round = 1; round <= MAX_ROUNDS; round++) {
  // Code review and UI/UX review run concurrently — different lenses on the same diff.
  ;[review, uxReview] = await parallel([
    () => agent(
      `Review the current working-tree changes (run \`git diff\`). The task being implemented was:\n\n${task}\n\nReport findings.`,
      { agentType: 'code-reviewer', label: `review-r${round}`, phase: 'Review', schema: REVIEW_SCHEMA }
    ),
    () => agent(
      `Review the UI/UX of the current working-tree changes (run \`git diff\`). The task being implemented was:\n\n${task}\n\nReport findings. If the diff has no user-facing UI changes, return clean.`,
      { agentType: 'ux-reviewer', label: `ux-review-r${round}`, phase: 'UX review', schema: REVIEW_SCHEMA }
    ),
  ])

  const mustFix = [...mustFixOf(review), ...mustFixOf(uxReview)]
  if (mustFix.length > 0) {
    phase('Fix')
    lastWork = await agent(
      fixPrompt('You are Coder A. The code reviewer and UI/UX reviewer found issues. Fix each in the code, no unrelated changes.', mustFix),
      { agentType: 'senior-coder', label: `coderA:fix-r${round}`, phase: 'Fix' }
    )
  }

  phase('Test')
  tests = await agent(
    `Write and run tests (\`npm run test\`) for the current changes. The task was:\n\n${task}\n\nReport pass/fail with output.`,
    { agentType: 'tester', label: `test-r${round}`, phase: 'Test', schema: TEST_SCHEMA }
  )

  const reviewClean = mustFix.length === 0
  if (reviewClean && tests?.passed) {
    log(`Converged after round ${round}: code + UX review clean, tests green.`)
    break
  }

  if (!tests?.passed && tests?.blameCode && round < MAX_ROUNDS) {
    phase('Fix')
    lastWork = await agent(
      `You are Coder A. Tests are failing due to a real bug in the code. Fix it.\n\nFailing output:\n${tests.failures}\n\nSummary: ${tests.summary}`,
      { agentType: 'senior-coder', label: `coderA:fix-tests-r${round}`, phase: 'Fix' }
    )
  } else if (round === MAX_ROUNDS) {
    log(`Reached max ${MAX_ROUNDS} rounds — stopping with remaining issues for human review.`)
  }
}

return {
  task,
  finalWork: lastWork,
  peerReview: { clean: peer?.clean, summary: peer?.summary, findings: peer?.findings },
  review: { clean: review?.clean, summary: review?.summary, findings: review?.findings },
  uxReview: { clean: uxReview?.clean, summary: uxReview?.summary, findings: uxReview?.findings },
  tests: { passed: tests?.passed, summary: tests?.summary, failures: tests?.failures },
}
