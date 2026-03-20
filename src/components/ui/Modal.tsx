'use client'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Modal({ open, onClose, title, children, size = 'md', className }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-xl w-full animate-fade-in-up', sizes[size], className)}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e1de] dark:border-[#1A1A1A]/20">
            <h2 className="text-lg font-bold text-[#1A1A1A] dark:text-white">{title}</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-[#f3ece9] dark:hover:bg-[#1A1A1A] rounded-lg transition-colors">
              <X className="w-5 h-5 text-[#717171]" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
