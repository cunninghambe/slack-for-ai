import { useCallback, useEffect, useState } from 'react'
import { User } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

interface DMModalProps {
  onClose: () => void
  onSelect: (targetAgentId: string) => void
}

export default function DMModal({ onClose, onSelect }: DMModalProps) {
  const [agents, setAgents] = useState<{ id: string; name: string; keyName: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/agents`)
      .then((res) => res.json())
      .then((data) => {
        setAgents(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleStart = useCallback(() => {
    if (selected) {
      onSelect(selected)
    }
  }, [selected, onSelect])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 'var(--radius-lg)',
          width: 400,
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        <div
          style={{
            padding: 'var(--space-4)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            Start a Direct Message
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 18,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-2) 0' }}>
          {loading ? (
            <div
              style={{
                padding: 'var(--space-4)',
                color: 'var(--text-tertiary)',
                fontSize: 14,
                textAlign: 'center',
              }}
            >
              Loading agents…
            </div>
          ) : agents.length === 0 ? (
            <div
              style={{
                padding: 'var(--space-4)',
                color: 'var(--text-tertiary)',
                fontSize: 14,
                textAlign: 'center',
              }}
            >
              No agents found
            </div>
          ) : (
            agents.map((agent) => {
              const isSelected = selected === agent.id
              return (
                <div
                  key={agent.id}
                  onClick={() => setSelected(agent.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 'var(--space-2) var(--space-3)',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(99,102,241,0.15)' : 'transparent',
                    borderLeft: isSelected
                      ? '3px solid var(--accent-primary)'
                      : '3px solid transparent',
                    transition: 'background 0.1s',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {agent.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      @{agent.keyName}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            padding: 'var(--space-3)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={!selected}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              background: selected ? 'var(--accent-primary)' : 'rgba(99,102,241,0.2)',
              color: selected ? 'white' : 'var(--text-tertiary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: selected ? 'pointer' : 'not-allowed',
              fontWeight: 500,
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
            }}
          >
            Start DM
          </button>
        </div>
      </div>
    </div>
  )
}
