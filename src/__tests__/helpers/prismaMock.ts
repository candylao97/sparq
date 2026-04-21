/**
 * Typed Prisma mock factory for unit tests.
 *
 * Usage:
 *   jest.mock('@/lib/prisma', () => ({
 *     prisma: require('@/__tests__/helpers/prismaMock').createPrismaMock(),
 *   }))
 *   import { prisma } from '@/lib/prisma'
 *   const mp = prisma as any
 *   mp.user.findUnique.mockResolvedValueOnce({ id: 'u1', role: 'ADMIN' })
 *
 * Each model delegate exposes the common Prisma methods as jest.fn(). Add more
 * delegates/methods here as route coverage expands.
 */

const METHODS = [
  'findUnique',
  'findFirst',
  'findMany',
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
  'count',
  'aggregate',
  'groupBy',
] as const

const MODELS = [
  'user',
  'providerProfile',
  'customerProfile',
  'service',
  'booking',
  'bookingStatusHistory',
  'review',
  'message',
  'notification',
  'payout',
  'dispute',
  'giftVoucher',
  'availability',
  'category',
  'suburb',
  'auditLog',
  'contactLeakageFlag',
  'portfolioItem',
  'subscription',
  'processedWebhookEvent',
  'setting',
  'fraudSignal',
  'kycVerification',
  'adminNote',
  'reviewReport',
  'featuredProvider',
  'bannedUserHistory',
  'emailLog',
  'smsLog',
  'wishlist',
  'refund',
  'paymentIntent',
] as const

type ModelDelegate = Record<(typeof METHODS)[number], jest.Mock>
type PrismaMock = Record<(typeof MODELS)[number], ModelDelegate> & {
  $transaction: jest.Mock
  $executeRaw: jest.Mock
  $executeRawUnsafe: jest.Mock
  $queryRaw: jest.Mock
  $queryRawUnsafe: jest.Mock
  $connect: jest.Mock
  $disconnect: jest.Mock
}

export function createPrismaMock(): PrismaMock {
  const mock = {} as PrismaMock
  for (const model of MODELS) {
    const delegate = {} as ModelDelegate
    for (const method of METHODS) delegate[method] = jest.fn()
    ;(mock as Record<string, unknown>)[model] = delegate
  }
  // $transaction: by default runs the callback with the mock itself, or resolves
  // arrays of promises for the array form.
  mock.$transaction = jest.fn(async (arg: unknown) => {
    if (typeof arg === 'function') return (arg as (tx: unknown) => Promise<unknown>)(mock)
    if (Array.isArray(arg)) return Promise.all(arg as Promise<unknown>[])
    return arg
  })
  mock.$executeRaw = jest.fn().mockResolvedValue(0)
  mock.$executeRawUnsafe = jest.fn().mockResolvedValue(0)
  mock.$queryRaw = jest.fn().mockResolvedValue([])
  mock.$queryRawUnsafe = jest.fn().mockResolvedValue([])
  mock.$connect = jest.fn().mockResolvedValue(undefined)
  mock.$disconnect = jest.fn().mockResolvedValue(undefined)
  return mock
}

/** Clear all jest.fn() call histories on the given prisma mock. */
export function resetPrismaMock(mock: PrismaMock): void {
  for (const model of MODELS) {
    for (const method of METHODS) mock[model][method].mockReset()
  }
  mock.$transaction.mockClear()
  mock.$executeRaw.mockClear()
  mock.$executeRawUnsafe.mockClear()
  mock.$queryRaw.mockClear()
  mock.$queryRawUnsafe.mockClear()
}

export type { PrismaMock, ModelDelegate }
