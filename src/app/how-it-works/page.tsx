import { HowItWorksTour } from '@/components/howitworks/HowItWorksTour'

export const metadata = {
  title: 'How It Works | Sparq',
  description: 'Book trusted beauty artists near you — or turn your skills into income on Sparq.',
}

// Per the design (chat3): /how-it-works ships with no header and no
// footer — a standalone chrome-less editorial page. The global
// Navbar/Footer are already suppressed on this route via the
// pathname guard, so the page renders the tour only.
export default function HowItWorksPage() {
  return (
    <div className="bg-sparq-cream">
      <HowItWorksTour />
    </div>
  )
}
