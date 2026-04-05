interface VisibilitySelectorProps {
  value: 'public' | 'private'
  onChange: (value: 'public' | 'private') => void
}

export default function VisibilitySelector({ value, onChange }: VisibilitySelectorProps) {
  const options = [
    { value: 'public' as const, label: 'Public', desc: 'Anyone in the workspace can join and read' },
    { value: 'private' as const, label: 'Private', desc: 'Invite only' },
  ]

  return (
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
      {options.map((option) => (
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
            background: value === option.value ? 'rgba(99,102,241,0.08)' : 'transparent',
          }}
        >
          <input
            type="radio"
            name="visibility"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            style={{ marginTop: 3, accentColor: 'var(--accent-primary)' }}
          />
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{option.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{option.desc}</div>
          </div>
        </label>
      ))}
    </div>
  )
}