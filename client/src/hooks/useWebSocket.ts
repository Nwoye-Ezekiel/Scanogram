import { useEffect } from 'react'
import { useStore } from 'src/store'
import { io } from 'socket.io-client'

export function useWebSocket() {
  const SOCKET_URL = (import.meta.env.VITE_WEBSOCKET_URL as string) || 'http://localhost:5002'

  const {
    setError,
    setSocket,
    updateRoom,
    updatePlayer,
    setIsLoading,
    setGameStats,
    setIsConnected,
  } = useStore((state) => state.actions)

  useEffect(() => {
    setIsLoading(true)

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      timeout: 5000,
    })

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

    socket.on('roomUpdated', (data) => {
      updateRoom(data)
    })

    socket.on('playerUpdated', (data) => {
      updatePlayer(data)
    })

    socket.on('error', (data) => {
      setError(data)
    })

    // socket.on('messageSent', (data) => {
    //   setMessage(data)
    // })

    // socket.on('gameState', (data) => {
    //   console.log('Game State: ', data)
    // })

    // Cleanup on unmount
    return () => {
      socket.disconnect()
    }
  }, [])
}
