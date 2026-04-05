import { useState, useCallback } from 'react'
import SlackApp from './components/SlackApp'
import { useSlackApp } from './hooks/useSlackApp'
import { getToken, login, clearToken } from './api/client'

function LoginScreen() {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return
    setLoading(true)
    setError('')
    try {
      await login(username.trim())
      window.location.reload()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-primary, #1a1d21)',
      color: 'var(--text-primary, #d1d2d3)',
    }}>
      <form onSubmit={handleSubmit} style={{
        display: 'flex', flexDirection: 'column', gap: 16,
        padding: 40, borderRadius: 12,
        background: 'var(--bg-secondary, #222529)',
        border: '1px solid var(--border, #383a3f)',
        minWidth: 320,
      }}>
        <div style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
          Nexus
        </div>
        <div style={{ fontSize: 14, textAlign: 'center', color: 'var(--text-secondary, #999)', marginBottom: 8 }}>
          Sign in to your workspace
        </div>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          style={{
            padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border, #383a3f)',
            background: 'var(--bg-primary, #1a1d21)', color: 'var(--text-primary, #d1d2d3)',
            fontSize: 15, outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading || !username.trim()}
          style={{
            padding: '10px 14px', borderRadius: 8, border: 'none',
            background: loading ? '#555' : '#4a9eff', color: '#fff',
            fontSize: 15, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        {error && (
          <div style={{ color: '#ff6b6b', fontSize: 13, textAlign: 'center' }}>{error}</div>
        )}
      </form>
    </div>
  )
}

function App() {
  const [loggedIn, setLoggedIn] = useState(() => !!getToken())

  if (!loggedIn) {
    return <LoginScreen />
  }

  return <AuthenticatedApp onLogout={() => { clearToken(); setLoggedIn(false) }} />
}

function AuthenticatedApp({ onLogout }: { onLogout: () => void }) {
  const {
    channels,
    activeChannelId,
    activeChannel,
    loadingChannels,
    loadingMessages,
    error,
    activeMessages,
    typingUsers,
    userNames,
    presenceMap,
    connectionState,
    handleChannelSelect,
    createChannel,
    sendMessage,
    handleReaction,
    handleUserTyping,
    setMessages,
  } = useSlackApp()

  const handleSendMessage = useCallback(async (content: string) => {
    return sendMessage(content)
  }, [sendMessage])

  // If auth fails (401), log out
  const handleError = useCallback(() => {
    if (error?.includes('401')) {
      onLogout()
    }
  }, [error, onLogout])

  if (error?.includes('401')) {
    handleError()
    return null
  }

  if (loadingChannels) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        Loading channels...
      </div>
    )
  }

  if (error && channels.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--error)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{'\u{1F6A7}'}</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Failed to Connect</div>
        <div style={{ fontSize: 14 }}>{error}</div>
        <div style={{ fontSize: 12, marginTop: 8, color: 'var(--text-tertiary)' }}>
          WebSocket status: {connectionState}
        </div>
      </div>
    )
  }

  return (
    <SlackApp
      channels={channels}
      messages={activeMessages}
      activeChannelId={activeChannelId}
      activeChannel={activeChannel}
      loadingMessages={loadingMessages}
      typingUsers={typingUsers}
      userNames={userNames}
      presenceMap={presenceMap}
      connectionState={connectionState}
      onChannelSelect={handleChannelSelect}
      onCreateChannel={createChannel}
      onSendMessage={handleSendMessage}
      onReaction={handleReaction}
      onUserTyping={handleUserTyping}
      setMessages={setMessages}
    />
  )
}

export default App
