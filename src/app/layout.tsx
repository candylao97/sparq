import type { Metadata } from 'next'
import { Noto_Serif, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { MainWrapper } from '@/components/layout/MainWrapper'
import { ChatBubble } from '@/components/providers/ChatBubble'
import { ToasterClient } from '@/components/layout/ToasterClient'

const notoSerif = Noto_Serif({
  subsets: ['latin'],
  variable: '--font-headline',
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Sparq — Book trusted nail & lash artists near you',
  description: 'Browse real portfolios, read honest reviews, and book in minutes. Verified artists across Australia.',
  keywords: 'nail artist, lash artist, gel nails, lash extensions, lash lift, beauty booking, nail salon, beauty marketplace, Australia',
  openGraph: {
    title: 'Sparq — Book trusted nail & lash artists near you',
    description: 'Browse real portfolios, read honest reviews, and book in minutes.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${notoSerif.variable} ${plusJakarta.variable} font-sans antialiased`}>
        <Providers>
          <Navbar />
          <MainWrapper>
            {children}
          </MainWrapper>
          <Footer />
          <ChatBubble />
          {/* ToasterClient is 'use client' — prevents SSR/hydration mismatch from react-hot-toast style injection */}
          <ToasterClient />
        </Providers>
      </body>
    </html>
  )
}
