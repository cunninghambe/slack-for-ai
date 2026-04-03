import Avatar from './Avatar'
import ToolCallBlock from './ToolCallBlock'
import { Message } from '../types'
import { formatMessageTime } from '../utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MessageBubbleProps {
  message: Message
  groupedWithPrevious: boolean
  onThreadClick?: () => void
  onReaction?: (messageId: string, emoji: string) => void
}

export default function MessageBubble({ message, groupedWithPrevious, onThreadClick, onReaction }: MessageBubbleProps) {
  const isAgent = message.sender.isAgent

  const avatar = !groupedWithPrevious ? (
    <div style={{ width: 36, marginRight: 12, paddingTop: 2 }}>
      <Avatar user={message.sender} size="md" showStatus />
    </div>
  ) : (
    <div style={{ width: 36, marginRight: 12 }} />
  )

  const bgStyle = isAgent ? { background: 'var(--agent-bg)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2)', borderLeft: '2px solid var(--agent-border)' } : {}

  return (
    <div
      style={{
        display: 'flex',
        padding: groupedWithPrevious ? '2px var(--space-6)' : 'var(--space-4) var(--space-6) var(--space-2)',
        gap: 0,
        transition: 'background 0.1s',
        ...bgStyle,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = isAgent ? 'var(--agent-bg)' : 'rgba(255,255,255,0.02)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = isAgent ? 'var(--agent-bg)' : 'transparent')}
    >
      {avatar}

      <div style={{ flex: 1, minWidth: 0 }}>
        {!groupedWithPrevious && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {message.sender.name}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              {formatMessageTime(message.timestamp)}
            </span>
          </div>
        )}

        {/* Structured data block */}
        {message.isStructured && message.structuredData && (
          <div
            style={{
              background: 'var(--structured-bg)',
              border: '1px solid var(--structured-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-2)',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 'var(--space-3)', color: 'var(--text-primary)' }}>
              {'\uD83D\uDCCA'} {message.sender.name} — Summary
            </div>
            {Object.entries(message.structuredData).map(([key, value]) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  padding: 'var(--space-1) 0',
                  gap: 'var(--space-4)',
                }}
              >
                <span>{key}:</span>
                <span style={{ color: 'var(--text-primary)' }}>{String(value)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.map((tc) => (
          <ToolCallBlock key={tc.id} toolCall={tc} agentName={message.sender.name} />
        ))}

        {/* Text content - Markdown */}
        {message.content && (
          <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Reactions */}
        {(message.reactions.length > 0 || onReaction) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'var(--space-2)', alignItems: 'center' }}>
            {message.reactions.map((r, idx) => (
              <span
                key={idx}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 'var(--radius-full)',
                  padding: '2px 8px',
                  fontSize: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                onClick={() => onReaction?.(message.id, r.emoji)}
              >
                <span>{r.emoji}</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{r.count}</span>
              </span>
            ))}
            {onReaction && (
              <button
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-full)',
                  padding: '2px 6px',
                  fontSize: 12,
                  cursor: 'pointer',
                  opacity: 0.6,
                }}
                onClick={() => onReaction(message.id, '\u{1F44D}')}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
                title="Add thumbs up reaction"
              >
                +
              </button>
            )}
          </div>
        )}
        {/* Thread link */}
        {message.threadCount && message.threadCount > 0 && (
          <button
            onClick={onThreadClick}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-primary)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              padding: 'var(--space-1) 0',
              marginTop: 'var(--space-1)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {message.threadCount} {message.threadCount === 1 ? 'reply' : 'replies'} — View thread {'\u2192'}
          </button>
        )}
      </div>
    </div>
  )
}
