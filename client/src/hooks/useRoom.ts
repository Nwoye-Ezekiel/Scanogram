import { useStore } from '../store'

export function useRoom() {
  const socket = useStore((state) => state.socket)
  const { setError } = useStore((state) => state.actions)

  const createRoom = (config: { roomName: string; maxPlayers: number }) => {
    if (!socket || !socket.connected) {
      setError('Not connected to server')
      return Promise.resolve({ status: 'error', data: null })
    }

    return new Promise<{ status: 'success' | 'error'; data: string | null }>((resolve) => {
      socket.emit('createRoom', config, (response: any) => {
        if (response.success) {
          resolve({ status: 'success', data: response.roomCode })
        } else {
          setError(response.error || 'Failed to create room')
          resolve({ status: 'error', data: null })
        }
      })
    })
  }

  const joinRoom = (roomCode: string) => {
    if (!socket || !socket.connected) {
      setError('Not connected to server')
      return
    }

    socket.emit('joinRoom', roomCode)
  }

  const sendMessage = (roomCode: string, message: string) => {
    if (!socket || !socket.connected) {
      setError('Not connected to server or not in a room')
      return
    }

    if (!message.trim()) {
      return
    }

    const [roomId] = roomCode.split('-')
    socket.emit('sendMessage', { roomId, message })
  }

  return {
    joinRoom,
    createRoom,
    sendMessage,
  }
}
