interface MessageToolbarProps {
  onReply: () => void
  onReact: () => void
  onPin?: () => void
}

function ToolbarButton({
  icon,
  label,
  onClick,
}: {
  icon: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        background: 'transparent',
        border: 'none',
        padding: '4px 6px',
        fontSize: 14,
        cursor: 'pointer',
        borderRadius: 'var(--radius-sm)',
        transition: 'background 0.15s',
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      {icon}
    </button>
  )
}

export default function MessageToolbar({
  onReply,
  onReact,
  onPin,
}: MessageToolbarProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: -16,
        right: 16,
        background: 'var(--bg-elevated)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        gap: 2,
        padding: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        zIndex: 10,
      }}
    >
      <ToolbarButton icon={'\uD83D\uDCAC'} label="Reply" onClick={onReply} />
      <ToolbarButton icon={'\uD83D\uDE0A'} label="React" onClick={onReact} />
      {onPin && (
        <>
          <div
            style={{
              width: 1,
              background: 'rgba(255,255,255,0.08)',
              margin: '2px 0',
            }}
          />
          <ToolbarButton icon={'\uD83D\uDCCC'} label="Pin" onClick={onPin} />
        </>
      )}
    </div>
  )
}
