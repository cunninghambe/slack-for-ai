import { useState, useEffect, useRef, useCallback } from 'react'
import { searchMessages } from '../api/client'
import type { SearchResult } from '../api/client'

interface SearchModalProps {
  onClose: () => void
  onSelectChannel: (channelId: string) => void
  activeChannelId?: string | null
}

export default function SearchModal({ onClose, onSelectChannel, activeChannelId }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Escape key closes modal
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      setTotal(0)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await searchMessages(q)
      setResults(res.results)
      setTotal(res.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = useCallback((value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 300)
  }, [doSearch])

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleSelect = useCallback((channelId: string) => {
    onSelectChannel(channelId)
    onClose()
  }, [onSelectChannel, onClose])

  // Highlight matching text in result
  const highlightMatch = (content: string, q: string): React.ReactNode => {
    if (!q.trim() || q.trim().length < 2) return content
    const lower = content.toLowerCase()
    const search = q.toLowerCase()
    const idx = lower.indexOf(search)
    if (idx === -1) return content
    const before = content.slice(0, idx)
    const match = content.slice(idx, idx + q.length)
    const after = content.slice(idx + q.length)
    return (
      <>
        {before}
        <mark style={{
          background: 'var(--accent-primary, #3B82F6)',
          color: 'var(--text-primary)',
          borderRadius: 2,
          padding: '0 2px',
        }}>
          {match}
        </mark>
        {after}
      </>
    )
  }

  const formatDate = (dateVal: Date | string): string => {
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const truncateSnippet = (text: string, maxLen = 120): string => {
    if (text.length <= maxLen) return text
    const start = Math.max(0, text.indexOf(query.trim()) - 30)
    const snippet = text.slice(start, start + maxLen)
    return start > 0 ? '...' + snippet : snippet
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 600,
          maxHeight: '70vh',
          background: 'var(--bg-primary, #1A1A2E)',
          border: '1px solid var(--border-primary, rgba(255,255,255,0.1))',
          borderRadius: 'var(--radius-lg, 12px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Search input */}
        <div
          style={{
            padding: 'var(--space-4, 16px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18, color: 'var(--text-tertiary)' }}>&#x1f50d;</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search messages..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 16,
              padding: '8px 0',
            }}
          />
          {query && (
            <kbd
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                background: 'var(--bg-elevated, rgba(255,255,255,0.05))',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4,
                padding: '2px 6px',
              }}
            >
              ESC
            </kbd>
          )}
        </div>

        {/* Results */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            minHeight: 200,
            maxHeight: 'calc(70vh - 80px)',
          }}
        >
          {loading && (
            <div style={{ padding: 'var(--space-6, 24px)', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Searching...
            </div>
          )}
          {!loading && error && (
            <div style={{ padding: 'var(--space-4, 16px)', textAlign: 'center', color: 'var(--error)' }}>
              {error}
            </div>
          )}
          {!loading && !error && query.trim().length > 0 && results.length === 0 && (
            <div style={{ padding: 'var(--space-6, 24px)', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No results found
            </div>
          )}
          {!loading && !error && results.length > 0 && (
            <div style={{ padding: 'var(--space-2, 8px)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', padding: '4px 12px', marginBottom: 4 }}>
                {total} result{total !== 1 ? 's' : ''}
              </div>
              {results.map((r) => (
                <button
                  key={r.messageId}
                  onClick={() => handleSelect(r.channelId)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    padding: 'var(--space-3, 12px)',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        background: 'var(--bg-elevated, rgba(255,255,255,0.08))',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 4,
                        padding: '1px 6px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      #{r.channelName}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                      {r.senderName}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                      {formatDate(r.createdAt)}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {highlightMatch(truncateSnippet(r.content, 130), query)}
                  </div>
                </button>
              ))}
            </div>
          )}
          {!loading && !error && query.trim().length === 0 && (
            <div style={{ padding: 'var(--space-6, 24px)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
              Type to search messages...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
