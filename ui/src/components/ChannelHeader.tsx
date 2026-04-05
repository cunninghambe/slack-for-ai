import { Channel, User } from '../types'
import Avatar from './Avatar'
import StatusDot from './StatusDot'

interface ChannelHeaderProps {
  channel: Channel
  users: User[]
  presenceMap?: Record<string, string>
  onSearch?: () => void
  onMenuClick?: () => void
}

export default function ChannelHeader({ channel, users, presenceMap = {}, onSearch, onMenuClick }: ChannelHeaderProps) {
  const userMap = new Map<string, User>()
  for (const u of users) userMap.set(u.id, u)

  const typeIcon = channel.type === 'public' ? '#' : channel.type === 'private' ? '\u{1F512}' : ''

  return (
    <div
      style={{
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 52,
      }}
    >
      {/* Hamburger — only visible on mobile via CSS */}
      {onMenuClick && (
        <button
          className="mobile-header"
          onClick={onMenuClick}
          aria-label="Open sidebar"
          style={{
            display: 'none', /* overridden to flex by .mobile-header media query */
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            flexShrink: 0,
            marginRight: 4,
            padding: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <rect y="3" width="18" height="2" rx="1" fill="currentColor"/>
            <rect y="8" width="18" height="2" rx="1" fill="currentColor"/>
            <rect y="13" width="18" height="2" rx="1" fill="currentColor"/>
          </svg>
        </button>
      )}

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {typeIcon && (
            <span style={{
              fontSize: 16,
              color: channel.type === 'private' ? 'var(--warning)' : 'var(--text-tertiary)',
            }}>
              {typeIcon}
            </span>
          )}
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>{channel.name}</h2>
        </div>
        {channel.description && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {channel.description}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {onSearch && (
          <button
            onClick={onSearch}
            title="Search messages (Ctrl+K)"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-md, 8px)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px 10px',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
            }}
          >
            &#x1f50d;
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Ctrl+K</span>
          </button>
        )}
        <StatusDot
          status="available"
          label={`${channel.memberCount} members`}
        />
        {/* Member avatars (show up to 3) */}
        <div style={{ display: 'flex', gap: -4, overflow: 'hidden' }}>
          {channel.members.slice(0, 3).map((memberId) => {
            const user = userMap.get(memberId)
            if (!user) return null
            const liveStatus = presenceMap[memberId] || user.status
            return (
              <div key={memberId} style={{ marginLeft: -4 }}>
                <Avatar user={{ ...user, status: liveStatus }} size="sm" showStatus />
              </div>
            )
          })}
          {channel.members.length > 3 && (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--bg-elevated)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginLeft: -4,
                border: '2px solid var(--bg-secondary)',
              }}
            >
              +{channel.members.length - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
