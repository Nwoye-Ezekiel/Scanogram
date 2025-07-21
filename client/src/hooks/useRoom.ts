import { useStore } from '../store'

export function useRoom() {
  const socket = useStore((state) => state.socket)
  const { setError } = useStore((state) => state.actions)

  const createRoom = (config: { name: string; maxPlayers: number }) => {
    if (!socket || !socket.connected) {
      setError('Not connected to server')
      return
    }

    socket.emit('createRoom', config)
  }

  const joinRoom = (roomId: string) => {
    if (!socket || !socket.connected) {
      setError('Not connected to server')
      return
    }

    socket.emit('joinRoom', roomId)
  }

  return {
    joinRoom,
    createRoom,
  }
}
