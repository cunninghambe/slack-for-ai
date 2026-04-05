interface ModalFrameProps {
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  width?: number
}

export default function ModalFrame({ onClose, title, children, footer, width = 480 }: ModalFrameProps) {
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
          width,
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
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>{title}</h2>
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
        <div>{children}</div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: 'var(--space-6)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 'var(--space-3)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
