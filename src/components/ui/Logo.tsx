interface LogoMarkProps {
  size?: number
  className?: string
  dark?: boolean
}

export function LogoMark({ size = 36, className = '', dark = false }: LogoMarkProps) {
  const color = dark ? '#FDFBF7' : '#1A1A1A'
  return (
    <span
      className={`inline-flex items-center justify-center flex-shrink-0 font-sans ${className}`}
      style={{
        fontSize: size,
        fontWeight: 700,
        color,
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}
    >
      S<span style={{ color: '#E96B56' }}>·</span>
    </span>
  )
}

interface LogoFullProps {
  dark?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function LogoFull({ dark = false, size = 'md' }: LogoFullProps) {
  const fontSize = { sm: 22, md: 26, lg: 32 }[size]
  const textColor = dark ? '#FDFBF7' : '#1A1A1A'

  return (
    <span
      className="font-sans"
      style={{
        fontSize,
        fontWeight: 700,
        letterSpacing: '-0.03em',
        color: textColor,
        lineHeight: 1,
      }}
    >
      Sparq<span style={{ color: '#E96B56' }}>·</span>
    </span>
  )
}
