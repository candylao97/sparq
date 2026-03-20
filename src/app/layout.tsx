import type { Metadata } from 'next'
import { Noto_Serif, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ChatBubble } from '@/components/providers/ChatBubble'
import { Toaster } from 'react-hot-toast'

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
  title: 'Sparq – Find your next go-to nail and lash artist',
  description: 'Discover trusted nail and lash artists near you. Browse real portfolios, read honest reviews, and book your next appointment in minutes.',
  keywords: 'nail artist, lash artist, gel nails, lash extensions, lash lift, beauty booking, nail salon, beauty marketplace, Australia',
  openGraph: {
    title: 'Sparq',
    description: 'Discover trusted nail and lash artists near you. Book your next appointment in minutes.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${notoSerif.variable} ${plusJakarta.variable} font-sans antialiased`}>
        <Providers>
          <Navbar />
          <main className="pt-[72px] min-h-screen">
            {children}
          </main>
          <Footer />
          <ChatBubble />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: '12px',
                background: '#fff',
                color: '#111827',
                boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                fontFamily: 'var(--font-jakarta), sans-serif',
                fontSize: '14px',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
