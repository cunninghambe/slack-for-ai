import { useState, useCallback, useEffect } from 'react'
import { Channel, Message, User } from '../types'
import ChannelSidebar from './ChannelSidebar'
import ChannelHeader from './ChannelHeader'
import MessageBubble from './MessageBubble'
import MessageComposer from './MessageComposer'
import ThreadView from './ThreadView'
import CreateChannelModal from './CreateChannelModal'
import { getMessages as apiGetMessages, sendMessage as apiSendMessage, getThread as apiGetThread, addReaction as apiAddReaction } from '../api/client'
import { mapApiMessage } from '../api/mappers'
import { currentActor } from '../api/mappers'
import type { ApiMessage } from '../api/types'

interface SlackAppProps {
  channels: Channel[]
  messages: Record<string, Message[]>
  activeChannelId: string | null
  loadingMessages: boolean
  onChannelSelect: (channelId: string) => void
  onCreateChannel: (name: string, description: string, type: 'public' | 'private') => Promise<Channel>
  onSendMessage: (content: string) => Promise<Message | undefined>
  onReaction: (messageId: string, emoji: string) => void
}

export default function SlackApp({
  channels,
  messages: initialMessages,
  activeChannelId,
  loadingMessages,
  onChannelSelect,
  onCreateChannel,
  onSendMessage,
  onReaction,
}: SlackAppProps) {
  // Local state
  const [messages, setMessages] = useState<Record<string, Message[]>>(initialMessages)
  const [openThread, setOpenThread] = useState<{ parentId: string; channel: Channel; replies: Message[] } | null>(null)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [creatingChannel, setCreatingChannel] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [threadMessages, setThreadMessages] = useState<Record<string, Message[]>>({})

  // Keep local messages in sync with prop changes
  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  const activeChannel = channels.find((c) => c.id === activeChannelId) ?? null
  const activeMessages = activeChannelId ? messages[activeChannelId] ?? [] : []

  // Group messages: collapse consecutive messages from same sender
  const groupedMessages = activeMessages.map((msg, i) => {
    const prev = activeMessages[i - 1]
    const isGrouped = prev && prev.sender.id === msg.sender.id
    return { msg, grouped: !!isGrouped }
  })

  // Thread handling
  const handleThreadClick = useCallback(async (messageId: string) => {
    if (!activeChannel) return
    try {
      const channel = channels.find((c) => c.id === activeChannelId)!
      const { parent, replies } = await apiGetThread(messageId, channel.id)
      setThreadMessages((prev) => ({ ...prev, [messageId]: replies }))
      setOpenThread({ parentId: messageId, channel, replies })
    } catch (err) {
      console.error('Failed to fetch thread:', err)
      // Open thread with local data
      const channel = channels.find((c) => c.id === activeChannelId)!
      const parentMsg = activeMessages.find((m) => m.id === messageId)
      if (parentMsg) {
        setOpenThread({ parentId: messageId, channel, replies: [] })
      }
    }
  }, [activeChannel, activeChannelId, activeMessages, channels])

  const handleThreadMessage = useCallback(async (content: string) => {
    if (!openThread) return
    try {
      const newReply = await apiSendMessage(openThread.channel.id, content, openThread.parentId)
      // Update parent message reply count
      setMessages((prev) => {
        const channelMsgs = prev[openThread.channel.id]
        if (channelMsgs) {
          const updated = channelMsgs.map((m) =>
            m.id === openThread!.parentId
              ? { ...m, threadCount: (m.threadCount || 0) + 1 }
              : m
          )
          return {
            ...prev,
            [openThread!.channel.id]: [...updated, newReply],
          }
        }
        return prev
      })
      // Append to thread
      setThreadMessages((prev) => ({
        ...prev,
        [openThread.parentId]: [...(prev[openThread.parentId] || []), newReply],
      }))
      setOpenThread((prev) => prev ? { ...prev, replies: [...prev.replies, newReply] } : null)
    } catch (err) {
      console.error('Failed to send thread message:', err)
    }
  }, [openThread])

  // Send message
  const handleSend = useCallback(async (content: string) => {
    if (!activeChannelId) return
    setSendingMessage(true)
    try {
      await onSendMessage(content)
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSendingMessage(false)
    }
  }, [activeChannelId, onSendMessage])

  // Create channel
  const handleCreateChannel = useCallback(async (name: string, description: string, type: 'public' | 'private') => {
    setCreatingChannel(true)
    try {
      await onCreateChannel(name, description, type)
      setShowCreateChannel(false)
    } catch (err) {
      console.error('Failed to create channel:', err)
    } finally {
      setCreatingChannel(false)
    }
  }, [onCreateChannel])

  // Reaction
  const handleReactionClick = useCallback(async (messageId: string, emoji: string) => {
    onReaction(messageId, emoji)
  }, [onReaction])

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      {/* Sidebar */}
      <ChannelSidebar
        channels={channels}
        users={[currentActor]}
        activeChannelId={activeChannelId}
        onChannelSelect={onChannelSelect}
        onCreateChannel={() => setShowCreateChannel(true)}
      />

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {activeChannel ? (
          <>
            <ChannelHeader channel={activeChannel} users={[currentActor]} />

            {/* Message list */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 'var(--space-4) 0',
              }}
            >
              {loadingMessages ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                  Loading messages...
                </div>
              ) : groupedMessages.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>
                    {'\u{1F4AC}'}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
                    Welcome to #{activeChannel.name}!
                  </div>
                  <div style={{ fontSize: 14 }}>
                    {activeChannel.description || 'This is the start of the channel.'}
                  </div>
                </div>
              ) : (
                <>
                  {groupedMessages.map(({ msg: m, grouped: g }) => (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      groupedWithPrevious={g}
                      onThreadClick={() => handleThreadClick(m.id)}
                      onReaction={handleReactionClick}
                    />
                  ))}
                </>
              )}
            </div>

            {/* Message input */}
            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                padding: 'var(--space-4) var(--space-4)',
              }}
            >
              <MessageComposer
                channelName={activeChannel.name}
                onSend={handleSend}
                disabled={sendingMessage}
              />
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            Select a channel or create one to get started
          </div>
        )}
      </div>

      {/* Thread panel */}
      {openThread && (
        <ThreadView
          parentMessage={
            activeMessages.find((m) => m.id === openThread.parentId)!
          }
          replies={openThread.replies || []}
          channel={openThread.channel}
          currentUserId={currentActor.id}
          onClose={() => setOpenThread(null)}
          onSendMessage={handleThreadMessage}
        />
      )}

      {/* Create channel modal */}
      {showCreateChannel && (
        <CreateChannelModal
          onClose={() => setShowCreateChannel(false)}
          onSubmit={handleCreateChannel}
          loading={creatingChannel}
        />
      )}
    </div>
  )
}