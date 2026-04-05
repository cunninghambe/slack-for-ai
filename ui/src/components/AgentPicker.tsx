import { useState, useEffect } from 'react'
import type { User } from '../types'
import StatusDot from './StatusDot'

/** Modal that lists agents and lets the user start a DM with one */
interface AgentPickerProps {
  currentAgentId: string
  onSelect: (agentId: string) => void
  onClose: () => void
}

export default function AgentPicker({
  onSelect,
  onClose,
}: AgentPickerProps) {
  const [agents, setAgents] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    import('../api/client')
      .then(({ getAgents }) => getAgents())
      .then((list) => {
        setAgents(list)
        setLoading(false)
      })
      .catch((err) => {
        setError('Failed to load agents')
        setLoading(false)
        console.error('Failed to fetch agents:', err)
      })
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(255,255,255,0.1)',
          width: 360,
          maxHeight: 420,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            {'\u{1F464}'} Start a Direct Message
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 18,
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            {'\u00D7'}
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--space-2) 0',
          }}
        >
          {loading && (
            <div
              style={{
                padding: 'var(--space-4)',
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                fontSize: 13,
              }}
            >
              Loading agents...
            </div>
          )}

          {error && (
            <div
              style={{
                padding: 'var(--space-4)',
                textAlign: 'center',
                color: 'var(--error)',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {!loading &&
            !error &&
            agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => onSelect(agent.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: 'var(--space-2) var(--space-4)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  gap: 10,
                  fontFamily: 'var(--font-sans)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <StatusDot status={agent.status} />
                <span
                  style={{
                    textAlign: 'left',
                    flex: 1,
                    fontSize: 14,
                    color: 'var(--text-primary)',
                    fontWeight: 400,
                  }}
                >
                  {agent.name}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {agent.status}
                </span>
              </button>
            ))}

          {!loading && !error && agents.length === 0 && (
            <div
              style={{
                padding: 'var(--space-4)',
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                fontSize: 13,
              }}
            >
              No agents found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
