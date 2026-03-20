import { PrismaClient, ServiceCategory, ServiceLocation, ProviderTier, SubscriptionPlan, BookingStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const PORTFOLIO_PHOTOS = {
  NAILS: [
    'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600',
    'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=600',
    'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=600',
  ],
  LASHES: [
    'https://images.unsplash.com/photo-1583001931096-959e9a1a6223?w=600',
    'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600',
  ],
}

// Melbourne suburb coordinates for map feature
const SUBURB_COORDS: Record<string, { latitude: number; longitude: number }> = {
  Richmond: { latitude: -37.8183, longitude: 144.9984 },
  Toorak: { latitude: -37.8401, longitude: 145.0136 },
  Hawthorn: { latitude: -37.8227, longitude: 145.0340 },
  Fitzroy: { latitude: -37.7998, longitude: 144.9782 },
  'South Yarra': { latitude: -37.8386, longitude: 144.9929 },
  'Box Hill': { latitude: -37.8189, longitude: 145.1218 },
  Collingwood: { latitude: -37.8024, longitude: 144.9870 },
  Carlton: { latitude: -37.7989, longitude: 144.9672 },
  Brunswick: { latitude: -37.7720, longitude: 144.9608 },
  Prahran: { latitude: -37.8498, longitude: 144.9926 },
}

function getSuburbCoords(suburb: string) {
  const coords = SUBURB_COORDS[suburb]
  return coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}
}

const PROVIDERS = [
  // NAILS
  {
    name: 'Lily Nguyen', email: 'lily.nguyen@example.com', suburb: 'Richmond', category: 'NAILS' as ServiceCategory,
    bio: 'Award-winning nail artist with a passion for intricate designs. From minimalist to elaborate nail art, I do it all. Gel, acrylic, BIAB, and natural nail care.',
    score: 97, tier: 'ELITE' as ProviderTier, plan: 'ELITE' as SubscriptionPlan,
    services: [
      { title: 'Gel Manicure', price: 85, duration: 60 },
      { title: 'Acrylic Full Set', price: 120, duration: 90 },
      { title: 'Nail Art Add-On', price: 40, duration: 30 },
      { title: 'Pedicure', price: 75, duration: 60 },
    ],
    offerAtHome: true, offerAtStudio: true, isVerified: true,
  },
  {
    name: 'Mai Tran', email: 'mai.tran@example.com', suburb: 'Hawthorn', category: 'NAILS' as ServiceCategory,
    bio: 'Certified nail technician specialising in Korean-style nail art and dip powder. Clean, precise, and long-lasting results.',
    score: 68, tier: 'RISING' as ProviderTier, plan: 'FREE' as SubscriptionPlan,
    services: [
      { title: 'BIAB / Builder Gel', price: 90, duration: 75 },
      { title: 'Gel Manicure', price: 70, duration: 60 },
      { title: 'Nail Removal', price: 30, duration: 30 },
    ],
    offerAtHome: true, offerAtStudio: false, isVerified: false,
  },
  {
    name: 'Sophie Williams', email: 'sophie.williams@example.com', suburb: 'Toorak', category: 'NAILS' as ServiceCategory,
    bio: '3D nail art and chrome specialist. I create wearable works of art — florals, gemstones, negative space, and everything in between.',
    score: 89, tier: 'PRO' as ProviderTier, plan: 'PRO' as SubscriptionPlan,
    services: [
      { title: 'Acrylic Full Set', price: 140, duration: 120 },
      { title: 'Nail Art Add-On', price: 50, duration: 45 },
      { title: 'Bridal Nail Package', price: 220, duration: 180 },
      { title: 'BIAB / Builder Gel', price: 95, duration: 75 },
    ],
    offerAtHome: true, offerAtStudio: true, isVerified: true,
  },
  {
    name: 'Jenny Ho', email: 'jenny.ho@example.com', suburb: 'Box Hill', category: 'NAILS' as ServiceCategory,
    bio: 'Classic mani-pedi specialist. Affordable, reliable, and spotlessly clean. I offer a relaxing at-home nail service with quality products.',
    score: 61, tier: 'RISING' as ProviderTier, plan: 'FREE' as SubscriptionPlan,
    services: [
      { title: 'Gel Manicure', price: 55, duration: 45 },
      { title: 'Pedicure', price: 65, duration: 60 },
      { title: 'Gel Mani & Pedi Combo', price: 110, duration: 100 },
    ],
    offerAtHome: true, offerAtStudio: false, isVerified: false,
  },
  {
    name: 'Tina Vo', email: 'tina.vo@example.com', suburb: 'Fitzroy', category: 'NAILS' as ServiceCategory,
    bio: 'Acrylic and sculpted nail expert with 8 years of experience. I specialise in natural-looking extensions, ombre, and French tips.',
    score: 82, tier: 'PRO' as ProviderTier, plan: 'PRO' as SubscriptionPlan,
    services: [
      { title: 'Acrylic Full Set', price: 110, duration: 90 },
      { title: 'Gel Manicure', price: 75, duration: 60 },
      { title: 'Nail Removal', price: 25, duration: 20 },
      { title: 'Pedicure', price: 70, duration: 55 },
    ],
    offerAtHome: false, offerAtStudio: true, isVerified: true,
  },
  // LASHES
  {
    name: 'Mia Chen', email: 'mia.chen@example.com', suburb: 'South Yarra', category: 'LASHES' as ServiceCategory,
    bio: 'Certified lash artist specialising in volume and mega-volume techniques. I create fluffy, full lash sets that last up to 4 weeks with proper care.',
    score: 94, tier: 'ELITE' as ProviderTier, plan: 'ELITE' as SubscriptionPlan,
    services: [
      { title: 'Classic Full Set', price: 120, duration: 90 },
      { title: 'Volume Full Set', price: 170, duration: 120 },
      { title: 'Lash Refill (2-3 weeks)', price: 80, duration: 60 },
      { title: 'Lash Removal', price: 30, duration: 20 },
    ],
    offerAtHome: true, offerAtStudio: true, isVerified: true,
  },
  {
    name: 'Ava Park', email: 'ava.park@example.com', suburb: 'Prahran', category: 'LASHES' as ServiceCategory,
    bio: 'Korean-trained lash technician with a gentle, precise touch. I specialise in hybrid and wispy lash styles for a natural-glam look.',
    score: 87, tier: 'PRO' as ProviderTier, plan: 'PRO' as SubscriptionPlan,
    services: [
      { title: 'Hybrid Full Set', price: 150, duration: 105 },
      { title: 'Classic Full Set', price: 110, duration: 90 },
      { title: 'Lash Refill (2-3 weeks)', price: 75, duration: 55 },
      { title: 'Lash Lift', price: 85, duration: 60 },
    ],
    offerAtHome: true, offerAtStudio: false, isVerified: true,
  },
  {
    name: 'Isabella Torres', email: 'isabella.torres@example.com', suburb: 'Collingwood', category: 'LASHES' as ServiceCategory,
    bio: 'Passionate lash artist creating stunning looks from subtle to dramatic. Expert in Russian volume and wet-look lashes.',
    score: 74, tier: 'TRUSTED' as ProviderTier, plan: 'PRO' as SubscriptionPlan,
    services: [
      { title: 'Volume Full Set', price: 160, duration: 120 },
      { title: 'Lash Lift', price: 80, duration: 55 },
      { title: 'Lash Refill (2-3 weeks)', price: 70, duration: 50 },
    ],
    offerAtHome: true, offerAtStudio: true, isVerified: true,
  },
  {
    name: 'Rachel Kim', email: 'rachel.kim@example.com', suburb: 'Carlton', category: 'LASHES' as ServiceCategory,
    bio: 'Lash lift and tint specialist. I help you wake up with effortlessly gorgeous eyes every morning — no extensions needed.',
    score: 63, tier: 'RISING' as ProviderTier, plan: 'FREE' as SubscriptionPlan,
    services: [
      { title: 'Lash Lift', price: 75, duration: 50 },
      { title: 'Lash Lift & Tint', price: 95, duration: 65 },
      { title: 'Classic Full Set', price: 100, duration: 85 },
    ],
    offerAtHome: true, offerAtStudio: false, isVerified: false,
  },
  {
    name: 'Zara Ali', email: 'zara.ali@example.com', suburb: 'Brunswick', category: 'LASHES' as ServiceCategory,
    bio: 'New to Sparq but not to lashes! 4 years experience creating bespoke lash looks. Mega volume, cat eye, and doll eye specialist.',
    score: 48, tier: 'NEWCOMER' as ProviderTier, plan: 'FREE' as SubscriptionPlan,
    services: [
      { title: 'Volume Full Set', price: 140, duration: 110 },
      { title: 'Hybrid Full Set', price: 130, duration: 100 },
      { title: 'Lash Removal', price: 25, duration: 15 },
    ],
    offerAtHome: false, offerAtStudio: true, isVerified: false,
  },
]

const REVIEW_TEXTS: Record<string, string[]> = {
  NAILS: [
    'Lily is incredibly talented! My nails have never looked this good. The gel manicure lasted 4 weeks without chipping.',
    'Amazing attention to detail. The acrylic full set looks so natural and the shape is perfect.',
    'Super professional setup even at home. Clean, careful, and the results are stunning.',
    'I wanted something unique for my wedding and she delivered beyond my expectations. The nail art was perfection.',
    'Fast and precise. She finished in less time than quoted but quality was perfect.',
    'The BIAB overlay is incredible. My nails feel so strong and the finish is flawless.',
    'Finally found my go-to nail artist! She listens and executes perfectly. Best pedicure I have ever had.',
  ],
  LASHES: [
    'Mia is a lash genius! My volume set looks incredible and feels so light. Lasted a full 4 weeks.',
    'The hybrid lash set is exactly what I wanted — natural but glamorous. Ava has the gentlest touch.',
    'Isabella created the most stunning Russian volume set. I get compliments everywhere I go.',
    'Rachel did an amazing lash lift. I wake up looking put together every day now.',
    'The classic full set is so natural looking. My friends could not believe they were extensions!',
    'Best lash refill experience. She was so gentle and thorough — my lashes look brand new.',
    'Zara is so talented for someone so new to the platform. The mega volume set is breathtaking.',
    'The lash lift and tint combo is life-changing. So low maintenance and looks fantastic.',
    'I have been getting lashes for years and this is the best set I have ever had. Absolutely flawless.',
    'So careful around the eyes. The whole experience was relaxing and the results speak for themselves.',
  ],
}

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const adminHash = await bcrypt.hash('admin123456', 12)
  await prisma.user.upsert({
    where: { email: 'admin@sparq.com.au' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@sparq.com.au',
      password: adminHash,
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  })

  // Create customers
  const customerHash = await bcrypt.hash('password123', 12)
  const customers = []
  const customerData = [
    { name: 'Emma Wilson', email: 'emma@customer.com' },
    { name: 'Michael Brown', email: 'michael@customer.com' },
    { name: 'Olivia Taylor', email: 'olivia@customer.com' },
    { name: 'Daniel Lee', email: 'daniel@customer.com' },
    { name: 'Grace Johnson', email: 'grace@customer.com' },
  ]

  for (const cd of customerData) {
    const customer = await prisma.user.upsert({
      where: { email: cd.email },
      update: {},
      create: {
        name: cd.name,
        email: cd.email,
        password: customerHash,
        role: 'CUSTOMER',
        emailVerified: new Date(),
        image: `https://randomuser.me/api/portraits/${cd.name.includes('Michael') || cd.name.includes('Daniel') ? 'men' : 'women'}/${Math.floor(Math.random() * 50)}.jpg`,
        customerProfile: { create: {} },
      },
    })
    customers.push(customer)
  }

  console.log(`✅ Created ${customers.length} customers`)

  // Create providers
  const providerHash = await bcrypt.hash('provider123', 12)
  let providerCount = 0

  for (const pData of PROVIDERS) {
    const photos = PORTFOLIO_PHOTOS[pData.category as keyof typeof PORTFOLIO_PHOTOS] || PORTFOLIO_PHOTOS.NAILS
    const scoreFactors = {
      reviewScore: pData.score * 0.35,
      completionScore: pData.score * 0.20,
      responseScore: pData.score * 0.15,
      consistencyScore: pData.score * 0.15,
      verificationScore: pData.isVerified ? 15 : 0,
    }

    const user = await prisma.user.upsert({
      where: { email: pData.email },
      update: {},
      create: {
        name: pData.name,
        email: pData.email,
        password: providerHash,
        role: 'PROVIDER',
        emailVerified: new Date(),
        image: `https://randomuser.me/api/portraits/women/${providerCount + 10}.jpg`,
        providerProfile: {
          create: {
            bio: pData.bio,
            suburb: pData.suburb,
            city: 'Melbourne',
            state: 'VIC',
            offerAtHome: pData.offerAtHome,
            offerAtStudio: pData.offerAtStudio,
            serviceRadius: pData.offerAtHome ? 15 : null,
            ...getSuburbCoords(pData.suburb),
            studioAddress: pData.offerAtStudio ? `${Math.floor(Math.random() * 200) + 1} Main St, ${pData.suburb} VIC 3000` : null,
            tier: pData.tier,
            subscriptionPlan: pData.plan,
            isVerified: pData.isVerified,
            backgroundCheck: pData.isVerified,
            yearsExperience: Math.floor(Math.random() * 10) + 2,
            responseTimeHours: pData.score > 80 ? 1 : pData.score > 60 ? 4 : 12,
            completionRate: pData.score > 80 ? 98 : pData.score > 60 ? 92 : 85,
            scoreFactors: {
              create: {
                ...scoreFactors,
                updatedAt: new Date(),
              },
            },
            services: {
              create: pData.services.map((s: any) => ({
                title: s.title,
                category: pData.category,
                price: s.price,
                duration: s.duration,
                locationTypes: pData.offerAtHome && pData.offerAtStudio ? 'BOTH' : pData.offerAtHome ? 'AT_HOME' : 'STUDIO',
                description: `Professional ${s.title.toLowerCase()} service by ${pData.name}`,
                isActive: true,
              })),
            },
            portfolio: {
              create: photos.map((url: string, idx: number) => ({
                url,
                caption: `${pData.name}'s work - ${idx + 1}`,
                order: idx,
              })),
            },
            verification: pData.isVerified ? {
              create: {
                status: 'APPROVED',
                backgroundCheckStatus: 'APPROVED',
                reviewedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
              },
            } : undefined,
          },
        },
      },
    })

    // Create bookings and reviews
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: user.id },
      include: { services: true },
    })

    if (profile && profile.services.length > 0) {
      const reviewTexts = REVIEW_TEXTS[pData.category] || REVIEW_TEXTS.NAILS
      const numReviews = Math.floor(pData.score / 10) + 2

      for (let i = 0; i < Math.min(numReviews, reviewTexts.length); i++) {
        const customer = customers[i % customers.length]
        const service = profile.services[i % profile.services.length]
        const daysAgo = Math.floor(Math.random() * 90) + 5
        const bookingDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)

        const booking = await prisma.booking.create({
          data: {
            customerId: customer.id,
            providerId: user.id,
            serviceId: service.id,
            date: bookingDate,
            time: `${Math.floor(Math.random() * 8) + 9}:00`,
            locationType: pData.offerAtHome ? 'AT_HOME' : 'STUDIO',
            address: pData.offerAtHome ? `${i + 1}/${Math.floor(Math.random() * 100) + 1} Example Street, Melbourne VIC 3000` : null,
            status: 'COMPLETED',
            totalPrice: service.price * 1.05,
            platformFee: service.price * 0.05,
            commissionRate: pData.tier === 'PRO' || pData.tier === 'ELITE' ? 0.10 : pData.tier === 'TRUSTED' ? 0.13 : 0.15,
          },
        })

        const rating = Math.min(5, Math.max(3, Math.round(pData.score / 20) + (Math.random() > 0.7 ? -1 : 0)))
        await prisma.review.create({
          data: {
            bookingId: booking.id,
            customerId: customer.id,
            rating,
            text: reviewTexts[i % reviewTexts.length],
            createdAt: new Date(bookingDate.getTime() + 24 * 60 * 60 * 1000),
          },
        })
      }
    }

    providerCount++
    console.log(`✅ Created provider: ${pData.name} (${pData.category} - ${pData.tier})`)
  }

  // Seed suburbs
  const suburbs = [
    { name: 'Richmond', postcode: '3121', state: 'VIC', city: 'Melbourne' },
    { name: 'Toorak', postcode: '3142', state: 'VIC', city: 'Melbourne' },
    { name: 'Hawthorn', postcode: '3122', state: 'VIC', city: 'Melbourne' },
    { name: 'Fitzroy', postcode: '3065', state: 'VIC', city: 'Melbourne' },
    { name: 'South Yarra', postcode: '3141', state: 'VIC', city: 'Melbourne' },
    { name: 'Box Hill', postcode: '3128', state: 'VIC', city: 'Melbourne' },
    { name: 'Collingwood', postcode: '3066', state: 'VIC', city: 'Melbourne' },
    { name: 'Carlton', postcode: '3053', state: 'VIC', city: 'Melbourne' },
    { name: 'Brunswick', postcode: '3056', state: 'VIC', city: 'Melbourne' },
    { name: 'Prahran', postcode: '3181', state: 'VIC', city: 'Melbourne' },
    { name: 'St Kilda', postcode: '3182', state: 'VIC', city: 'Melbourne' },
    { name: 'Caulfield', postcode: '3162', state: 'VIC', city: 'Melbourne' },
  ]
  for (const s of suburbs) {
    await prisma.suburb.upsert({
      where: { name_postcode: { name: s.name, postcode: s.postcode } },
      update: {},
      create: s,
    })
  }
  console.log('✅ Seeded suburbs')

  // Seed platform settings
  const settings = [
    { key: 'platform_fee_percent', value: '15', label: 'Platform Fee (%)', group: 'payments' },
    { key: 'min_booking_amount', value: '20', label: 'Minimum Booking Amount ($)', group: 'payments' },
    { key: 'auto_accept_timeout_hours', value: '24', label: 'Auto-decline after (hours)', group: 'bookings' },
    { key: 'review_moderation_enabled', value: 'true', label: 'Review Moderation', group: 'moderation' },
    { key: 'max_flag_threshold', value: '3', label: 'Auto-flag after N reports', group: 'moderation' },
    { key: 'maintenance_mode', value: 'false', label: 'Maintenance Mode', group: 'general' },
    { key: 'support_email', value: 'support@sparq.com.au', label: 'Support Email', group: 'general' },
  ]
  for (const s of settings) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    })
  }
  console.log('✅ Seeded platform settings')

  console.log('\n🎉 Seed complete!')
  console.log('\n📋 Test accounts:')
  console.log('  Admin: admin@sparq.com.au / admin123456')
  console.log('  Provider: lily.nguyen@example.com / provider123')
  console.log('  Customer: emma@customer.com / password123')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
