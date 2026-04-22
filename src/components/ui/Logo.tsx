interface LogoMarkProps {
  size?: number
  className?: string
  dark?: boolean
}

export function LogoMark({ size = 36, className = '', dark = false }: LogoMarkProps) {
  const color = dark ? '#FDFBF7' : '#1A1A1A'
  const dotSize = Math.round(size * 0.22)
  return (
    <span
      className={`relative inline-block flex-shrink-0 ${className}`}
      style={{
        fontSize: size,
        fontWeight: 800,
        color,
        lineHeight: 1,
        letterSpacing: '0.06em',
        paddingRight: dotSize,
      }}
    >
      S
      <span
        style={{
          position: 'absolute',
          top: Math.round(size * 0.04),
          right: 0,
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: '#E96B56',
        }}
      />
    </span>
  )
}

interface LogoFullProps {
  dark?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function LogoFull({ dark = false, size = 'md' }: LogoFullProps) {
  const fontSize   = { sm: 18, md: 21, lg: 28 }[size]
  const textColor  = dark ? '#FDFBF7' : '#1A1A1A'
  const dotSize    = Math.round(fontSize * 0.24)

  return (
    <span
      className="relative inline-block font-sans select-none"
      style={{
        fontSize,
        fontWeight: 800,
        letterSpacing: '0.08em',
        color: textColor,
        lineHeight: 1,
        paddingRight: dotSize + 2,
      }}
    >
      SPARQ
      <span
        style={{
          position: 'absolute',
          top: Math.round(fontSize * 0.02),
          right: 0,
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: '#E96B56',
        }}
      />
    </span>
  )
}
