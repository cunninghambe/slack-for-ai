import { useState, useEffect, useCallback, useRef } from 'react'
import type { Message } from '../types'
import { getMessages as apiGetMessages, sendMessage as apiSendMessage, addReaction as apiAddReaction, getThread as apiGetThread } from '../api/client'

export function useMessages(activeChannelId: string | null) {
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [loading, setLoading] = useState(false)
  const currentUserId = useRef('current-user')

  useEffect(() => {
    if (!activeChannelId) return
    setLoading(true)
    apiGetMessages(activeChannelId)
      .then((msgs) => setMessages((prev) => ({ ...prev, [activeChannelId]: msgs })))
      .catch((err) => console.error('Failed to fetch messages:', err))
      .finally(() => setLoading(false))
  }, [activeChannelId])

  const sendMessage = useCallback(async (content: string) => {
    if (!activeChannelId) return
    const msg = await apiSendMessage(activeChannelId, content)
    setMessages((prev) => ({
      ...prev,
      [activeChannelId]: [...(prev[activeChannelId] || []), msg],
    }))
    return msg
  }, [activeChannelId])

  // Toggle reaction: remove if user already reacted, add if not
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!activeChannelId) return
    const uid = currentUserId.current
    setMessages((prev) => {
      const msgs = prev[activeChannelId] || []
      let userAlreadyReacted = false
      for (const m of msgs) {
        if (m.id === messageId) {
          userAlreadyReacted = m.reactions.some(
            (r) => r.emoji === emoji && r.users.includes(uid)
          )
          break
        }
      }
      const optimisticAction = userAlreadyReacted ? 'remove' : 'add'

      // Optimistic update
      const updated = {
        ...prev,
        [activeChannelId]: msgs.map((m) => {
          if (m.id !== messageId) return m
          const existing = m.reactions.find((r) => r.emoji === emoji)
          if (userAlreadyReacted) {
            // Remove user from reaction
            if (existing) {
              const newCount = Math.max(0, existing.count - 1)
              if (newCount === 0) {
                return { ...m, reactions: m.reactions.filter((r) => r.emoji !== emoji) }
              }
              return { ...m, reactions: m.reactions.map((r) =>
                r.emoji === emoji ? { ...r, count: newCount, users: r.users.filter((u) => u !== uid) } : r
              )}
            }
          } else {
            // Add user to reaction
            if (existing) {
              return { ...m, reactions: m.reactions.map((r) =>
                r.emoji === emoji ? { ...r, count: r.count + 1, users: [...r.users, uid] } : r
              )}
            }
            return { ...m, reactions: [...m.reactions, { emoji, count: 1, users: [uid] }] }
          }
          return m
        }),
      }

      // Fire-and-forget API call
      if (optimisticAction === 'remove') {
        import('../api/client').then(({ removeReaction }) =>
          removeReaction(messageId, emoji).catch(() => console.warn('Failed to remove reaction'))
        )
      } else {
        import('../api/client').then(({ addReaction: apiAdd }) =>
          apiAdd(messageId, emoji).catch(() => console.warn('Failed to add reaction'))
        )
      }

      return updated
    })
  }, [activeChannelId])

  const activeMessages = activeChannelId ? messages[activeChannelId] ?? [] : []

  return { messages, activeMessages, loading, sendMessage, addReaction, setMessages }
}

export function useThread() {
  const [openThread, setOpenThread] = useState<{ parentId: string; channelId: string; replies: Message[] } | null>(null)
  const [loading, setLoading] = useState(false)

  const open = useCallback(async (messageId: string, channelId: string) => {
    setLoading(true)
    try {
      const { parent, replies } = await apiGetThread(messageId, channelId)
      setOpenThread({ parentId: messageId, channelId, replies })
    } catch (err) {
      console.error('Failed to fetch thread:', err)
      setOpenThread(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const close = useCallback(() => setOpenThread(null), [])

  return { openThread, loading, open, close, setOpenThread }
}
