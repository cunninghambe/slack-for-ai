import { useState, useEffect, useCallback } from 'react'
import SlackApp from './components/SlackApp'
import { getChannels as apiGetChannels, createChannel as apiCreateChannel, getMessages as apiGetMessages, sendMessage as apiSendMessage, addReaction as apiAddReaction } from './api/client'
import type { Channel, Message } from './types'

function App() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [loadingChannels, setLoadingChannels] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch channels on mount
  useEffect(() => {
    apiGetChannels()
      .then((ch) => {
        setChannels(ch)
        if (ch.length > 0) {
          setActiveChannelId(ch[0].id)
        }
        setLoadingChannels(false)
      })
      .catch((err) => {
        console.error('Failed to fetch channels:', err)
        setError('Failed to load channels: ' + err.message)
        setLoadingChannels(false)
      })
  }, [])

  // Fetch messages when active channel changes
  useEffect(() => {
    if (!activeChannelId) return
    setLoadingMessages(true)
    apiGetMessages(activeChannelId)
      .then((msgs) => {
        setMessages((prev) => ({ ...prev, [activeChannelId!]: msgs }))
        setLoadingMessages(false)
      })
      .catch((err) => {
        console.error('Failed to fetch messages:', err)
        setLoadingMessages(false)
      })
  }, [activeChannelId])

  const handleChannelSelect = useCallback((channelId: string) => {
    setActiveChannelId(channelId)
    // Clear unread count
    setChannels((prev) =>
      prev.map((c) =>
        c.id === channelId ? { ...c, unreadCount: 0 } : c
      )
    )
  }, [])

  const handleCreateChannel = useCallback(async (name: string, description: string, type: 'public' | 'private') => {
    const newChannel = await apiCreateChannel(name, description, type)
    setChannels((prev) => [...prev, newChannel])
    setActiveChannelId(newChannel.id)
    return newChannel
  }, [])

  const handleSendMessage = useCallback(async (content: string) => {
    if (!activeChannelId) return
    const msg = await apiSendMessage(activeChannelId, content)
    setMessages((prev) => ({
      ...prev,
      [activeChannelId!]: [...(prev[activeChannelId!] || []), msg],
    }))
    return msg
  }, [activeChannelId])

  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!activeChannelId) return
    try {
      await apiAddReaction(messageId, emoji)
      // Optimistic UI update
      setMessages((prev) => {
        const msgs = prev[activeChannelId!] || []
        const updated = msgs.map((m) => {
          if (m.id !== messageId) return m
          const existing = m.reactions.find((r) => r.emoji === emoji)
          if (existing) {
            return {
              ...m,
              reactions: m.reactions.map((r) =>
                r.emoji === emoji ? { ...r, count: r.count + 1, users: [...r.users, 'current-user'] } : r
              ),
            }
          }
          return {
            ...m,
            reactions: [...m.reactions, { emoji, count: 1, users: ['current-user']}],
          }
        })
        return { ...prev, [activeChannelId!]: updated }
      })
    } catch (err) {
      console.error('Failed to add reaction:', err)
    }
  }, [activeChannelId])

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
      </div>
    )
  }

  return (
    <SlackApp
      channels={channels}
      messages={messages}
      activeChannelId={activeChannelId}
      loadingMessages={loadingMessages}
      onChannelSelect={handleChannelSelect}
      onCreateChannel={handleCreateChannel}
      onSendMessage={handleSendMessage}
      onReaction={handleReaction}
    />
  )
}

export default App