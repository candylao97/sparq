'use client'
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'dark' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, fullWidth, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-[#E96B56] hover:bg-[#a63a29] text-white shadow-sm hover:shadow-md',
      secondary: 'bg-white hover:bg-[#f9f2ef] text-[#1A1A1A] border border-[#e8e1de] shadow-sm hover:shadow-md',
      dark: 'bg-[#1A1A1A] hover:bg-[#333] text-white shadow-sm hover:shadow-md',
      ghost: 'bg-transparent hover:bg-[#f3ece9] text-[#1A1A1A]',
      danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md',
      outline: 'bg-transparent border border-[#E96B56] text-[#E96B56] hover:bg-[#E96B56]/5',
    }
    const sizes = {
      sm: 'px-4 py-2 text-sm rounded-full',
      md: 'px-6 py-2.5 text-sm rounded-full',
      lg: 'px-8 py-3.5 text-base rounded-full',
    }
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#E96B56]/25',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
