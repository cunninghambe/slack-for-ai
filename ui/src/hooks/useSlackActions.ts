import { useState, useCallback } from 'react'
import type { Channel } from '../types'
import { useThread } from './useMessages'
import { sendMessage as apiSendMessage } from '../api/client'

export function useSlackActions(
  activeChannelId: string | null,
  activeChannel: Channel | null,
  onChannelSelect: (id: string) => void,
  onSendMessage: (content: string) => Promise<Channel>,
  onReaction: (messageId: string, emoji: string) => void
) {
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [creatingChannel, setCreatingChannel] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const thread = useThread()

  const handleThreadClick = useCallback(
    async (messageId: string) => {
      if (!activeChannel) return
      try {
        thread.open(messageId, activeChannelId!)
      } catch (err) {
        console.error('Failed to fetch thread:', err)
      }
    },
    [activeChannel, activeChannelId, thread.open]
  )

  const handleThreadMessage = useCallback(
    async (content: string, setMessages: React.Dispatch<React.SetStateAction<Record<string, Channel[]>>>) => {
      if (!thread.openThread || !activeChannel) return
      try {
        const newReply = await apiSendMessage(activeChannel.id, content, thread.openThread.parentId)
        setMessages((prev) => {
          const channelMsgs = prev[thread.openThread!.channelId]
          if (channelMsgs) {
            const updated = channelMsgs.map((m) =>
              m.id === thread.openThread!.parentId
                ? { ...m, threadCount: (m.threadCount || 0) + 1 }
                : m
            )
            return {
              ...prev,
              [thread.openThread!.channelId]: [...updated, newReply],
            }
          }
          return prev
        })
        thread.setOpenThread((prev) =>
          prev ? { ...prev, replies: [...prev.replies, newReply] } : null
        )
      } catch (err) {
        console.error('Failed to send thread message:', err)
      }
    },
    [thread, activeChannel]
  )

  const handleSend = useCallback(
    async (content: string) => {
      if (!activeChannelId) return
      setSendingMessage(true)
      try {
        await onSendMessage(content)
      } catch (err) {
        console.error('Failed to send message:', err)
      } finally {
        setSendingMessage(false)
      }
    },
    [activeChannelId, onSendMessage]
  )

  const handleCreateChannel = useCallback(
    async (name: string, description: string, type: 'public' | 'private') => {
      setCreatingChannel(true)
      try {
        await onChannelSelect(name) // delegate to parent createChannel
        setShowCreateChannel(false)
      } catch (err) {
        console.error('Failed to create channel:', err)
      } finally {
        setCreatingChannel(false)
      }
    },
    [onChannelSelect]
  )

  return {
    showCreateChannel,
    setShowCreateChannel,
    creatingChannel,
    sendingMessage,
    thread,
    handleThreadClick,
    handleThreadMessage,
    handleSend,
    handleCreateChannel,
  }
}
