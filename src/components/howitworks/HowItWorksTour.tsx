'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Search, Heart, Send, Shield, Droplet, Sparkles } from 'lucide-react'

/* ── Shared bits ── */

function Chrome({ url }: { url: string }) {
  return (
    <div className="flex h-9 items-center gap-1.5 border-b border-sparq-border bg-sparq-surface-warm px-3.5">
      <span className="h-2 w-2 rounded-full bg-sparq-ink/15" />
      <span className="h-2 w-2 rounded-full bg-sparq-ink/15" />
      <span className="h-2 w-2 rounded-full bg-sparq-ink/15" />
      <span className="ml-3 font-mono text-[11px] text-sparq-muted">{url}</span>
    </div>
  )
}

function Frame({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-sparq-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(60,40,30,0.08),0_30px_80px_rgba(60,40,30,0.06)]">
      <Chrome url={url} />
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  )
}

const TONE = ['from-[#F4D5C4] to-[#D88368]', 'from-[#E8C3A6] to-[#B87759]', 'from-[#9A4B2F] to-[#3D1E14]', 'from-[#F3E2D0] to-[#C49878]', 'from-[#E2A487] to-[#A03A1E]', 'from-[#D8B89F] to-[#8C5A3E]']

/* ── Mock panels (static, illustrative — per design) ── */

function GalleryPanel() {
  return (
    <Frame url="sparq.au/artists">
      <div className="flex items-center gap-2 rounded-full border border-sparq-border bg-white px-4 py-2.5 text-[12px]">
        <span className="flex-1 text-sparq-body">Service · <b className="text-sparq-ink">Builder gel</b> · Fitzroy</span>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sparq-coral text-white"><Search className="h-3 w-3" /></span>
      </div>
      <div className="mt-3 flex gap-1.5 overflow-hidden">
        {['Nails', 'Lashes', 'Bridal', 'Brows', 'At-home'].map((c, i) => (
          <span key={c} className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-semibold ${i === 0 ? 'border-sparq-ink bg-sparq-ink text-white' : 'border-sparq-border text-sparq-body'}`}>{c}</span>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {['Maya R.', 'Noor E.', 'Jules O.', 'Priya S.', 'Aroha D.', 'Lina C.'].map((n, i) => (
          <div key={n} className={`relative aspect-square overflow-hidden rounded-xl bg-gradient-to-br ${TONE[i]}`}>
            {i < 3 && <Heart className="absolute right-2 top-2 h-3.5 w-3.5 fill-white text-white drop-shadow" />}
            <span className="absolute bottom-1.5 left-2 text-[10px] font-semibold text-white drop-shadow">{n}</span>
          </div>
        ))}
      </div>
    </Frame>
  )
}

function MessagesPanel() {
  return (
    <Frame url="sparq.au/messages">
      <div className="flex items-center gap-2.5 border-b border-sparq-border pb-3">
        <span className="h-9 w-9 rounded-full bg-gradient-to-br from-[#F4D5C4] to-[#D88368]" />
        <span className="leading-tight">
          <b className="block text-[13px]">Maya R.</b>
          <span className="text-[11px] text-sparq-muted">Replies within an hour</span>
        </span>
      </div>
      <div className="flex flex-col gap-2 py-3">
        <span className="max-w-[80%] self-start rounded-2xl rounded-tl-sm bg-sparq-surface-warm px-3 py-2 text-[12px]">Hi! Loved your mood board — those almond shapes will suit your nail bed perfectly.</span>
        <span className="max-w-[80%] self-end rounded-2xl rounded-tr-sm bg-sparq-coral px-3 py-2 text-[12px] text-white">Amazing. I have these saved — too much?</span>
        <span className="flex gap-1.5 self-end">
          <span className="h-12 w-12 rounded-lg bg-gradient-to-br from-[#E8C3A6] to-[#B87759]" />
          <span className="h-12 w-12 rounded-lg bg-gradient-to-br from-[#D8B89F] to-[#8C5A3E]" />
        </span>
        <span className="max-w-[80%] self-start rounded-2xl rounded-tl-sm bg-sparq-surface-warm px-3 py-2 text-[12px]">Not at all. Builder gel + chrome accent. Sat 11am works for me 🌸</span>
        <span className="self-center font-mono text-[10px] uppercase tracking-[0.14em] text-sparq-muted">11:42 — Today</span>
      </div>
      <div className="flex items-center justify-between rounded-full border border-sparq-border px-4 py-2.5 text-[12px] text-sparq-muted">
        Message Maya…
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sparq-coral text-white"><Send className="h-3 w-3" /></span>
      </div>
    </Frame>
  )
}

function CheckoutPanel() {
  return (
    <Frame url="sparq.au/checkout">
      <div className="flex items-center gap-3 rounded-xl border border-sparq-border bg-sparq-cream p-3">
        <span className="h-14 w-14 rounded-lg bg-gradient-to-br from-[#F4D5C4] to-[#D88368]" />
        <span className="leading-tight">
          <span className="block text-[11px] text-sparq-muted">with Maya R.</span>
          <b className="block text-[13px]">Builder gel · 90 min</b>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-sparq-coral-dark">Sat 17 May · 11:00 am</span>
        </span>
      </div>
      <div className="mt-3 space-y-2 text-[12px]">
        <div className="flex justify-between"><span className="text-sparq-body">Service</span><span>A$ 95.00</span></div>
        <div className="flex justify-between"><span className="text-sparq-body">Booking fee</span><span>A$ 0.00</span></div>
        <div className="flex justify-between"><span className="text-sparq-body">Tip (optional)</span><span>—</span></div>
        <hr className="border-sparq-border" />
        <div className="flex justify-between font-bold"><span>Total</span><span>A$ 95.00</span></div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 rounded-[10px] bg-sparq-coral py-3 text-[13px] font-semibold text-white">
        Confirm and pay <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Frame>
  )
}

function ProfilePanel() {
  return (
    <Frame url="sparq.au/maya-r">
      <div className="flex items-center gap-3 border-b border-sparq-border pb-4">
        <span className="h-12 w-12 rounded-full bg-gradient-to-br from-[#F4D5C4] to-[#D88368]" />
        <span className="flex-1 leading-tight">
          <b className="block text-[14px]">Maya Robertson</b>
          <span className="text-[11px] text-sparq-muted">Builder gel · Fitzroy, VIC</span>
        </span>
        <span className="flex gap-4 text-center">
          <span><b className="block text-[14px]">4.97</b><span className="text-[10px] text-sparq-muted">rating</span></span>
          <span><b className="block text-[14px]">312</b><span className="text-[10px] text-sparq-muted">bookings</span></span>
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className={`aspect-square rounded-xl bg-gradient-to-br ${TONE[i]} ${i === 0 ? 'col-span-2 row-span-2 aspect-auto' : ''}`} />
        ))}
      </div>
    </Frame>
  )
}

function CalendarPanel() {
  const days = [
    { d: 28, m: true }, { d: 29, m: true }, { d: 30, m: true }, { d: 1 }, { d: 2, s: 'p' }, { d: 3, s: 'f' }, { d: 4 },
    { d: 5 }, { d: 6, s: 'p' }, { d: 7, s: 'f' }, { d: 8 }, { d: 9, s: 'f' }, { d: 10, s: 'f' }, { d: 11 },
    { d: 12, s: 'p' }, { d: 13 }, { d: 14, s: 't' }, { d: 15, s: 'p' }, { d: 16, s: 'f' }, { d: 17, s: 'f' }, { d: 18 },
  ]
  return (
    <Frame url="sparq.au/studio/calendar">
      <div className="flex items-center justify-between">
        <b className="text-[13px]">May 2026</b>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-sparq-muted">Week 20</span>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-sparq-muted">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1">
        {days.map((x, i) => (
          <span
            key={i}
            className={`flex aspect-square items-center justify-center rounded-md text-[11px] ${
              x.m ? 'text-sparq-muted/40'
              : x.s === 't' ? 'bg-sparq-ink font-bold text-white'
              : x.s === 'f' ? 'bg-sparq-coral/90 font-semibold text-white'
              : x.s === 'p' ? 'bg-sparq-coral-light text-sparq-coral-dark'
              : 'text-sparq-body'
            }`}
          >
            {x.d}
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-3 font-mono text-[10px] text-sparq-muted">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-sparq-coral/90" />Full</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-sparq-coral-light" />Partial</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-sparq-ink" />Today</span>
      </div>
    </Frame>
  )
}

function InsightsPanel() {
  const bars = [38, 52, 46, 60, 70, 65, 82, 92]
  return (
    <Frame url="sparq.au/studio/insights">
      <div className="grid grid-cols-3 gap-2">
        {[['Revenue (mo)', 'A$ 8.4k', '+18%'], ['Repeat rate', '71%', '+4 pts'], ['No-shows', '0.8%', '−1.2 pts']].map(([l, v, d]) => (
          <div key={l} className="rounded-xl border border-sparq-border bg-sparq-cream p-3">
            <div className="text-[10px] text-sparq-muted">{l}</div>
            <div className="mt-1 text-[15px] font-bold tabular-nums">{v}</div>
            <div className="text-[10px] font-semibold text-sparq-coral-dark">{d}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-sparq-border p-3">
        <div className="flex items-center justify-between">
          <b className="text-[12px]">Weekly bookings</b>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-sparq-muted">Last 8 weeks</span>
        </div>
        <div className="mt-3 flex h-24 items-end gap-2">
          {bars.map((h, i) => (
            <span key={i} className={`flex-1 rounded-t ${i >= 6 ? 'bg-sparq-coral' : 'bg-sparq-coral/30'}`} style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </Frame>
  )
}

/* ── Step ── */

type StepData = {
  num: string
  numLabel: string
  title: string
  lead: string
  sub: string
  features: [string, string][]
  panel: React.ReactNode
  flip?: boolean
}

function Step({ s }: { s: StepData }) {
  return (
    <div className="grid items-center gap-8 border-b border-sparq-border/50 py-14 last:border-b-0 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20 lg:py-24">
      <div className={`flex flex-col gap-4 ${s.flip ? 'lg:order-2' : ''}`}>
        <div className="flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.18em] text-sparq-coral-dark">
          <strong className="rounded-md border border-sparq-border bg-white px-2.5 py-0.5 font-sans text-[18px] font-bold tracking-tight text-sparq-ink">{s.num}</strong>
          {s.numLabel}
        </div>
        <h3 className="text-[clamp(28px,3.4vw,42px)] font-bold leading-[1.05] tracking-[-0.025em]">{s.title}</h3>
        <p className="max-w-[44ch] text-[17px] leading-[1.55] text-sparq-ink/80">{s.lead}</p>
        <p className="max-w-[44ch] text-[14.5px] leading-[1.6] text-sparq-body">{s.sub}</p>
        <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
          {s.features.map(([t, d]) => (
            <div key={t} className="flex items-start gap-2.5 text-[13.5px] leading-[1.45]">
              <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-sparq-coral" strokeWidth={2.5} />
              <span><strong className="block font-semibold text-sparq-ink">{t}</strong><span className="text-sparq-ink/80">{d}</span></span>
            </div>
          ))}
        </div>
      </div>
      <div className={s.flip ? 'lg:order-1' : ''}>{s.panel}</div>
    </div>
  )
}

/* ── Chapters ── */

function ChapterHead({ eyebrow, title, coral, aside }: { eyebrow: string; title: string; coral: string; aside: string }) {
  return (
    <header className="mb-16 flex flex-wrap items-end justify-between gap-8 border-b border-sparq-border pb-7">
      <div>
        <div className="mb-3.5 inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-sparq-coral-dark">
          <span className="h-px w-[18px] bg-sparq-coral-dark" />{eyebrow}
        </div>
        <h2 className="max-w-[18ch] text-[clamp(32px,4.2vw,52px)] font-bold leading-[1.05] tracking-[-0.025em]">
          {title} <span className="text-sparq-coral">{coral}</span>
        </h2>
      </div>
      <p className="max-w-[34ch] text-[15px] leading-[1.55] text-sparq-muted">{aside}</p>
    </header>
  )
}

function ChapterCta({ title, sub, cta, href, ink }: { title: string; sub: string; cta: string; href: string; ink?: boolean }) {
  return (
    <div className="mt-16 flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-sparq-border bg-white p-7">
      <div className="text-[16px] font-semibold">
        {title}
        <span className="mt-1 block text-[13.5px] font-normal text-sparq-muted">{sub}</span>
      </div>
      <Link
        href={href}
        className={`inline-flex items-center gap-2 rounded-[10px] px-[22px] py-3.5 text-sm font-semibold text-white ${ink ? 'bg-sparq-ink hover:bg-black' : 'bg-sparq-coral hover:bg-sparq-coral-dark'}`}
      >
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

const CLIENT_STEPS: StepData[] = [
  { num: '01', numLabel: 'Step one', title: 'Discover.', lead: 'Browse our gallery of artists by specialty, location, and style. Every profile features a real portfolio and verified reviews.', sub: 'No filtered feeds. No sponsored slots. Just artists in their own words — with the work that built them.', features: [['Real portfolios.', 'Uploaded by the artist, not scraped.'], ['Verified reviews.', 'Only from confirmed appointments.']], panel: <GalleryPanel /> },
  { num: '02', numLabel: 'Step two', title: 'Consult.', lead: 'Message your chosen artist directly to tailor the look to your personal aesthetic and schedule your preferred time.', sub: 'Share inspiration. Ask the awkward questions. Settle the details before you ever sit down.', features: [['Direct chat.', 'No agents, no relays.'], ['Mood boards.', 'Drop inspiration in-thread.']], panel: <MessagesPanel />, flip: true },
  { num: '03', numLabel: 'Step three', title: 'Experience.', lead: 'Step in and enjoy. From first consultation to final touch, every appointment is designed to be effortless and memorable.', sub: 'Arrive, exhale, leave better than you came. Payment, receipts, follow-ups — quietly handled in the background.', features: [['Cashless checkout.', 'Tip optional, transparent.'], ['One-tap rebook.', 'Aftercare sent automatically.']], panel: <CheckoutPanel /> },
]

const ARTIST_STEPS: StepData[] = [
  { num: '01', numLabel: 'Phase one', title: 'Showcase.', lead: 'Present your portfolio in a digital space that reflects the quality of your craft. High-resolution uploads and a bespoke profile layout.', sub: 'Your voice, your edit, your story — without the algorithmic noise.', features: [['High-res gallery.', 'Up to 4K, preserved.'], ['Editorial bio.', 'A bespoke layout, not a template.']], panel: <ProfilePanel /> },
  { num: '02', numLabel: 'Phase two', title: 'Curate.', lead: 'You choose your clientele. Manage your calendar, set your rates, and accept the bookings that fit your vision.', sub: 'Block out studio days. Hold premium slots for repeat clients. Decline politely. Your studio runs on your terms.', features: [['Booking controls.', 'Auto-accept or vet first.'], ['Custom pricing.', 'By service, by client, by day.']], panel: <CalendarPanel />, flip: true },
  { num: '03', numLabel: 'Phase three', title: 'Grow.', lead: 'Access performance insights, client analytics, and promotional tools that help you build a loyal, recurring client base.', sub: 'Quiet, clear data. The numbers that actually matter — repeat rate, average ticket, no-shows averted.', features: [['Retention insights.', 'Spot repeat clients early.'], ['Featured placements.', 'Editorial spotlights.']], panel: <InsightsPanel /> },
]

const LAWS = [
  { no: '01', stamp: 'Verified', icon: Shield, title: 'Rigorous vetting.', body: 'Every artist is identity-checked and reviewed before going live. Only proven talent joins the network.', detail: '100% identity-checked' },
  { no: '02', stamp: 'Audited', icon: Droplet, title: 'Clinical safety.', body: 'We mandate hygiene and sterilisation standards that exceed industry requirements — for every appointment.', detail: 'Reviewed every 90 days' },
  { no: '03', stamp: 'Curated', icon: Sparkles, title: 'Aesthetic purity.', body: 'Every service is a collaboration built around the integrity of the design and the comfort of the client.', detail: 'Editorial review on entry' },
]

export function HowItWorksTour() {
  const [role, setRole] = useState<'client' | 'artist'>('client')

  return (
    <div className="bg-sparq-cream text-sparq-ink">
      {/* Hero */}
      <section className="mx-auto w-full max-w-[1280px] px-6 py-20 md:px-10 md:py-28 lg:px-14">
        <h1 className="max-w-[16ch] text-[clamp(40px,6vw,78px)] font-bold leading-[1.0] tracking-[-0.035em]">
          The booking platform <span className="text-sparq-coral">beauty deserves.</span>
        </h1>
        <p className="mb-9 mt-5 max-w-[540px] text-[18px] leading-[1.5] text-sparq-muted">
          Real portfolios. Verified artists. Direct conversations. Here&apos;s what every step looks like inside Sparq.
        </p>
        <div className="inline-flex rounded-full border border-sparq-border bg-white p-[5px] shadow-[0_1px_2px_rgba(0,0,0,0.03)]" role="tablist" aria-label="Role view">
          {([['client', "I'm a client", 'BOOK'], ['artist', "I'm an artist", 'EARN']] as const).map(([r, label, badge]) => (
            <button
              key={r}
              role="tab"
              aria-selected={role === r}
              onClick={() => setRole(r)}
              className={`inline-flex items-center gap-2 rounded-full px-[22px] py-2.5 text-sm font-semibold transition-colors ${role === r ? 'bg-sparq-ink text-white' : 'text-sparq-muted hover:text-sparq-ink'}`}
            >
              {label}
              <span className={`rounded font-mono text-[10px] tracking-[0.1em] px-1.5 py-0.5 ${role === r ? 'bg-white/16 text-white/90' : 'bg-sparq-surface-warm text-sparq-muted'}`}>{badge}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Chapter */}
      <section className="mx-auto w-full max-w-[1280px] px-6 pb-24 md:px-10 lg:px-14">
        {role === 'client' ? (
          <>
            <ChapterHead eyebrow="For the client" title="Three steps from idea to" coral="your chair." aside="Every step is shaped around the way you actually choose an artist — slowly, on your own terms." />
            {CLIENT_STEPS.map(s => <Step key={s.num} s={s} />)}
            <ChapterCta title="Ready when you are." sub="Find an artist in Melbourne, Sydney or Brisbane in under two minutes." cta="Browse the gallery" href="/search" />
          </>
        ) : (
          <>
            <ChapterHead eyebrow="For the artist" title="A platform that" coral="respects your craft." aside="Set your rates. Choose your clients. Built to support your business — not to flatten it." />
            {ARTIST_STEPS.map(s => <Step key={s.num} s={s} />)}
            <ChapterCta title="Sparq is invitation-led." sub="Applications reviewed by our editorial team within 5 business days." cta="Apply for artist access" href="/register/provider" ink />
          </>
        )}
      </section>

      {/* The Sparq Standard */}
      <section className="bg-[#1F1D1A] text-white">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-24 md:px-10 md:py-28 lg:px-14">
          <div className="mb-14">
            <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-sparq-coral">The Sparq Standard</div>
            <h2 className="text-[clamp(28px,4.2vw,44px)] font-bold leading-[1.05] tracking-[-0.025em]">
              Three laws. <span className="text-white/55">No&nbsp;exceptions.</span>
            </h2>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
            {LAWS.map(l => {
              const Icon = l.icon
              return (
                <article key={l.no} className="flex flex-col gap-4 bg-[#1F1D1A] p-7">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sparq-coral text-[32px] leading-none">
                      {l.no}<sup className="ml-0.5 text-[12px] font-medium text-white/40">/ 03</sup>
                    </div>
                    <span className="rounded-full bg-sparq-coral/15 px-3 py-1 text-[11px] font-semibold text-sparq-coral">{l.stamp}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[18px] font-bold">
                    <Icon className="h-[18px] w-[18px] text-sparq-coral" strokeWidth={1.6} />
                    {l.title}
                  </div>
                  <p className="text-[14px] leading-[1.55] text-white/65">{l.body}</p>
                  <div className="mt-auto border-t border-white/10 pt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-white/45">{l.detail}</div>
                </article>
              )
            })}
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 text-[13px] text-white/45">
            <span>A living document. Updated as the platform grows and the craft evolves.</span>
            <span>Signed — <strong className="font-semibold text-white/80">The Sparq Editorial</strong></span>
          </div>
        </div>
      </section>

      {/* Closer */}
      <section className="mx-auto w-full max-w-[1280px] px-6 py-24 text-center md:px-10 md:py-32 lg:px-14">
        <h2 className="mx-auto max-w-[20ch] text-[clamp(32px,4.6vw,56px)] font-bold leading-[1.05] tracking-[-0.025em]">
          Two ways in. <span className="text-sparq-coral">One standard.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-[48ch] text-[16px] text-sparq-muted">
          Whether you&apos;re booking your next appointment or stepping into the network as an artist — start where you belong.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/search" className="inline-flex items-center gap-2 rounded-[10px] bg-sparq-coral px-6 py-3.5 text-sm font-semibold text-white hover:bg-sparq-coral-dark">
            Find an artist <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link href="/register/provider" className="inline-flex items-center gap-2 rounded-[10px] border border-sparq-border bg-white px-6 py-3.5 text-sm font-semibold hover:border-sparq-ink">
            Apply as an artist <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </div>
  )
}
