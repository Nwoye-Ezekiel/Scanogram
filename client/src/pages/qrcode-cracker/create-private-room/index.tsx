import { useRoom } from 'hooks/useRoom'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function CreatePrivateRoom() {
  const { createRoom } = useRoom()
  const [name, setName] = useState('')
  const navigate = useNavigate()
  const [maxPlayers, setMaxPlayers] = useState('2')

  const handleCreateRoom = async () => {
    if (Number(maxPlayers) < 2) {
      alert('Minimum 2 players required for multiplayer.')
      return
    }
    const { status, data: roomCode } = await createRoom({
      roomName: name,
      maxPlayers: Number(maxPlayers),
    })
    if (status === 'success') {
      navigate(`/game/${roomCode}/lobby`)
    } else {
      alert('Failed to create room')
    }
  }

  return (
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
      <button className="bg-blue-500 text-white" onClick={handleCreateRoom}>
        Create room
      </button>
    </div>
  )
}
