import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-[#1A1A1A] dark:text-[#717171] mb-1.5">{label}</label>}
        <div className="relative">
          {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#717171]">{icon}</div>}
          <input
            ref={ref}
            className={cn(
              'w-full px-4 py-3 rounded-xl border border-[#e8e1de] dark:border-[#1A1A1A]/20 bg-white dark:bg-[#1A1A1A] text-[#1A1A1A] dark:text-white placeholder-[#717171] focus:outline-none focus:ring-2 focus:ring-[#E96B56] focus:border-transparent transition-all duration-200',
              icon && 'pl-10',
              error && 'border-red-500 focus:ring-red-500',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
