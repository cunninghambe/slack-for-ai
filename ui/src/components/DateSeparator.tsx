interface DateSeparatorProps {
  label: string
}

export default function DateSeparator({ label }: DateSeparatorProps) {
  return (
    <div
      role="separator"
      aria-label={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-4) var(--space-6) var(--space-2)',
      }}
    >
      <span
        style={{
          flex: 1,
          height: 1,
          background: 'rgba(255,255,255,0.08)',
        }}
      />
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span
        style={{
          flex: 1,
          height: 1,
          background: 'rgba(255,255,255,0.08)',
        }}
      />
    </div>
  )
}
