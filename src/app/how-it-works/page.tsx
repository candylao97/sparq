import { HomeNav } from '@/components/home/HomeNav'
import { HomeFooter } from '@/components/home/HomeFooter'
import { HowItWorksTour } from '@/components/howitworks/HowItWorksTour'

export const metadata = {
  title: 'How It Works | Sparq',
  description: 'Book trusted beauty artists near you — or turn your skills into income on Sparq.',
}

// Uses the home screen's page-local HomeNav/HomeFooter. The global
// Navbar/Footer are suppressed on /how-it-works via the pathname
// guard, so these render once (no double-nav).
export default function HowItWorksPage() {
  return (
    <div className="bg-sparq-cream">
      <HomeNav />
      <HowItWorksTour />
      <HomeFooter />
    </div>
  )
}
