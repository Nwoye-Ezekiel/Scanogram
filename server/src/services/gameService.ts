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

import { v4 as uuidv4 } from 'uuid'

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

// export const connectPlayer = (connection: ServerConnection): void => {
//   const playerId = connection.playerId
//   const playerExists = gameState.players.get(playerId)

//   if (!playerExists) {
//     console.warn(`No player found for ID: ${playerId}`)
//     return
//   }

//   const connectedPlayed: ClientPlayer = {
//     ...playerExists,
//     isOnline: true,
//     lastSeenAt: new Date().toISOString(),
//     devices: [],
//   }

//   connection.socket.emit('playerConnected', connectedPlayed)
// }
export const connectPlayer = (connection: ServerConnection): void => {
  const now = new Date().toISOString()
  const playerId = connection.playerId
  const playerExists = gameState.players.get(playerId)

  let player: ClientPlayer

  if (playerExists) {
    player = {
      ...playerExists,
      isOnline: true,
      lastSeenAt: now,
      devices: [],
    }
    gameState.players.set(playerId, player)
  } else {
    const newPlayerId = uuidv4()
    player = {
      id: newPlayerId,
      name: `Player-${Math.floor(Math.random() * 1000)}`,
      createdAt: now,
      lastSeenAt: now,
      isOnline: true,
      devices: [],
    }
    gameState.players.set(newPlayerId, player)
  }

  connection.socket.emit('playerConnected', player)
  connection.socket.emit('playerRooms', getRoomsByPlayerId(playerId))
}

export const createRoom = (connection: ServerConnection, config: RoomConfig): void => {
  const roomId = generateRoomCode()
  const now = new Date().toISOString()

  const newRoom: ServerRoom = {
    ...config,
    id: roomId,
    createdAt: now,
    updatedAt: now,
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
  const now = new Date().toISOString()
  const room = gameState.rooms.get(roomId)
  const player = gameState.players.get(connection.playerId)
  const roomMembers = getRoomMembersByRoomId(roomId)

  if (room && player) {
    if (roomMembers.length + 1 <= room.maxPlayers) {
      gameState.roomMembers.set(roomId, {
        roomId,
        isAdmin,
        joinedAt: now,
        isActive: true,
        lastSeenAt: now,
        playerId: player.id,
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
//     createdAt: new Date().toISOString().toISOString(),
//     playerName: gameState.players.get(connection.playerId))?.playerName || 'Unknown',
//   })
// }

export const disconnectPlayer = (connection: ServerConnection): void => {
  const now = new Date().toISOString()
  const player = gameState.players.get(connection.playerId)

  if (!player) return

  const playerRooms = getRoomsByPlayerId(connection.playerId)

  playerRooms.forEach((room) => {
    const roomMember = getRoomMembersByRoomId(room.id).find(
      (member) => member.playerId === connection.playerId
    )

    if (roomMember) {
      roomMember.isActive = false
      roomMember.lastSeenAt = now
    }

    connection.socket.to(room.id).emit('playerLeft', `${player.name} just left the room.`)
    connection.socket.to(room.id).emit('roomUpdated', {
      ...room,
      members: getRoomMembersByRoomId(room.id),
      messages: getRoomMessagesByRoomId(room.id),
    })
    connection.socket.leave(room.id)
  })

  gameState.players.set(connection.playerId, {
    ...player,
    isOnline: false,
    lastSeenAt: now,
  })
}

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

export const getGameState = () => {
  return gameState
}
