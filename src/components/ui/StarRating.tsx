'use client'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  interactive?: boolean
  onChange?: (rating: number) => void
  className?: string
}

export function StarRating({ rating, maxRating = 5, size = 'md', showValue, interactive, onChange, className }: StarRatingProps) {
  const sizes = { sm: 'w-3.5 h-3.5', md: 'w-5 h-5', lg: 'w-6 h-6' }
  const starPath = 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z'

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {Array.from({ length: maxRating }).map((_, i) => {
        const fill = Math.min(1, Math.max(0, rating - i))
        return (
          <span
            key={i}
            onClick={() => interactive && onChange?.(i + 1)}
            className={cn(interactive && 'cursor-pointer hover:scale-110 transition-transform')}
          >
            <span className={cn('relative inline-block', sizes[size])}>
              {/* Empty star (background) */}
              <svg className={cn(sizes[size], 'text-[#e8e1de]')} viewBox="0 0 20 20" fill="currentColor">
                <path d={starPath} />
              </svg>
              {/* Filled star (clipped to fill%) */}
              {fill > 0 && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fill * 100}%` }}
                >
                  <svg className={cn(sizes[size], 'text-[#E96B56]')} viewBox="0 0 20 20" fill="currentColor">
                    <path d={starPath} />
                  </svg>
                </span>
              )}
            </span>
          </span>
        )
      })}
      {showValue && <span className="ml-1 text-sm text-[#717171] font-medium">{rating.toFixed(1)}</span>}
    </div>
  )
}
