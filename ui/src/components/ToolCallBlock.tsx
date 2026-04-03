import { ToolCall } from '../types'
import { useState } from 'react'

interface ToolCallBlockProps {
  toolCall: ToolCall
  agentName?: string
}

const STATUS_ICONS: Record<string, string> = {
  pending: '\u23F3',
  complete: '\u2705',
  failed: '\u274C',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--warning)',
  complete: 'var(--success)',
  failed: 'var(--error)',
}

function getDuration(toolCall: ToolCall): string | null {
  if (toolCall.startedAt && toolCall.completedAt) {
    const ms = new Date(toolCall.completedAt).getTime() - new Date(toolCall.startedAt).getTime()
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }
  return null
}

export default function ToolCallBlock({ toolCall, agentName }: ToolCallBlockProps) {
  const shouldCollapse = (toolCall.outputLines ?? 0) > 3

  const [paramsExpanded, setParamsExpanded] = useState(false)
  const [outputExpanded, setOutputExpanded] = useState(!shouldCollapse)

  return (
    <div
      style={{
        background: 'var(--tool-call-bg)',
        borderLeft: toolCall.status === 'failed' ? '2px solid var(--error)' : '2px solid var(--tool-call-border)',
        ...(toolCall.status === 'failed' ? { border: '1px solid var(--error)', borderLeft: '2px solid var(--error)' } : {}),
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        margin: 'var(--space-2) 0',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-3)' }}>
        <span>
          {STATUS_ICONS[toolCall.status]}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
          {agentName} invoked
        </span>
        <code
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-primary)',
            background: 'rgba(255,255,255,0.05)',
            padding: '2px 6px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {toolCall.name}
        </code>
        {getDuration(toolCall) && (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            ({getDuration(toolCall)})
          </span>
        )}
        {/* Status badge */}
        <span
          style={{
            fontSize: 11,
            color: STATUS_COLORS[toolCall.status],
            fontWeight: 500,
            marginLeft: 'auto',
          }}
        >
          {toolCall.status}
        </span>
      </div>

      {/* Error message shown by default for failed tool calls */}
      {toolCall.status === 'failed' && toolCall.output && (
        <div
          style={{
            background: 'rgba(255, 59, 48, 0.1)',
            border: '1px solid var(--error)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            marginBottom: 'var(--space-2)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--error)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {toolCall.output}
        </div>
      )}

      {/* Parameters */}
      {Object.keys(toolCall.parameters).length > 0 && (
        <div style={{ marginBottom: 'var(--space-2)' }}>
          <button
            onClick={() => setParamsExpanded(!paramsExpanded)}
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--text-secondary)',
              width: '100%',
            }}
          >
            <span style={{ transform: paramsExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
              {'\u25B6'}
            </span>
            Parameters
          </button>
          {paramsExpanded && (
            <pre
              style={{
                background: 'rgba(0,0,0,0.2)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3)',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                overflow: 'auto',
                marginTop: 4,
                margin: 0,
              }}
            >
              {JSON.stringify(toolCall.parameters, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Output (skip duplicate display for failed calls which show output inline) */}
      {toolCall.output && !(toolCall.status === 'failed') && (
        <div>
          <button
            onClick={() => setOutputExpanded(!outputExpanded)}
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--text-secondary)',
              width: '100%',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ transform: outputExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                {'\u25B6'}
              </span>
              Output ({toolCall.outputLines ?? 0} lines)
            </span>
            <span>{'\u25BC'}</span>
          </button>
          {outputExpanded && (
            <pre
              style={{
                background: 'rgba(0,0,0,0.2)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3)',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                marginTop: 4,
                margin: 0,
              }}
            >
              {toolCall.output}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
