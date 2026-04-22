'use client'
import { useEffect } from 'react'

export function ProfileViewTracker({ providerId }: { providerId: string }) {
  useEffect(() => {
    fetch(`/api/providers/${providerId}/view`, { method: 'POST' }).catch(() => {})
  }, [providerId])
  return null
}
