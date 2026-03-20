import { TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-[#1A1A1A] dark:text-[#717171] mb-1.5">{label}</label>}
        <textarea
          ref={ref}
          rows={4}
          className={cn(
            'w-full px-4 py-3 rounded-xl border border-[#e8e1de] dark:border-[#1A1A1A]/20 bg-white dark:bg-[#1A1A1A] text-[#1A1A1A] dark:text-white placeholder-[#717171] focus:outline-none focus:ring-2 focus:ring-[#E96B56] focus:border-transparent transition-all duration-200 resize-none',
            error && 'border-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
