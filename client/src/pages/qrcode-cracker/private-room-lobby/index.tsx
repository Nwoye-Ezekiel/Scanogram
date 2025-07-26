import { useStore } from 'src/store'
import { useRoom } from 'hooks/useRoom'
import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import QrCodeCracker from '..'
import { RoomMessage } from 'shared/types'

export default function PrivateRoomLobby() {
  const { joinRoom } = useRoom()
  const { roomId } = useParams()
  const error = useStore((state) => state.error)
  const rooms = useStore((state) => state.rooms)
  const player = useStore((state) => state.player)
  const socket = useStore((state) => state.socket)

  const [message, setMessage] = useState('')
  const [allMessages, setAllMessages] = useState<RoomMessage[]>([])
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const joinedRoom = useMemo(() => {
    if (!roomId) return null
    return rooms.find((room) => room.id === roomId)
  }, [rooms, roomId])

  const isRoomAdmin = useMemo(() => {
    if (!joinedRoom) return false
    return joinedRoom.adminId === player?.id
  }, [joinedRoom, player])

  // Send message to server
  const sendMessage = (message: string) => {
    if (message.trim() === '') return

    socket?.emit('sendMessage', {
      message,
      roomId,
    })
    setAllMessages((prev) => [
      ...prev,
      {
        message,
        playerName: player?.name ?? '',
        id: `${roomId}:${player?.id}`,
        createdAt: new Date().toISOString(),
        playerId: player?.id ?? '',
        roomId: roomId ?? '',
      },
    ])
    setMessage('')
  }

  const leaveRoom = () => {
    socket?.emit('leaveRoom', roomId)
    navigate('/')
  }

  const startGame = () => {
    socket?.emit('startGame', roomId)
  }

  useEffect(() => {
    if (roomId) {
      joinRoom(roomId)
    }
  }, [roomId])

  // Listen for incoming messages from server
  useEffect(() => {
    if (!socket) return

    const handlePlayerJoined = (message: string) => {
      alert(message)
    }

    const handlePlayerLeft = (message: string) => {
      alert(message)
    }

    const handleGameStarted = (isGameStarted: boolean) => {
      if (isGameStarted) {
        alert('Game has started')
      }
    }

    const handleIncomingMessage = (incomingMessage: RoomMessage) => {
      setAllMessages((prev) => [...prev, incomingMessage])
    }

    socket.on('playerJoined', handlePlayerJoined)
    socket.on('playerLeft', handlePlayerLeft)
    socket.on('gameStatus', handleGameStarted)
    socket.on('sentMessage', handleIncomingMessage)

    return () => {
      socket.off('playerJoined', handlePlayerJoined)
      socket.off('playerLeft', handlePlayerLeft)
      socket.off('gameStatus', handleGameStarted)
      socket.off('sentMessage', handleIncomingMessage)
    }
  }, [socket])

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allMessages])

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold">Room Lobby</h1>
      {error ? (
        <div>
          <h2>Error: {error}</h2>
        </div>
      ) : joinedRoom?.isGameStarted ? (
        <div>{roomId && socket && <QrCodeCracker roomId={roomId} socket={socket} />}</div>
      ) : (
        <div>
          <div className="mb-2">
            <h3 className="mt-5 mb-1 font-bold">
              Room {joinedRoom?.name} ({joinedRoom?.id}) - Members:
            </h3>
            <ol>
              {joinedRoom?.roomMemberships.map((roomMembership, index) => (
                <li key={roomMembership.playerId} className="flex items-center gap-2">
                  <span>
                    <span className="inline-block w-5">{index + 1}.</span>
                    <span
                      className={`${roomMembership.playerId === player?.id ? 'font-semibold' : ''}`}
                    >
                      {roomMembership.playerName}
                    </span>
                  </span>
                  <span
                    className={`w-2 h-2  rounded-full ${
                      roomMembership.isActive ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <span className="italic text-xs text-gray-500">
                    {roomMembership.isAdmin ? '(Admin)' : ''}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="relative w-80 h-[20rem] border border-red-500 p-2 flex flex-col overflow-hidden">
            {/* Messages */}
            <div className="flex flex-col flex-1 overflow-y-auto space-y-2 pr-1">
              {allMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`text-white p-2 rounded w-fit max-w-[60%] break-words ${
                    msg.playerId === player?.id
                      ? 'ml-auto h-fit bg-orange-400'
                      : 'mr-auto bg-blue-700'
                  }`}
                >
                  <span className="font-semibold">{msg.playerName}</span>: {msg.message}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex h-10 mt-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  sendMessage(message)
                }}
                className="flex h-10 mt-2"
              >
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  type="text"
                  placeholder="Enter a message"
                  className="flex-1 bg-gray-100 px-2 rounded-l outline-none"
                />
                <button
                  disabled={message.trim() === ''}
                  type="submit"
                  className={`bg-red-500 text-white px-4 rounded-r ${
                    message.trim() === '' ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Send
                </button>
              </form>
            </div>

            <button className="bg-blue-500 text-white px-4 rounded-r" onClick={leaveRoom}>
              Leave Room
            </button>
            {isRoomAdmin && (
              <button className="bg-blue-500 text-white px-4 rounded-r" onClick={startGame}>
                Start Game
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
