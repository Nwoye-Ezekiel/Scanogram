import { useStore } from 'src/store'
import { useRoom } from 'hooks/useRoom'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function CreatePrivateRoom() {
  const { createRoom } = useRoom()
  const [name, setName] = useState('')
  const navigate = useNavigate()
  const socket = useStore((state) => state.socket)
  const [maxPlayers, setMaxPlayers] = useState('2')

  const handleCreateRoom = () => {
    if (Number(maxPlayers) < 2) {
      alert('Minimum 2 players required for multiplayer.')
      return
    }

    createRoom({ name, maxPlayers: Number(maxPlayers) })
  }

  useEffect(() => {
    if (!socket) return

    const handleJoinRoom = (roomId: string) => {
      navigate(`/game/${roomId}/lobby`)
    }

    socket.on('roomCreated', handleJoinRoom)

    return () => {
      socket.off('roomCreated', handleJoinRoom)
    }
  }, [socket])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        handleCreateRoom()
      }}
    >
      <div className="flex flex-col w-fit">
        <div>Create Private Room</div>
        <input
          type="text"
          value={name}
          minLength={3}
          placeholder="Enter room name"
          onChange={(e) => setName(e.target.value)}
          className="w-fit h-fit bg-gray-100 p-2 rounded"
        />
        <input
          type="number"
          min={2}
          value={maxPlayers}
          placeholder="Enter players count"
          onChange={(e) => setMaxPlayers(e.target.value)}
          className="w-fit h-fit bg-gray-100 p-2 rounded"
        />
        <button
          disabled={name.trim() === ''}
          className={`bg-blue-500 text-white h-10 ${
            name.trim() === '' ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          Create room
        </button>
      </div>
    </form>
  )
}
