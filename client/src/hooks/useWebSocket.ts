import { useEffect, useRef } from 'react'
import { useStore } from 'src/store'
import { io, Socket } from 'socket.io-client'
import { getDeviceId, getPlayerId } from 'src/services'

const getDevice = () => {
  const ua = navigator.userAgent

  const isMobile = /Mobi|Android/i.test(ua)
  const isTablet = /Tablet|iPad/i.test(ua)
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isAndroid = /Android/i.test(ua)
  const isMac = /Macintosh/i.test(ua)
  const isWindows = /Windows/i.test(ua)

  return {
    id: getDeviceId(),
    browser: getBrowserName(ua),
    os: isIOS ? 'iOS' : isAndroid ? 'Android' : isMac ? 'macOS' : isWindows ? 'Windows' : 'Unknown',
    type: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop',
  }
}

const getBrowserName = (ua: string) => {
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Edge')) return 'Edge'
  return 'Unknown'
}

export function useWebSocket() {
  const SOCKET_URL = (import.meta.env.VITE_WEBSOCKET_URL as string) || 'http://localhost:5002'
  const socketRef = useRef<Socket | null>(null)

  const {
    setError,
    playerRooms,
    setSocket,
    updateRoom,
    connectPlayer,
    setIsLoading,
    setGameStats,
    setIsConnected,
  } = useStore((state) => state.actions)

  useEffect(() => {
    if (socketRef.current?.connected) return

    setIsLoading(true)

    const socket = io(SOCKET_URL, {
      query: { playerId: getPlayerId(), device: JSON.stringify(getDevice()) },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      timeout: 5000,
    })

    ////////////////////////////

    setSocket(socket)

    socket.on('connect', () => {
      setIsLoading(false)
      setIsConnected(true)
      setError('')
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      setIsLoading(false)
    })

    socket.on('connect_error', (err) => {
      setError(err.message)
      setIsLoading(false)
    })

    socket.on('gameStats', (data) => {
      setGameStats(data)
    })

    socket.on('playerRooms', (rooms) => {
      playerRooms(rooms)
    })

    socket.on('roomUpdated', (data) => {
      updateRoom(data)
    })

    socket.on('playerConnected', (data) => {
      connectPlayer(data)
    })

    socket.on('error', (data) => {
      setError(data)
    })

    return () => {
      socket.disconnect()
    }
  }, [])
}
