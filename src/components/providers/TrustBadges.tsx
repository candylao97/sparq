import { BadgeCheck, Shield, RotateCcw } from 'lucide-react'

const SIGNALS = [
  { icon: BadgeCheck, label: 'Verified artist',         color: 'text-[#E96B56]'  },
  { icon: Shield,     label: 'Public liability covered', color: 'text-green-600'  },
  { icon: RotateCcw,  label: 'Free cancellation',        color: 'text-[#717171]'  },
] as const

interface Props {
  /** compact = single-line inline pills; default = spaced row with text */
  compact?: boolean
  /** Only show "Verified artist" badge when the artist is actually verified */
  isVerified?: boolean
}

export function TrustBadges({ compact = false, isVerified = false }: Props) {
  const signals = SIGNALS.filter(s => s.label !== 'Verified artist' || isVerified)

  if (compact) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {signals.map(({ icon: Icon, label, color }) => (
          <span key={label} className="flex items-center gap-1 text-[11px] text-[#717171]">
            <Icon className={`w-3 h-3 ${color} flex-shrink-0`} />
            {label}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-5 flex-wrap">
      {signals.map(({ icon: Icon, label, color }) => (
        <span key={label} className="flex items-center gap-1.5 text-sm text-[#717171]">
          <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
          {label}
        </span>
      ))}
    </div>
  )
}
