interface DescriptionFieldProps {
  value: string
  onChange: (value: string) => void
}

export default function DescriptionField({ value, onChange }: DescriptionFieldProps) {
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
        Description (optional)
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
  )
}
