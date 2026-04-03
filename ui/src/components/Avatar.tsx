import { User } from '../types'

const STATUS_COLORS: Record<string, string> = {
  available: 'var(--status-available)',
  idle: 'var(--status-idle)',
  working: 'var(--status-working)',
  busy: 'var(--status-busy)',
  offline: 'var(--status-offline)',
}

const INITIAL_COLORS = [
  '#6366F1', '#EC4899', '#F59E0B', '#10B981',
  '#3B82F6', '#EF4444', '#8B5CF6', '#06B6D4',
]

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

function getColorForId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return INITIAL_COLORS[Math.abs(hash) % INITIAL_COLORS.length]
}

interface AvatarProps {
  user: User
  size?: 'sm' | 'md' | 'lg'
  showStatus?: boolean
}

export default function Avatar({ user, size = 'md', showStatus = false }: AvatarProps) {
  const sizeMap = { sm: 28, md: 36, lg: 44 }
  const px = sizeMap[size]
  const fontSize = size === 'sm' ? 12 : size === 'md' ? 14 : 16
  const statusColor = STATUS_COLORS[user.status] || STATUS_COLORS.offline

  return (
    <div
      style={{
        width: px,
        height: px,
        minWidth: px,
        borderRadius: '50%',
        background: getColorForId(user.id),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 600,
        fontSize,
        position: 'relative',
      }}
      title={user.name}
    >
      {getInitial(user.name)}
      {showStatus && (
        <span
          style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: user.status === 'offline' ? 'var(--bg-primary)' : statusColor,
            border: `2px solid var(--bg-primary)`,
            animation: user.status === 'working' ? 'pulse-working 1s ease-in-out infinite' : 'none',
          }}
        />
      )}
    </div>
  )
}
