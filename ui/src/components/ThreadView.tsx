import { useState } from 'react'
import { Channel, Message, User } from '../types'
import MessageBubble from './MessageBubble'
import MessageComposer from './MessageComposer'

interface ThreadViewProps {
  parentMessage: Message
  replies: Message[]
  channel: Channel
  currentUserId: string
  onClose: () => void
  onSendMessage: (content: string) => void
}

export default function ThreadView({
  parentMessage,
  replies,
  channel,
  currentUserId,
  onClose,
  onSendMessage,
}: ThreadViewProps) {
  return (
    <div
      style={{
        width: 380,
        minWidth: 380,
        height: '100%',
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 48,
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {'\u2190'} {channel.name}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Thread</div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 18,
            padding: 4,
            lineHeight: 1,
          }}
        >
          {'\u2715'}
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4) 0' }}>
        {/* Parent message */}
        <MessageBubble message={parentMessage} groupedWithPrevious={false} />
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: 'var(--space-4) var(--space-6)' }} />
        {/* Replies */}
        {replies.map((reply) => {
          const prev = replies[replies.indexOf(reply) - 1]
          const isGrouped = prev && prev.sender.id === reply.sender.id
          return (
            <MessageBubble key={reply.id} message={reply} groupedWithPrevious={!!isGrouped} />
          )
        })}
      </div>

      {/* Input */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: 'var(--space-4) var(--space-3)' }}>
        <MessageComposer
          channelName={channel.name}
          placeholder={`Reply to thread...`}
          onSend={onSendMessage}
        />
      </div>
    </div>
  )
}
