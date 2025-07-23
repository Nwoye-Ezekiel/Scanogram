import { useStore } from 'src/store'
import { useRoom } from 'hooks/useRoom'
import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import QrCodeCracker from '..'

export default function PrivateRoomLobby() {
  const { joinRoom } = useRoom()
  const { roomId } = useParams()
  const error = useStore((state) => state.error)
  const rooms = useStore((state) => state.rooms)
  const player = useStore((state) => state.player)
  const socket = useStore((state) => state.socket)

  const [message, setMessage] = useState('')
  const [allMessages, setAllMessages] = useState<
    { playerName: string; message: string; createdAt: string; playerId: string }[]
  >([])
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const joinedRoom = useMemo(() => {
    const room = rooms.get(roomId ?? '')
    if (!room) return undefined

    const isPlayerInRoom = Array.from(room.roomMemberships.values()).some(
      (membership) => membership.playerId === player?.id
    )

    return isPlayerInRoom ? room : undefined
  }, [rooms, roomId, player])

  const isJoinedRoomAdmin = useMemo(() => joinedRoom?.adminId === player?.id, [joinedRoom, player])

  // Send message to server
  const sendMessage = (message: string) => {
    socket?.emit('sendMessage', message)
    setAllMessages((prev) => [
      ...prev,
      {
        message,
        playerId: socket?.id || '',
        createdAt: new Date().toISOString(),
        playerName: player?.name || 'Unknown',
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

    const handleIncomingMessage = (incomingMessage: {
      message: string
      playerId: string
      createdAt: string
      playerName: string
    }) => {
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
    <div>
      <div>PrivateRoomLobby</div>
      {error ? (
        <div>
          <h2>Error: {error}</h2>
        </div>
      ) : joinedRoom?.isGameStarted ? (
        <div>{roomId && socket && <QrCodeCracker roomId={roomId} socket={socket} />}</div>
      ) : (
        <div>
          <div>
            <h3>List:</h3>
            {Array.from(joinedRoom?.roomMemberships?.values() ?? []).map((roomMembership) => (
              <div key={roomMembership.playerId} className="flex gap-2">
                <span>{roomMembership.playerName}</span>
                <span>{roomMembership.isAdmin ? 'Admin' : 'Member'}</span>
                <span>{roomMembership.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            ))}
          </div>

          <div className="relative w-80 h-[20rem] border border-red-500 p-2 flex flex-col overflow-hidden">
            {/* Messages */}
            <div className="flex flex-col flex-1 overflow-y-auto space-y-2 pr-1">
              {allMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`text-white p-2 rounded w-fit max-w-[60%] break-words ${
                    msg.playerId === socket?.id
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
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                type="text"
                placeholder="Enter a message"
                className="flex-1 bg-gray-100 px-2 rounded-l outline-none"
              />
              <button
                onClick={() => sendMessage(message)}
                className="bg-red-500 text-white px-4 rounded-r"
              >
                Send
              </button>
            </div>

            <button className="bg-blue-500 text-white px-4 rounded-r" onClick={leaveRoom}>
              Leave Room
            </button>
            {isJoinedRoomAdmin && (
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
