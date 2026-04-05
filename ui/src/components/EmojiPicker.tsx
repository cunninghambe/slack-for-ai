import { useRef, useEffect, useState } from 'react'

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

const CATEGORIES = [
  {
    name: 'Smileys',
    emojis: ['👍', '👎', '❤️', '🎉', '🚀', '👀', '💯', '😂', '😍', '🤔'],
  },
  {
    name: 'Gestures',
    emojis: ['🙏', '👏', '🤝', '✌️', '👊', '🤙'],
  },
  {
    name: 'Objects',
    emojis: ['🔥', '✅', '❌', '⭐', '💡', '🐛', '📝', '🎯', '📎', '📌'],
  },
]

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(-1)

  // Close when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to avoid catching the initial click that opened the picker
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        const total = CATEGORIES.reduce((sum, c) => sum + c.emojis.length, 0)
        setActiveIndex((prev) => (prev + 1) % total)
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        const total = CATEGORIES.reduce((sum, c) => sum + c.emojis.length, 0)
        setActiveIndex((prev) => (prev - 1 + total) % total)
      }
      if ((e.key === 'Enter' || e.key === ' ') && activeIndex >= 0) {
        e.preventDefault()
        const allEmojis = CATEGORIES.map((c) => c.emojis).flat()
        if (allEmojis[activeIndex]) onSelect(allEmojis[activeIndex])
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onSelect, onClose, activeIndex])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Emoji picker"
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        zIndex: 100,
        background: 'var(--bg-elevated)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 'var(--radius-lg)',
        padding: '8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        maxWidth: 280,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {CATEGORIES.map((cat) => (
        <div key={cat.name}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              marginBottom: 4,
              letterSpacing: 0.5,
            }}
          >
            {cat.name}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {cat.emojis.map((emoji) => (
              <button
                key={emoji}
                role="gridcell"
                aria-label={`Emoji: ${emoji}`}
                onClick={() => onSelect(emoji)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
                style={{
                  fontSize: 18,
                  padding: '4px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  lineHeight: 1,
                  transition: 'background 0.1s',
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
