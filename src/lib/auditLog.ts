import { prisma } from './prisma'

export async function logAdminAction(opts: {
  actorId: string
  action: string
  targetType: string
  targetId?: string
  details?: Record<string, unknown>
  reason?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: opts.actorId,
        action: opts.action,
        targetType: opts.targetType,
        targetId: opts.targetId,
        details: opts.details as object | undefined,
        reason: opts.reason,
      },
    })
  } catch (e) {
    console.error('AuditLog write failed:', e)
  }
}
