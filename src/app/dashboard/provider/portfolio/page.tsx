'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import toast, { Toaster } from 'react-hot-toast'
import { Upload, Trash2, ImageIcon, ArrowLeft, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

interface PortfolioPhoto {
  id: string
  providerId: string
  url: string
  caption: string | null
  order: number
  createdAt: string
}

const MAX_PHOTOS = 20
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function PortfolioPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [photos, setPhotos] = useState<PortfolioPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [captions, setCaptions] = useState<Record<string, string>>({})
  const [savingCaptionId, setSavingCaptionId] = useState<string | null>(null)
  const [orderDirty, setOrderDirty] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)

  // Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user?.role !== 'PROVIDER' && session?.user?.role !== 'BOTH') {
      router.push('/dashboard/customer')
    }
  }, [status, session, router])

  // Fetch photos
  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch('/api/portfolio')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setPhotos(data.photos)
      // Initialize captions
      const caps: Record<string, string> = {}
      data.photos.forEach((p: PortfolioPhoto) => {
        caps[p.id] = p.caption || ''
      })
      setCaptions(caps)
    } catch {
      toast.error('Failed to load portfolio')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPhotos()
    }
  }, [status, fetchPhotos])

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Upload handler
  const handleUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)

    // Validate
    const remaining = MAX_PHOTOS - photos.length
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS} photos allowed`)
      return
    }
    const toUpload = fileArray.slice(0, remaining)
    if (toUpload.length < fileArray.length) {
      toast(`Only uploading ${toUpload.length} of ${fileArray.length} photos (limit: ${MAX_PHOTOS})`, { icon: 'ℹ️' })
    }

    for (const file of toUpload) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 10MB limit`)
        continue
      }

      setUploading(true)
      try {
        const base64 = await fileToBase64(file)
        const res = await fetch('/api/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Upload failed')
        }

        const data = await res.json()
        setPhotos(prev => [...prev, data.photo])
        setCaptions(prev => ({ ...prev, [data.photo.id]: data.photo.caption || '' }))
        toast.success('Photo uploaded')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setUploading(false)
      }
    }
  }

  // Delete handler
  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/portfolio/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')

      setPhotos(prev => prev.filter(p => p.id !== id))
      setCaptions(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      toast.success('Photo deleted')
    } catch {
      toast.error('Failed to delete photo')
    } finally {
      setDeletingId(null)
    }
  }

  // Caption save handler
  const handleSaveCaption = async (id: string) => {
    const caption = captions[id] ?? ''
    const photo = photos.find(p => p.id === id)
    if (photo && (photo.caption || '') === caption) return

    setSavingCaptionId(id)
    try {
      const res = await fetch(`/api/portfolio/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption }),
      })
      if (!res.ok) throw new Error('Update failed')

      const data = await res.json()
      setPhotos(prev => prev.map(p => (p.id === id ? data.photo : p)))
      toast.success('Caption saved')
    } catch {
      toast.error('Failed to save caption')
    } finally {
      setSavingCaptionId(null)
    }
  }

  // Reorder handlers
  function movePhoto(id: string, direction: 'up' | 'down') {
    setPhotos(prev => {
      const idx = prev.findIndex(p => p.id === id)
      if (idx === -1) return prev
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const updated = [...prev]
      ;[updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]]
      return updated
    })
    setOrderDirty(true)
  }

  const handleSaveOrder = async () => {
    setSavingOrder(true)
    try {
      const res = await fetch('/api/portfolio/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: photos.map(p => p.id) }),
      })
      if (!res.ok) throw new Error('Reorder failed')
      setOrderDirty(false)
      toast.success('Order saved')
    } catch {
      toast.error('Failed to save order')
    } finally {
      setSavingOrder(false)
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files)
    }
  }

  // Loading state
  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E96B56] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#FDFBF7_100%)]">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-8 lg:px-12 xl:px-20">
        {/* Back link */}
        <Link
          href="/dashboard/provider"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#717171] hover:text-[#1A1A1A] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1A1A1A] sm:text-3xl">Portfolio</h1>
          <p className="mt-1 text-[#717171]">Showcase your best work — up to {MAX_PHOTOS} photos</p>
        </div>

        {/* Upload area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`
            relative mb-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-colors
            ${dragOver
              ? 'border-[#E96B56] bg-orange-50'
              : 'border-[#e8e1de] bg-white hover:border-[#717171] hover:bg-[#f9f2ef]'
            }
            ${uploading ? 'pointer-events-none opacity-60' : ''}
            ${photos.length >= MAX_PHOTOS ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          {uploading ? (
            <Loader2 className="mb-3 h-10 w-10 animate-spin text-[#E96B56]" />
          ) : (
            <Upload className="mb-3 h-10 w-10 text-[#717171]" />
          )}
          <p className="text-sm font-medium text-[#1A1A1A]">
            {uploading ? 'Uploading...' : photos.length >= MAX_PHOTOS ? 'Photo limit reached' : 'Drag & drop photos here, or click to browse'}
          </p>
          <p className="mt-1 text-xs text-[#717171]">JPG, PNG, WebP — max 10MB each</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => {
              if (e.target.files && e.target.files.length > 0) {
                handleUpload(e.target.files)
                e.target.value = ''
              }
            }}
          />
        </div>

        {/* Photo count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-[#717171]">
            {photos.length} / {MAX_PHOTOS} photos
          </p>
          {photos.length > 1 && (
            <p className="text-xs text-[#717171]">Hover a photo to reorder</p>
          )}
        </div>

        {/* Empty state */}
        {photos.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#e8e1de] bg-white py-16">
            <ImageIcon className="mb-4 h-12 w-12 text-[#717171]" />
            <p className="text-sm font-medium text-[#717171]">No photos yet</p>
            <p className="mt-1 text-xs text-[#717171]">Upload photos to showcase your work to potential fans</p>
          </div>
        )}

        {/* Floating save order button */}
        {orderDirty && (
          <button
            onClick={handleSaveOrder}
            disabled={savingOrder}
            className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-5 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-[#333] disabled:opacity-60"
          >
            {savingOrder ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Save order
          </button>
        )}

        {/* Photo grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="group relative overflow-hidden rounded-2xl border border-[#e8e1de] bg-white"
              >
                {/* Image */}
                <div className="relative aspect-square">
                  <Image
                    src={photo.url}
                    alt={photo.caption || 'Portfolio photo'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />

                  {/* Reorder arrows — top-left */}
                  <div className="absolute left-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => movePhoto(photo.id, 'up')}
                      disabled={index === 0}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition-all hover:bg-black/70 disabled:opacity-30"
                      aria-label="Move left"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => movePhoto(photo.id, 'down')}
                      disabled={index === photos.length - 1}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition-all hover:bg-black/70 disabled:opacity-30"
                      aria-label="Move right"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Delete button overlay */}
                  <button
                    onClick={() => {
                      if (confirm('Delete this photo?')) handleDelete(photo.id)
                    }}
                    disabled={deletingId === photo.id}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100 disabled:opacity-50"
                  >
                    {deletingId === photo.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Caption input */}
                <div className="p-3">
                  <input
                    type="text"
                    placeholder="Add a caption..."
                    value={captions[photo.id] ?? ''}
                    onChange={e => setCaptions(prev => ({ ...prev, [photo.id]: e.target.value }))}
                    onBlur={() => handleSaveCaption(photo.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur()
                      }
                    }}
                    disabled={savingCaptionId === photo.id}
                    className="w-full border-0 bg-transparent p-0 text-sm text-[#1A1A1A] placeholder-[#717171] focus:outline-none focus:ring-0 disabled:opacity-50"
                    maxLength={100}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
