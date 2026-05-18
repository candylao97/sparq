import Link from 'next/link'
import { SparkMark } from './SparkMark'

const COLUMNS: { heading: string; links: [string, string][] }[] = [
  {
    heading: 'Browse',
    links: [
      ['Nail artists', '/search?category=nails'],
      ['Lash artists', '/search?category=lashes'],
      ['Makeup artists', '/search?category=makeup'],
      ['By suburb', '/search'],
    ],
  },
  {
    heading: 'About',
    links: [
      ['How it works', '/how-it-works'],
      ['Trust & safety', '/trust'],
      ['Press', '/press'],
    ],
  },
  {
    heading: 'Artists',
    links: [
      ['Become an artist', '/register/provider'],
      ['Earnings', '/how-it-works/earn'],
      ['Resources', '/help'],
    ],
  },
  {
    heading: 'Support',
    links: [
      ['Help centre', '/help'],
      ['Contact', '/contact'],
    ],
  },
]

export function HomeFooter() {
  return (
    <footer className="border-t border-sparq-border py-8 md:py-12">
      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-8 lg:px-12">
        <div className="grid grid-cols-2 gap-6 border-b border-sparq-border pb-6 sm:grid-cols-4 md:gap-10 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr] lg:pb-8">
          <div className="col-span-full mb-1 flex flex-col gap-2 lg:col-auto lg:mb-0">
            <Link href="/" className="flex items-center gap-1.5 text-[20px] font-extrabold tracking-[-0.02em] text-sparq-coral" aria-label="Sparq home">
              <SparkMark size={18} />
              sparq
            </Link>
            <p className="max-w-[280px] text-[13px] text-[#717171]">
              Independent nail, lash &amp; makeup artists across Melbourne.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h2 className="mb-3 text-[13px] font-bold">{col.heading}</h2>
              {col.links.map(([label, href]) => (
                <Link key={label} href={href} className="block py-1 text-[13px] text-[#717171] hover:text-sparq-ink">
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="pt-[18px] font-mono text-[11px] leading-[1.6] tracking-[0.04em] text-sparq-muted md:flex md:justify-between md:pt-[22px]">
          <span>© 2026 Sparq Pty Ltd · ABN 84 612 738 491</span>
          <span>Melbourne, AU · A$ AUD · Privacy · Terms</span>
        </div>
      </div>
    </footer>
  )
}
