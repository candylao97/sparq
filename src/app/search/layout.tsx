import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Find nail & lash artists near you — Sparq',
  description: 'Browse verified nail and lash artists in your area. Read real reviews, view portfolios, and book in minutes.',
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
