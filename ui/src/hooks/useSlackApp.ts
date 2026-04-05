/**
 * useSlackApp — orchestrates all Slack app state
 *
 * Composes useChannels, useMessages, useWebSocket and extracts
 * the remaining inline state / event wiring from App.tsx into
 * this single hook.
 *
 * Real-time messages: uses polling fallback (3s interval) since the
 * board UI cannot authenticate with the token-required WebSocket server.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { getMessages as apiGetMessages } from '../api/client'
import { useChannels } from './useChannels'
import { useMessages } from './useMessages'
import { useWebSocket } from './useWebSocket'

const POLL_INTERVAL_MS = 3000

export function useSlackApp() {
  const {
    channels,
    activeChannelId,
    activeChannel,
    loading: loadingChannels,
    error,
    selectChannel,
    createChannel,
    setChannels,
  } = useChannels()

  const {
    activeMessages,
    loading: loadingMessages,
    sendMessage: doSendMessage,
    addReaction: doAddReaction,
    setMessages,
  } = useMessages(activeChannelId)

  const { connectionState, currentUserId, subscribe, sendTyping, onMessage, onTyping, onPresence } = useWebSocket()

  /* ── Typing indicators with display names ──────────────────────────── */
  // Stores { userId -> displayName } for the current channel
  const [typingUsers, setTypingUsers] = useState<Record<string, { displayName: string }>>({})
  const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    return onTyping((channelId: string, userId: string, displayName?: string) => {
      // Filter out the current user's own typing events (server broadcasts to all
      // subscribers including the sender's own connection when multiple tabs are open,
      // and we also want to avoid showing self-typing in the indicator).
      if (currentUserId && userId === currentUserId) return
      const name = displayName || userId.slice(0, 8)

      setTypingUsers((prev) => ({
        ...prev,
        [userId]: { displayName: name },
      }))

      const key = `${channelId}:${userId}`
      if (typingTimersRef.current[key]) clearTimeout(typingTimersRef.current[key])

      typingTimersRef.current[key] = setTimeout(() => {
        setTypingUsers((prev) => {
          const updated = { ...prev }
          delete updated[userId]
          return updated
        })
      }, 3000)
    })
  }, [onTyping, currentUserId])

  /* ── Presence map for online/offline status ────────────────────────── */
  const [userNames, setUserNames] = useState<Record<string, string>>({})
  const [presenceMap, setPresenceMap] = useState<Record<string, string>>({})

  useEffect(() => {
    return onPresence((channelId: string, userId: string, status: string, displayName?: string) => {
      if (displayName) {
        setUserNames((prev) => ({ ...prev, [userId]: displayName }))
      }
      setPresenceMap((prev) => ({ ...prev, [userId]: status }))
    })
  }, [onPresence])

  const currentTyping = activeChannelId
    ? Object.values(typingUsers).map((u) => u.displayName)
    : []

  /* ── Real-time message delivery (polling fallback) ────────────────── */
  useEffect(() => {
    if (!activeChannelId) return

    const pollForNewMessages = async () => {
      try {
        const polled = await apiGetMessages(activeChannelId)
        setMessages((prev) => {
          const existing = prev[activeChannelId] || []
          const existingIds = new Set(existing.map((m) => m.id))
          const newMsgs = polled.filter((m) => !existingIds.has(m.id))
          if (newMsgs.length === 0) return prev
          const merged = [...existing, ...newMsgs].sort(
            (a, b) => ((a as any).sequenceNum ?? 0) - ((b as any).sequenceNum ?? 0)
          )
          return { ...prev, [activeChannelId]: merged }
        })
      } catch {
        // Silently ignore poll errors — will retry on next interval
      }
    }

    // Delay first poll to let useMessages finish initial fetch
    const initialDelay = setTimeout(pollForNewMessages, 1000)
    const interval = setInterval(pollForNewMessages, POLL_INTERVAL_MS)
    return () => {
      clearTimeout(initialDelay)
      clearInterval(interval)
    }
  }, [activeChannelId, setMessages])

  /* ── WebSocket subscription for typing ────────────────────────────── */
  useEffect(() => {
    if (connectionState !== 'connected' || !activeChannelId) return
    subscribe(activeChannelId)
  }, [activeChannelId, subscribe, connectionState])

  /* ── Derived handlers ─────────────────────────────────────────────── */
  const handleChannelSelect = useCallback(
    (channelId: string) => {
      selectChannel(channelId)
      setTypingUsers((prev) => {
        const updated = { ...prev }
        delete updated[channelId]
        return updated
      })
    },
    [selectChannel]
  )

  const handleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        await doAddReaction(messageId, emoji)
      } catch (err) {
        console.error('Failed to add reaction:', err)
      }
    },
    [doAddReaction]
  )

  /* ── Outbound typing debounce ─────────────────────────────────────── */
  const typingSentRef = useRef(false)
  const handleUserTyping = useCallback(() => {
    if (!activeChannelId || typingSentRef.current) return
    typingSentRef.current = true
    sendTyping(activeChannelId)
    setTimeout(() => {
      typingSentRef.current = false
    }, 3000)
  }, [activeChannelId, sendTyping])

  return {
    channels,
    activeChannelId,
    activeChannel,
    loadingChannels,
    loadingMessages,
    error,
    activeMessages,
    typingUsers: currentTyping,
    userNames,
    presenceMap,
    connectionState,
    handleChannelSelect,
    createChannel,
    sendMessage: doSendMessage,
    handleReaction,
    handleUserTyping,
    setMessages,
  }
}
