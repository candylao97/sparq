'use client'

import { useState, useCallback } from 'react'
import { Share2, Heart, Check } from 'lucide-react'

interface ShareSaveButtonsProps {
  providerName: string
  providerId: string
}

export function ShareSaveButtons({ providerName, providerId }: ShareSaveButtonsProps) {
  const [saved, setSaved] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [copyMsg, setCopyMsg] = useState<string | null>(null)

  const showMsg = useCallback((msg: string) => {
    setCopyMsg(msg)
    setTimeout(() => setCopyMsg(null), 2500)
  }, [])

  async function handleShare() {
    const url = `${window.location.origin}/providers/${providerId}`
    if (navigator.share) {
      try {
        setSharing(true)
        await navigator.share({ title: `${providerName} on Sparq`, text: `Check out ${providerName} on Sparq`, url })
      } catch {
        // User cancelled — not an error
      } finally {
        setSharing(false)
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        showMsg('Link copied!')
      } catch {
        showMsg('Could not copy link')
      }
    }
  }

  async function handleSave() {
    try {
      const res = await fetch('/api/wishlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId }),
      })
      if (res.status === 401) {
        showMsg('Sign in to save artists')
        return
      }
      if (res.ok) {
        setSaved(true)
        showMsg('Saved!')
      }
    } catch {
      showMsg('Could not save')
    }
  }

  return (
    <div className="flex items-center gap-1 relative">
      <button
        onClick={handleShare}
        disabled={sharing}
        className="inline-flex items-center gap-1.5 text-sm text-[#717171] hover:text-[#1A1A1A] px-3 py-2 rounded-full hover:bg-[#f3ece9] transition-colors disabled:opacity-50"
        aria-label="Share this artist"
      >
        <Share2 className="w-4 h-4" />
        <span className="hidden sm:inline">Share</span>
      </button>
      <button
        onClick={handleSave}
        disabled={saved}
        className={`inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-full hover:bg-[#f3ece9] transition-colors ${
          saved ? 'text-[#E96B56]' : 'text-[#717171] hover:text-[#E96B56]'
        }`}
        aria-label={saved ? 'Saved' : 'Save this artist'}
      >
        {saved ? <Check className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
        <span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span>
      </button>
      {copyMsg && (
        <span className="absolute -bottom-8 right-0 whitespace-nowrap rounded-lg bg-[#1A1A1A] px-2.5 py-1 text-xs text-white shadow-lg">
          {copyMsg}
        </span>
      )}
    </div>
  )
}
