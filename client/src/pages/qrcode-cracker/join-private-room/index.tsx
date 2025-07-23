import { useStore } from 'src/store'
import { useNavigate } from 'react-router-dom'
import React, { useEffect, useRef } from 'react'

export default function JoinPrivateRoom() {
  const navigate = useNavigate()
  const [roomId, setRoomId] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [allMessages, setAllMessages] = React.useState<
    { user: string; message: string; createdAt: string; socketId: string }[]
  >([])

  const socket = useStore((state) => state.socket)
  const socketId = useStore((state) => state.socket)?.id ?? ''
  const { setError } = useStore((state) => state.actions)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // Send message to server
  const sendMessage = (msg: {
    user: string
    message: string
    createdAt: string
    socketId: string
  }) => {
    if (!socket || !socket.connected) {
      setError('Not connected to server')
      return
    }
    socket.emit('sendMessage', msg)
    setMessage('') // Clear input
  }

  // Listen for incoming messages from server
  useEffect(() => {
    if (!socket) return

    const handleIncomingMessage = (incomingMessage: {
      user: string
      message: string
      createdAt: string
      socketId: string
    }) => {
      setAllMessages((prev) => [...prev, incomingMessage])
    }

    socket.on('sentMessage', handleIncomingMessage)

    return () => {
      socket.off('sentMessage', handleIncomingMessage)
    }
  }, [socket])

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allMessages])

  const handleJoinRoom = () => {
    navigate(`/game/${roomId}/lobby`)
  }

  return (
    <div className="p-4">
      <div className="text-lg font-bold mb-2">JoinPrivateRoom</div>

      <div className="flex justify-evenly items-center w-full h-[30rem] border border-red-500">
        {/* Room Code Input */}
        <div className="flex justify-center">
          <input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            type="text"
            placeholder="Enter room code"
            className="w-fit h-fit bg-gray-100 p-2 rounded"
          />
          <button className="bg-blue-500 text-white" onClick={handleJoinRoom}>
            Join room
          </button>
        </div>

        {/* Chat Box */}
        <div className="relative w-80 h-full border border-red-500 p-2 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex flex-col flex-1 overflow-y-auto space-y-2 pr-1">
            {allMessages.map((msg, index) => (
              <div
                key={index}
                className={`text-white p-2 rounded w-fit max-w-[60%] break-words ${
                  msg.socketId === socketId ? 'ml-auto h-fit bg-orange-400' : 'mr-auto bg-blue-700'
                }`}
              >
                <span className="font-semibold">{msg.user}</span>: {msg.message}
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
              onClick={() =>
                sendMessage({
                  user: 'John Doe',
                  message,
                  socketId,
                  createdAt: new Date().toISOString(),
                })
              }
              className="bg-red-500 text-white px-4 rounded-r"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
