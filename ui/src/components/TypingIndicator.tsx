import { useEffect, useState } from 'react'

interface TypingIndicatorProps {
  users: string[]
  visible: boolean
}

export default function TypingIndicator({ users, visible }: TypingIndicatorProps) {
  const [dots, setDots] = useState('')

  useEffect(() => {
    if (!visible) return
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 500)
    return () => clearInterval(interval)
  }, [visible])

  if (!visible || users.length === 0) return null

  const text =
    users.length === 1
      ? `${users[0]} is typing${dots}`
      : `${users.length} people are typing${dots}`

  return (
    <div
      style={{
        padding: '4px var(--space-6)',
        fontSize: 12,
        color: 'var(--text-tertiary)',
        fontStyle: 'italic',
        minHeight: 20,
      }}
    >
      {text}
    </div>
  )
}
