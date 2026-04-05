interface ChannelNameInputProps {
  value: string
  onChange: (value: string) => void
}

export default function ChannelNameInput({ value, onChange }: ChannelNameInputProps) {
  const slug = value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const valid = slug.length >= 2 && slug.length <= 80 && /^[a-z0-9-]+$/.test(slug)

  return (
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
      {value && (
        <div style={{ fontSize: 12, color: valid ? 'var(--success)' : 'var(--error)', marginTop: 4 }}>
          {valid ? `#${slug}` : 'Must be 2-80 chars, lowercase letters/numbers/hyphens only'}
        </div>
      )}
    </div>
  )
}

export function getSlug(name: string): { slug: string; valid: boolean } {
  const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const valid = slug.length >= 2 && slug.length <= 80 && /^[a-z0-9-]+$/.test(slug)
  return { slug, valid }
}
