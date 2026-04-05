import { useState, useCallback } from 'react'
import { Channel, Message } from '../types'
import ChannelSidebar from './ChannelSidebar'
import ChannelHeader from './ChannelHeader'
import MessageBubble from './MessageBubble'
import MessageComposer from './MessageComposer'
import ThreadView from './ThreadView'
import CreateChannelModal from './CreateChannelModal'
import TypingIndicator from './TypingIndicator'
import { useThread } from '../hooks/useMessages'
import { sendMessage as apiSendMessage } from '../api/client'
import { currentActor } from '../api/mappers'
import type { WSConnectionState } from '../hooks/useWebSocket'

interface SlackAppProps {
  channels: Channel[]
  messages: Message[]
  activeChannelId: string | null
  activeChannel: Channel | null
  loadingMessages: boolean
  typingUsers: string[]
  connectionState: WSConnectionState
  onChannelSelect: (channelId: string) => void
  onCreateChannel: (name: string, description: string, type: 'public' | 'private') => Promise<Channel>
  onSendMessage: (content: string) => Promise<Message | undefined>
  onReaction: (messageId: string, emoji: string) => void
  onUserTyping?: () => void
  setMessages: React.Dispatch<React.SetStateAction<Record<string, Message[]>>>
}

export default function SlackApp({
  channels,
  messages,
  activeChannelId,
  activeChannel,
  loadingMessages,
  typingUsers,
  connectionState,
  onChannelSelect,
  onCreateChannel,
  onSendMessage,
  onReaction,
  onUserTyping,
  setMessages,
}: SlackAppProps) {
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [creatingChannel, setCreatingChannel] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const { openThread, loading: threadLoading, open: openThreadFn, close: closeThreadFn, setOpenThread } = useThread()

  // Group messages: collapse consecutive messages from same sender
  const groupedMessages = messages.map((msg, i) => {
    const prev = messages[i - 1]
    const isGrouped = prev && prev.sender.id === msg.sender.id
    return { msg, grouped: !!isGrouped }
  })

  // Thread handling
  const handleThreadClick = useCallback(async (messageId: string) => {
    if (!activeChannel) return
    try {
      openThreadFn(messageId, activeChannelId!)
    } catch (err) {
      console.error('Failed to fetch thread:', err)
    }
  }, [activeChannel, activeChannelId, openThreadFn])

  const handleThreadMessage = useCallback(async (content: string) => {
    if (!openThread || !activeChannel) return
    try {
      const newReply = await apiSendMessage(activeChannel.id, content, openThread.parentId)
      // Update parent message reply count and append to messages list
      setMessages((prev) => {
        const channelMsgs = prev[openThread.channelId]
        if (channelMsgs) {
          const updated = channelMsgs.map((m) =>
            m.id === openThread.parentId
              ? { ...m, threadCount: (m.threadCount || 0) + 1 }
              : m
          )
          return {
            ...prev,
            [openThread.channelId]: [...updated, newReply],
          }
        }
        return prev
      })
      // Update local thread state
      setOpenThread((prev) => prev ? { ...prev, replies: [...prev.replies, newReply] } : null)
    } catch (err) {
      console.error('Failed to send thread message:', err)
    }
  }, [openThread, activeChannel, setMessages, setOpenThread])

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

  // Map thread messages for display
  const threadReplies = openThread && activeChannel
    ? [...openThread.replies]
    : []
  const threadParent = openThread && activeChannel
    ? messages.find((m) => m.id === openThread.parentId)
    : null

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
                      onReplyClick={() => handleThreadClick(m.id)}
                    />
                  ))}
                </>
              )}
            </div>

            {/* Typing indicator */}
            <TypingIndicator users={typingUsers} visible={typingUsers.length > 0} />

            {/* Connection state indicator */}
            {connectionState === 'disconnected' && (
              <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--warning)', padding: '2px 0' }}>
                Disconnected — attempting to reconnect...
              </div>
            )}

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
                onTyping={onUserTyping}
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
      {openThread && activeChannel && threadParent && (
        <ThreadView
          parentMessage={threadParent}
          replies={threadReplies}
          channel={activeChannel}
          currentUserId={currentActor.id}
          onClose={closeThreadFn}
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
