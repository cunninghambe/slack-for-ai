import { useState } from 'react'
import ModalFrame from './ModalFrame'
import ChannelNameInput, { getSlug } from './form/ChannelNameInput'
import DescriptionField from './form/DescriptionField'
import VisibilitySelector from './form/VisibilitySelector'

interface CreateChannelModalProps {
  onClose: () => void
  onSubmit: (name: string, description: string, type: 'public' | 'private') => Promise<void>
  loading?: boolean
}

export default function CreateChannelModal({ onClose, onSubmit, loading }: CreateChannelModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'public' | 'private'>('public')

  const { slug, valid: nameValid } = getSlug(name)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nameValid || loading) return
    onSubmit(slug, description, type)
  }

  return (
    <ModalFrame
      onClose={onClose}
      title="Create a Channel"
      footer={
        <>
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
            {loading ? 'Creating...' : 'Create'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <ChannelNameInput value={name} onChange={setName} />
          <DescriptionField value={description} onChange={setDescription} />
          <VisibilitySelector value={type} onChange={setType} />
        </div>
      </form>
    </ModalFrame>
  )
}
