import {
  AppOverview,
  ClientPlayer,
  Device,
  RoomConfig,
  RoomMember,
  RoomMessage,
  ServerConnection,
  ServerGameState,
  ServerPlayer,
  ServerRoom,
} from 'shared/types'

const { randomInt } = require('crypto')

const usedCodes = new Set()
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function generateRoomCode() {
  let code
  do {
    code = ''
    for (let i = 0; i < 6; i++) {
      code += chars[randomInt(chars.length)]
    }
  } while (usedCodes.has(code))

  usedCodes.add(code)

  return code
}

function releaseRoomCode(code: string) {
  usedCodes.delete(code) // Call when room is closed
}

const getRoomMembersByPlayerId = (playerId: string) => {
  return Array.from(gameState.roomMembers.values()).filter((member) => member.playerId === playerId)
}

const getRoomsByPlayerId = (playerId: string) => {
  return getRoomMembersByPlayerId(playerId)
    .map((member) => gameState.rooms.get(member.roomId))
    .filter((room) => room !== undefined)
}

const getRoomMembersByRoomId = (roomId: string) => {
  return Array.from(gameState.roomMembers.values()).filter((member) => member.roomId === roomId)
}

const getRoomMessagesByRoomId = (roomId: string) => {
  return Array.from(gameState.roomMessages.values()).filter((message) => message.roomId === roomId)
}

const gameState: ServerGameState = {
  devices: new Map<string, Device>(),
  rooms: new Map<string, ServerRoom>(),
  players: new Map<string, ServerPlayer>(),
  roomMembers: new Map<string, RoomMember>(),
  roomMessages: new Map<string, RoomMessage>(),
}

export const getAppOverview = (): AppOverview => {
  return {
    totalRooms: gameState.rooms.size,
    totalPlayers: gameState.players.size,
  }
}

export const doesPlayerExist = (playerId: string): boolean => {
  return gameState.players.has(playerId)
}

// export const connectPlayer = (connection: ServerConnection): void => {
//   const playerId = connection.playerId
//   const existingPlayer = gameState.players.get(playerId)

//   if (!existingPlayer) {
//     console.warn(`No player found for ID: ${playerId}`)
//     return
//   }

//   const connectedPlayed: ClientPlayer = {
//     ...existingPlayer,
//     isOnline: true,
//     lastSeenAt: new Date(),
//     devices: [],
//   }

//   connection.socket.emit('playerConnected', connectedPlayed)
// }
export const connectPlayer = (connection: ServerConnection): void => {
  const playerId = connection.playerId
  const existingPlayer = gameState.players.get(playerId)

  let player: ClientPlayer

  if (existingPlayer) {
    player = {
      ...existingPlayer,
      isOnline: true,
      lastSeenAt: new Date(),
      devices: [],
    }
  } else {
    player = {
      id: playerId,
      name: `Player-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date(),
      lastSeenAt: new Date(),
      isOnline: true,
      devices: [],
    }
    gameState.players.set(playerId, player)
  }

  connection.socket.emit('playerConnected', player)
  connection.socket.emit('playerRooms', getRoomsByPlayerId(playerId))
}

export const createRoom = (connection: ServerConnection, config: RoomConfig): void => {
  const roomId = generateRoomCode()

  const newRoom: ServerRoom = {
    ...config,
    id: roomId,
    createdAt: new Date(),
    updatedAt: new Date(),
    isGameStarted: false,
  }

  gameState.rooms.set(roomId, newRoom)

  addPlayerToRoom(connection, roomId, true)
}

export const addPlayerToRoom = (
  connection: ServerConnection,
  roomId: string,
  isAdmin: boolean
): void => {
  const room = gameState.rooms.get(roomId)
  const player = gameState.players.get(connection.playerId)
  const roomMembers = getRoomMembersByRoomId(roomId)

  if (room && player) {
    if (roomMembers.length + 1 <= room.maxPlayers) {
      gameState.roomMembers.set(roomId, {
        roomId,
        isAdmin,
        isActive: true,
        playerId: player.id,
        joinedAt: new Date(),
        lastSeenAt: new Date(),
      })

      connection.socket.join(room.id)

      connection.socket.emit(`${isAdmin ? 'roomCreated' : 'roomJoined'}`, roomId)

      connection.socket.to(room.id).emit('playerJoined', `${player.name} just joined the room.`)

      connection.io.to(room.id).emit('roomUpdated', {
        ...room,
        members: getRoomMembersByRoomId(roomId),
        messages: getRoomMessagesByRoomId(roomId),
      })
    } else {
      connection.socket.emit('error', 'Room is full')
    }
  } else if (!room) {
    connection.socket.emit('error', 'Room not found')
  } else if (!player) {
    connection.socket.emit('error', 'Player not found')
  }
}

// export const sendMessage = (connection: ServerConnection, message: string): void => {
//   const roomId = gameState.players.get(connection.playerId))?.room?.roomId ?? ''
//   const room = gameState.rooms.get(roomId)

//   if (!room) {
//     connection.socket.emit('error', 'Room not found')
//     return
//   }

//   if (!room.players.has(connection.playerId)) {
//     connection.socket.emit('error', 'You are not in this room')
//     return
//   }

//   connection.socket.to(room.roomId).emit('sentMessage', {
//     message,
//     playerId: connection.playerId),
//     createdAt: new Date().toISOString(),
//     playerName: gameState.players.get(connection.playerId))?.playerName || 'Unknown',
//   })
// }

// export const disconnectPlayer = (connection: ServerConnection): void => {
//   const player = gameState.players.get(connection.playerId))

//   if (!player) return

//   const room = gameState.rooms.get(player.room?.roomId || '')

//   if (room) {
//     const roomPlayer = room.players.get(connection.playerId))

//     if (!roomPlayer) return

//     roomPlayer.active = false

//     connection.socket
//       .to(room.roomId)
//       .emit('playerLeft', `${player.playerName} just left the room.`)

//     connection.socket.to(room.roomId).emit('roomUpdated', {
//       ...room,
//       players: getRoomPlayers(room.roomId),
//     })
//   }
// }

////////////////////////////////////////

// export const removePlayer = (playerId: string): void => {
//   leaveRoom(playerId)
//   gameState.players.delete(playerId)
// }

// export const leaveRoom = (playerId: string): void => {
//   const room = getRoomByPlayerId(playerId)
//   const player = getPlayerByPlayerId(playerId)

//   if (!room || !player) return

//   room.players.delete(playerId)

//   if (room.players.size === 0) {
//     // Use room.roomId as the key
//     gameState.rooms.delete(room.roomId)
//   } else {
//     const isAdmin = player?.room?.isAdmin

//     if (isAdmin) {
//       const nextAdmin = getPlayerByPlayerId(Array.from(room.players)[0])
//       if (nextAdmin?.room) {
//         nextAdmin.room.isAdmin = true
//       }
//     }
//   }

//   player.room = null
// }

export const getGateState = (): ServerGameState => {
  return gameState
}
