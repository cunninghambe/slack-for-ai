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
import type { Message } from '../types'
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

  const { connectionState, subscribe, sendTyping, onMessage, onTyping } = useWebSocket()

  /* ── Typing indicators ────────────────────────────────────────────── */
  const [typingUsers, setTypingUsers] = useState<Record<string, Set<string>>>({})
  const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    return onTyping((channelId: string, userId: string) => {
      if (userId === 'current-user') return

      setTypingUsers((prev) => {
        const channelTyping = prev[channelId] || new Set()
        channelTyping.add(userId)
        return { ...prev, [channelId]: new Set(channelTyping) }
      })

      const key = `${channelId}:${userId}`
      if (typingTimersRef.current[key]) clearTimeout(typingTimersRef.current[key])

      typingTimersRef.current[key] = setTimeout(() => {
        setTypingUsers((prev) => {
          const ct = prev[channelId]
          if (!ct) return prev
          const next = new Set(ct)
          next.delete(userId)
          if (next.size === 0) {
            const updated = { ...prev }
            delete updated[channelId]
            return updated
          }
          return { ...prev, [channelId]: next }
        })
      }, 3000)
    })
  }, [onTyping])

  const currentTyping = activeChannelId
    ? Array.from(typingUsers[activeChannelId] || new Set()).slice(0, 3)
    : []

  /* ── Real-time message delivery (polling fallback) ────────────────── */
  // The WebSocket server requires a token query param that the board UI
  // doesn't have. We poll the messages endpoint as a reliable fallback.
  const knownMessageIdsRef = useRef(new Set<string>())

  useEffect(() => {
    if (!activeChannelId) return

    // Build known message set from currently loaded messages
    knownMessageIdsRef.current = new Set(activeMessages.map((m) => m.id))

    const pollForNewMessages = async () => {
      try {
        const msgs = await apiGetMessages(activeChannelId)

        for (const msg of msgs) {
          if (!knownMessageIdsRef.current.has(msg.id)) {
            setMessages((prev) => {
              const channelMsgs = prev[activeChannelId] || []
              if (channelMsgs.some((m) => m.id === msg.id)) return prev
              // Keep sorted by sequence number
              const next = [...channelMsgs, msg].sort(
                (a, b) => ((a as any).sequenceNum ?? 0) - ((b as any).sequenceNum ?? 0)
              )
              return { ...prev, [activeChannelId]: next }
            })
            knownMessageIdsRef.current.add(msg.id)
          }
        }
      } catch {
        // Silently ignore poll errors — will retry on next interval
      }
    }

    pollForNewMessages()
    const interval = setInterval(pollForNewMessages, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
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
    connectionState,
    handleChannelSelect,
    createChannel,
    sendMessage: doSendMessage,
    handleReaction,
    handleUserTyping,
    setMessages,
  }
}
