/**
 * FIND-4 — Terms of Service version tracking.
 *
 * The register endpoint and the consent UI both need to agree on which
 * version of the ToS the user is accepting. Centralising it here avoids
 * drift and gives a single source of truth for the future "re-prompt on
 * version bump" flow to reference.
 *
 * Placeholder value — legal will replace this with the published version
 * string before launch.
 */
export const CURRENT_TOS_VERSION = 'v1-placeholder'
