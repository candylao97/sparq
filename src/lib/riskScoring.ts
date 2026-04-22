import { prisma } from './prisma'

export interface RiskSignal {
  code: string
  label: string
  severity: 'low' | 'medium' | 'high'
}

const PII_PATTERNS = [
  /\b04\d{8}\b/g,                        // AU mobile
  /\b(\+61|0)[0-9 \-]{8,12}\b/g,         // AU phone variants
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // email
  /\binstagram\b|\bwhatsapp\b|\btelegram\b|\bsnapchat\b/gi,
  /\bdm me\b|\btext me\b|\bcall me\b|\bcontact me\b/gi,
]

export function detectPII(text: string): boolean {
  return PII_PATTERNS.some(p => p.test(text))
}

export async function computeRiskSignals(providerId: string): Promise<{
  signals: RiskSignal[]
  level: 'LOW' | 'MEDIUM' | 'HIGH'
}> {
  const provider = await prisma.providerProfile.findUnique({
    where: { id: providerId },
    include: {
      user: { select: { createdAt: true, email: true } },
      services: { select: { title: true, description: true, price: true } },
    },
  })

  if (!provider) return { signals: [], level: 'LOW' }

  const bookings = await prisma.booking.findMany({
    where: { providerUserId: provider.userId },
    select: { status: true },
    take: 50,
    orderBy: { createdAt: 'desc' },
  })

  const signals: RiskSignal[] = []

  // 1. PII in bio or tagline
  const textFields = [provider.bio, provider.tagline].filter(Boolean).join(' ')
  if (detectPII(textFields)) {
    signals.push({ code: 'PII_IN_PROFILE', label: 'Phone/email detected in profile bio', severity: 'high' })
  }

  // 2. PII in service descriptions
  const serviceText = provider.services.map(s => `${s.title} ${s.description || ''}`).join(' ')
  if (detectPII(serviceText)) {
    signals.push({ code: 'PII_IN_SERVICES', label: 'Contact info detected in service listing', severity: 'high' })
  }

  // 3. Anomalous pricing
  const prices = provider.services.map(s => s.price)
  if (prices.some(p => p < 15)) {
    signals.push({ code: 'PRICE_TOO_LOW', label: 'Service price unusually low (< $15)', severity: 'medium' })
  }
  if (prices.some(p => p > 2000)) {
    signals.push({ code: 'PRICE_TOO_HIGH', label: 'Service price unusually high (> $2000)', severity: 'medium' })
  }

  // 4. High cancellation rate
  if (bookings.length >= 5) {
    const cancelled = bookings.filter(b =>
      ['CANCELLED', 'CANCELLED_BY_PROVIDER', 'DECLINED'].includes(b.status)
    ).length
    const rate = cancelled / bookings.length
    if (rate > 0.4) {
      signals.push({ code: 'HIGH_CANCELLATION', label: `High cancellation rate (${Math.round(rate * 100)}%)`, severity: 'high' })
    } else if (rate > 0.25) {
      signals.push({ code: 'ELEVATED_CANCELLATION', label: `Elevated cancellation rate (${Math.round(rate * 100)}%)`, severity: 'medium' })
    }
  }

  // 5. New account, no services
  const accountAgeMs = Date.now() - new Date(provider.user.createdAt).getTime()
  const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24)
  if (accountAgeDays < 3 && provider.services.length === 0) {
    signals.push({ code: 'NEW_EMPTY_ACCOUNT', label: 'Account < 3 days old with no services', severity: 'low' })
  }

  // 6. Stripe not connected
  if (!provider.stripeAccountId) {
    signals.push({ code: 'NO_STRIPE', label: 'No Stripe Connect account linked', severity: 'medium' })
  }

  // Compute overall risk level
  const highCount = signals.filter(s => s.severity === 'high').length
  const medCount = signals.filter(s => s.severity === 'medium').length

  let level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
  if (highCount >= 1) level = 'HIGH'
  else if (medCount >= 2) level = 'HIGH'
  else if (medCount >= 1) level = 'MEDIUM'

  return { signals, level }
}
