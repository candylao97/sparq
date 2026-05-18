/** Sparq brand mark — the spark inside a circle. */
export function SparkMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 1c6.1 0 11 4.9 11 11s-4.9 11-11 11S1 18.1 1 12 5.9 1 12 1zm0 4.2c-2.2 3.7-4.4 6.7-4.4 9.2 0 2.4 2 4.4 4.4 4.4s4.4-2 4.4-4.4c0-2.5-2.2-5.5-4.4-9.2z" />
    </svg>
  )
}
