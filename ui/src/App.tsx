import { useRef } from 'react'
import SlackApp from './components/SlackApp'
import { useSlackApp } from './hooks/useSlackApp'

function App() {
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

  const handleSendMessage = useRef(async (content: string) => {
    return sendMessage(content)
  })

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
      onSendMessage={handleSendMessage.current}
      onReaction={handleReaction}
      onUserTyping={handleUserTyping}
      setMessages={setMessages}
    />
  )
}

export default App
