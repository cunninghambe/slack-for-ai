import { useState, useRef } from 'react'

interface MessageComposerProps {
  channelName: string
  placeholder?: string
  onSend: (content: string) => void
  onTyping?: () => void
  disabled?: boolean
}

export default function MessageComposer({ channelName, placeholder, onSend, onTyping, disabled }: MessageComposerProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    // Auto-resize
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 200) + 'px'
    }
    // Notify parent that user is typing
    if (onTyping && e.target.value.length > 0) {
      onTyping()
    }
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
        {channelName.startsWith('#') ? channelName : `#${channelName}`}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || `Message #${channelName}...`}
          disabled={disabled}
          rows={1}
          style={{
            flex: 1,
            background: 'var(--bg-input)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3) var(--space-4)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            lineHeight: 1.6,
            minHeight: 44,
            resize: 'none',
            outline: 'none',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          style={{
            background: text.trim() ? 'var(--accent-primary)' : 'rgba(99,102,241,0.3)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '0 var(--space-4)',
            height: 44,
            cursor: text.trim() ? 'pointer' : 'not-allowed',
            fontWeight: 500,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontFamily: 'var(--font-sans)',
            transition: 'background 0.15s',
          }}
        >
          Send {'\u25B6'}
        </button>
      </div>
    </div>
  )
}
