interface StatusDotProps {
  status: string
  label?: string
}

const COLORS: Record<string, string> = {
  available: 'var(--status-available)',
  idle: 'var(--status-idle)',
  working: 'var(--status-working)',
  busy: 'var(--status-busy)',
  offline: 'var(--status-offline)',
}

export default function StatusDot({ status, label }: StatusDotProps) {
  const color = COLORS[status] || COLORS.offline
  const isOffline = status === 'offline'

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: isOffline ? 'transparent' : color,
          border: isOffline ? `1.5px solid ${color}` : 'none',
          animation: status === 'working' ? 'pulse-working 1s ease-in-out infinite' : 'none',
          display: 'inline-block',
        }}
      />
      {label && (
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      )}
    </span>
  )
}
