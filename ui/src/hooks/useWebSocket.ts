import { useRef, useEffect, useCallback, useState } from 'react'
import type { Message, Channel } from '../types'
import { mapApiMessage } from '../api/mappers'
import type { ApiMessage } from '../api/types'
import { getToken } from '../api/client'

const API_BASE = import.meta.env.VITE_API_BASE || ''

function getWsUrl(): string {
  const base = API_BASE
    ? API_BASE.replace(/^http/, 'ws').replace(/^https/, 'wss') + '/ws'
    : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`
  const token = getToken()
  return token ? `${base}?token=${encodeURIComponent(token)}` : base
}
const POLL_INTERVAL_MS = 3000

export type WSConnectionState = 'disconnected' | 'connecting' | 'connected'

interface WSMessage {
  type: string
  channelId?: string
  payload?: Record<string, unknown> & { message?: ApiMessage }
  timestamp?: string
  userId?: string
  userName?: string
  actorId?: string
  displayName?: string
  status?: string
  message?: ApiMessage
}

interface UseWebSocketReturn {
  connectionState: WSConnectionState
  currentUserId: string | null
  connect: () => void
  disconnect: () => void
  subscribe: (channelId: string) => void
  unsubscribe: (channelId: string) => void
  sendTyping: (channelId: string) => void
  onMessage: (handler: (msg: Message) => void) => void
  onTyping: (handler: (channelId: string, userId: string, displayName?: string) => void) => void
  onPresence: (handler: (channelId: string, userId: string, status: string, displayName?: string) => void) => void
}

export function useWebSocket(): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [connectionState, setConnectionState] = useState<WSConnectionState>('disconnected')
  // Populated from the server's 'connected' handshake message (actorId field)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const messageHandlersRef = useRef<Set<(msg: Message) => void>>(new Set())
  const typingHandlersRef = useRef<Set<(channelId: string, userId: string, displayName?: string) => void>>(new Set())
  const presenceHandlersRef = useRef<Set<(channelId: string, userId: string, status: string, displayName?: string) => void>>(new Set())
  const currentChannelRef = useRef<string | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return

    setConnectionState('connecting')

    try {
      const ws = new WebSocket(getWsUrl())
      wsRef.current = ws

      ws.onopen = () => {
        setConnectionState('connected')
        // Re-subscribe to the previous channel if any
        if (currentChannelRef.current) {
          ws.send(JSON.stringify({ type: 'subscribe', channelId: currentChannelRef.current }))
        }
      }

      ws.onclose = () => {
        setConnectionState('disconnected')
        // Auto reconnect after 3s
        reconnectTimerRef.current = setTimeout(() => connect(), 3000)
      }

      ws.onerror = () => {
        setConnectionState('disconnected')
      }

      ws.onmessage = (event) => {
        try {
          const data: WSMessage = JSON.parse(event.data)

          switch (data.type) {
            case 'connected': {
              // Server sends actorId on successful handshake — capture it so we
              // can filter our own typing events out of the indicator display.
              if (data.actorId) {
                setCurrentUserId(data.actorId as string)
              }
              break
            }
            case 'message': {
              // Handle both direct message in payload and nested message object
              const apiMsg = data.payload?.message ?? data.message
              if (apiMsg) {
                const mapped = mapApiMessage(apiMsg as ApiMessage, undefined)
                messageHandlersRef.current.forEach((h) => h(mapped))
              }
              break
            }
            case 'typing': {
              const channelId = data.channelId
              const userId = data.userId ?? data.actorId ?? 'unknown'
              const displayName = data.displayName as string | undefined
              if (channelId) {
                typingHandlersRef.current.forEach((h) => h(channelId, userId, displayName))
              }
              break
            }
            case 'presence': {
              const channelId = data.channelId
              const userId = data.userId ?? 'unknown'
              const status = (data.status as string) || 'offline'
              const displayName = data.displayName as string | undefined
              if (channelId) {
                presenceHandlersRef.current.forEach((h) => h(channelId, userId, status, displayName))
              }
              break
            }
            default:
              break
          }
        } catch (err) {
          console.warn('Failed to parse WS message:', err)
        }
      }
    } catch (err) {
      console.error('WebSocket connection failed:', err)
      setConnectionState('disconnected')
    }
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setConnectionState('disconnected')
  }, [])

  const subscribe = useCallback((channelId: string) => {
    currentChannelRef.current = channelId
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe', channelId }))
    } else if (ws?.readyState !== WebSocket.CONNECTING) {
      // Connect first, then subscribe (onopen will handle it)
      connect()
    }
  }, [connect])

  const unsubscribe = useCallback((channelId: string) => {
    currentChannelRef.current = null
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'unsubscribe', channelId }))
    }
  }, [])

  const sendTyping = useCallback((channelId: string) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'typing', channelId }))
    }
  }, [])

  const onMessage = useCallback((handler: (msg: Message) => void) => {
    messageHandlersRef.current.add(handler)
    return () => {
      messageHandlersRef.current.delete(handler)
    }
  }, [])

  const onTyping = useCallback((handler: (channelId: string, userId: string, displayName?: string) => void) => {
    typingHandlersRef.current.add(handler)
    return () => {
      typingHandlersRef.current.delete(handler)
    }
  }, [])

  const onPresence = useCallback((handler: (channelId: string, userId: string, status: string, displayName?: string) => void) => {
    presenceHandlersRef.current.add(handler)
    return () => {
      presenceHandlersRef.current.delete(handler)
    }
  }, [])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return {
    connectionState,
    currentUserId,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    sendTyping,
    onMessage,
    onTyping,
    onPresence,
  }
}
