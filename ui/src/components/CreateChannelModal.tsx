import { useState } from 'react'

interface CreateChannelModalProps {
  onClose: () => void
  onSubmit: (name: string, description: string, type: 'public' | 'private') => Promise<void>
  loading?: boolean
}

export default function CreateChannelModal({ onClose, onSubmit, loading }: CreateChannelModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'public' | 'private'>('public')

  const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const nameValid = slug.length >= 2 && slug.length <= 80 && /^[a-z0-9-]+$/.test(slug)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameValid || loading) return
    onSubmit(slug, description, type)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          width: 480,
          maxWidth: '90vw',
          maxHeight: '85vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--space-6)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Create a Channel</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 20,
              padding: 4,
            }}
          >
            {'\u2715'}
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Name */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                }}
              >
                Channel Name
              </label>
              <div
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 var(--space-3)',
                }}
              >
                <span style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>#</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. project-alpha"
                  autoFocus
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    padding: 'var(--space-3)',
                    outline: 'none',
                    fontFamily: 'var(--font-sans)',
                  }}
                  onFocus={(e) => (e.currentTarget.parentElement!.style.borderColor = 'var(--accent-primary)')}
                  onBlur={(e) => (e.currentTarget.parentElement!.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>
              {name && (
                <div style={{ fontSize: 12, color: nameValid ? 'var(--success)' : 'var(--error)', marginTop: 4 }}>
                  {nameValid ? `#${slug}` : 'Must be 2-80 chars, lowercase letters/numbers/hyphens only'}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                }}
              >
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this channel about?"
                rows={2}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-3)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  lineHeight: 1.6,
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'var(--font-sans)',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent-primary)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            {/* Visibility */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  marginBottom: 8,
                }}
              >
                Visibility
              </label>
              {[
                {
                  value: 'public' as const,
                  label: 'Public',
                  desc: 'Anyone in the workspace can join and read',
                },
                {
                  value: 'private' as const,
                  label: 'Private',
                  desc: 'Invite only',
                },
              ].map((option) => (
                <label
                  key={option.value}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: 'var(--space-3)',
                    marginBottom: 4,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    background: type === option.value ? 'rgba(99,102,241,0.08)' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={option.value}
                    checked={type === option.value}
                    onChange={() => setType(option.value)}
                    style={{ marginTop: 3, accentColor: 'var(--accent-primary)' }}
                  />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {option.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{option.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: 'var(--space-6)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 'var(--space-3)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: 14,
                fontFamily: 'var(--font-sans)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!nameValid || loading}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                background: nameValid && !loading ? 'var(--accent-primary)' : 'rgba(99,102,241,0.3)',
                color: nameValid && !loading ? 'white' : 'rgba(255,255,255,0.5)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: nameValid && !loading ? 'pointer' : 'not-allowed',
                fontWeight: 500,
                fontSize: 14,
                fontFamily: 'var(--font-sans)',
              }}
            >
              {loading ? 'Creating...' : 'Create \u{1F680}'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
