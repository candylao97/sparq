import Image from 'next/image'
import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 }
const textSizes = { xs: 'text-xs', sm: 'text-sm', md: 'text-base', lg: 'text-xl', xl: 'text-2xl' }

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const px = sizes[size]
  const initials = name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'

  if (src) {
    return (
      <div className={cn('rounded-full overflow-hidden flex-shrink-0', className)} style={{ width: px, height: px }}>
        <Image src={src} alt={name || 'Avatar'} width={px} height={px} className="object-cover w-full h-full" />
      </div>
    )
  }
  return (
    <div
      className={cn('rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-[#E96B56] to-[#a63a29] text-white font-semibold', textSizes[size], className)}
      style={{ width: px, height: px }}
    >
      {initials}
    </div>
  )
}
