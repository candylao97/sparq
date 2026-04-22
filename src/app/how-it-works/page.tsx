import Link from 'next/link'
import Image from 'next/image'
import { BadgeCheck, Sparkles, ShieldCheck } from 'lucide-react'

export const metadata = {
  title: 'How It Works | Sparq',
  description: 'Book trusted beauty artists near you — or turn your skills into income on Sparq.',
}

export default function HowItWorksPage() {
  return (
    <div className="bg-[#FDFBF7] text-[#1A1A1A] overflow-x-hidden">

      {/* ── Hero ── */}
      <section className="px-4 sm:px-8 lg:px-16 py-8 lg:py-12">
        <div className="relative h-[560px] md:h-[700px] w-full overflow-hidden rounded-2xl">
          <Image
            src="https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1600&h=900&fit=crop&q=90"
            alt="Luxury nail art"
            fill
            sizes="100vw"
            className="object-cover brightness-90"
            priority
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A1A]/60 via-[#1A1A1A]/20 to-transparent" />

          {/* Text */}
          <div className="absolute inset-0 flex flex-col justify-center px-10 md:px-20">
            <p className="font-jakarta text-[11px] font-bold uppercase tracking-[0.4em] text-[#E96B56] mb-5">
              Process &amp; Philosophy
            </p>
            <h1 className="font-headline text-[3.5rem] md:text-[6rem] leading-[0.92] tracking-tight text-white uppercase max-w-4xl">
              The Art of the{' '}
              <br />
              <em className="not-italic font-light text-[#FAEEED] italic">Appointment</em>
            </h1>
            <p className="mt-8 max-w-md font-jakarta text-base text-white/75 leading-relaxed">
              A curated ecosystem where Australia&apos;s most skilled beauty artists meet the clients who value their craft.
            </p>
          </div>
        </div>
      </section>

      {/* ── Two Journeys ── */}
      <section className="px-4 sm:px-8 lg:px-16 py-20 lg:py-32 grid grid-cols-1 lg:grid-cols-2 gap-20 lg:gap-24">

        {/* The Curated Client */}
        <div className="space-y-14">
          <div className="border-b border-[#e8e1de] pb-7">
            <h2 className="font-headline text-4xl uppercase tracking-tight italic font-light text-[#1A1A1A]">
              The Curated Client
            </h2>
          </div>

          <div className="space-y-12">
            {[
              {
                num: '01',
                label: 'Discover',
                body: 'Browse our gallery of artists by specialty, location, and style. Every profile features a real portfolio and verified reviews.',
              },
              {
                num: '02',
                label: 'Consult',
                body: 'Message your chosen artist directly to tailor the look to your personal aesthetic and schedule your preferred time.',
              },
              {
                num: '03',
                label: 'Experience',
                body: 'Step in and enjoy. From first consultation to final touch, every appointment is designed to be effortless and memorable.',
              },
            ].map((step) => (
              <div key={step.num} className="flex gap-10 group">
                <span className="font-headline text-[4.5rem] leading-none text-[#e8e1de] group-hover:text-[#E96B56] transition-colors duration-700 italic select-none flex-shrink-0 -mt-2">
                  {step.num}
                </span>
                <div>
                  <h3 className="font-jakarta text-[11px] font-bold uppercase tracking-widest mb-3 text-[#a63a29]">
                    {step.label}
                  </h3>
                  <p className="text-[#717171] font-jakarta leading-relaxed max-w-md text-sm">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4">
            <Link
              href="/search"
              className="inline-block px-12 py-5 bg-[#1A1A1A] text-white font-jakarta text-[11px] uppercase tracking-[0.2em] hover:bg-[#E96B56] transition-all duration-500"
            >
              Begin Discovery
            </Link>
          </div>
        </div>

        {/* Image + quote card */}
        <div className="relative min-h-[500px]">
          <div className="h-full min-h-[500px] relative rounded-xl overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900&h=1100&fit=crop&q=85"
              alt="Artist at work"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-top"
            />
          </div>
          {/* Glass quote */}
          <div
            className="absolute bottom-10 -left-4 md:-left-10 p-8 max-w-[280px] shadow-xl rounded-xl"
            style={{
              background: 'rgba(253, 251, 247, 0.75)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(233,107,86,0.15)',
            }}
          >
            <p className="font-headline italic text-xl text-[#1A1A1A] font-light leading-snug">
              &ldquo;Luxury is the absence of noise.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* ── The Elite Artist ── */}
      <section className="bg-[#f9f2ef] py-24 lg:py-32 px-4 sm:px-8 lg:px-16">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 lg:gap-24 items-center">

          {/* Image */}
          <div className="order-2 lg:order-1 relative h-[500px] lg:h-[600px] overflow-hidden rounded-xl">
            <Image
              src="https://images.unsplash.com/photo-1487412947147-5cebf100d293?w=900&h=1100&fit=crop&q=85"
              alt="Artist workspace"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>

          {/* Content */}
          <div className="order-1 lg:order-2 space-y-14 lg:pl-8">
            <div className="border-b border-[#e8e1de] pb-7">
              <h2 className="font-headline text-4xl uppercase tracking-tight italic font-light text-[#1A1A1A]">
                The Elite Artist
              </h2>
            </div>

            <div className="space-y-10">
              {[
                {
                  label: 'Showcase',
                  body: 'Present your portfolio in a digital space that reflects the quality of your craft. High-resolution uploads and a bespoke profile layout.',
                },
                {
                  label: 'Curate',
                  body: 'You choose your clientele. Manage your calendar, set your rates, and accept the bookings that fit your vision.',
                },
                {
                  label: 'Grow',
                  body: 'Access performance insights, client analytics, and promotional tools that help you build a loyal, recurring client base.',
                },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <h3 className="font-jakarta text-[11px] font-bold uppercase tracking-widest text-[#E96B56]">
                    {item.label}
                  </h3>
                  <p className="text-[#717171] font-jakarta leading-relaxed text-sm max-w-md">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>

            <Link
              href="/register/provider"
              className="inline-block font-headline italic text-xl text-[#a63a29] border-b border-[#a63a29]/30 pb-1 hover:text-[#E96B56] hover:border-[#E96B56] transition-all duration-500"
            >
              Apply for Artist Access
            </Link>
          </div>
        </div>
      </section>

      {/* ── The Sparq Standard ── */}
      <section className="px-4 sm:px-8 lg:px-16 py-24 lg:py-32 text-center">
        <div className="max-w-4xl mx-auto space-y-10">
          <p className="font-jakarta text-[11px] font-bold uppercase tracking-[0.4em] text-[#E96B56]">
            Our Commitment
          </p>
          <h2 className="font-headline text-4xl md:text-[5rem] leading-[1] uppercase tracking-tighter text-[#1A1A1A]">
            The{' '}
            <em className="italic font-light text-[#a63a29]">Sparq</em>{' '}
            Standard
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20 pt-12">
            {[
              {
                Icon: BadgeCheck,
                title: 'Rigorous Vetting',
                body: 'Every artist is identity-checked and reviewed before going live. Only proven talent joins the network.',
              },
              {
                Icon: ShieldCheck,
                title: 'Clinical Safety',
                body: 'We mandate hygiene and sterilisation standards that exceed industry requirements — for every appointment.',
              },
              {
                Icon: Sparkles,
                title: 'Aesthetic Purity',
                body: 'Every service is a collaboration built around the integrity of the design and the comfort of the client.',
              },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="space-y-5">
                <Icon className="h-8 w-8 text-[#E96B56] mx-auto" />
                <h4 className="font-jakarta text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A]">
                  {title}
                </h4>
                <p className="text-[#717171] text-sm leading-relaxed font-jakarta">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-4 sm:px-8 lg:px-16 pb-20 lg:pb-32">
        <div
          className="py-24 lg:py-32 text-center relative overflow-hidden rounded-2xl"
          style={{ background: 'linear-gradient(135deg, #FAEEED 0%, #f3ece9 100%)' }}
        >
          <div className="relative z-10 space-y-10 max-w-3xl mx-auto px-6">
            <h2 className="font-headline text-4xl md:text-[5.5rem] uppercase tracking-tighter leading-[1] text-[#1A1A1A]">
              Ready to transcend the{' '}
              <br />
              <em className="italic font-light text-[#a63a29]">Ordinary</em>?
            </h2>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Link
                href="/search"
                className="px-14 py-5 bg-[#E96B56] text-white font-jakarta text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-[#E96B56]/20 hover:bg-[#a63a29] hover:tracking-[0.25em] transition-all duration-500"
              >
                Book an Artist
              </Link>
              <Link
                href="/register/provider"
                className="px-14 py-5 border border-[#1A1A1A]/15 text-[#1A1A1A] font-jakarta text-[11px] uppercase tracking-[0.2em] hover:bg-white transition-all duration-300"
              >
                Join the Network
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
