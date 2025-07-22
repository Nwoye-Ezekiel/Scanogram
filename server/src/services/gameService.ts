import {
  AppOverview,
  RoomConfig,
  RoomMember,
  RoomMessage,
  ServerConnection,
  ServerDevice,
  ServerGameState,
  ServerPlayer,
  ServerRoom,
} from 'shared/types'
import { randomUUID } from 'crypto'

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

// function releaseRoomCode(code: string) {
//   usedCodes.delete(code) // Call when room is closed
// }

export const removePlayerData = (playerId: string): void => {
  // Remove all player connections (socket IDs)
  gameState.playerConnections.delete(playerId)

  // Remove player from players map
  gameState.players.delete(playerId)

  // Remove player's devices
  gameState.devices.delete(playerId)

  // Remove room membership entries for player
  for (const [roomId, member] of gameState.roomMembers.entries()) {
    if (member.playerId === playerId) {
      gameState.roomMembers.delete(roomId)
    }
  }
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

const setDevicesToInactive = (playerId: string) => {
  const devices = gameState.devices.get(playerId)
  if (devices) {
    for (const device of devices) {
      device.isActive = false
    }
  }
}

const gameState: ServerGameState = {
  rooms: new Map<string, ServerRoom>(),
  players: new Map<string, ServerPlayer>(),
  devices: new Map<string, ServerDevice[]>(),
  roomMembers: new Map<string, RoomMember>(),
  roomMessages: new Map<string, RoomMessage>(),
  playerConnections: new Map<string, Set<string>>(),
}

export const getAppOverview = (): AppOverview => {
  return {
    totalRooms: gameState.rooms.size,
    totalPlayers: gameState.players.size,
  }
}

const disconnectOtherSockets = (connection: ServerConnection, playerId: string) => {
  const playerConnections = gameState.playerConnections.get(playerId)
  const playerDevices = gameState.devices.get(playerId)

  if (!playerConnections || !playerDevices) return

  for (const socketId of playerConnections) {
    if (socketId !== connection.socket.id) {
      const socket = connection.io.sockets.sockets.get(socketId)

      if (socket) {
        socket.emit('error', {
          reason: 'You logged in on another device',
        })

        socket.disconnect(true)
      }
    }
  }

  for (const device of playerDevices) {
    if (device.id !== connection.device.id) {
      device.isActive = false
    }
  }

  gameState.playerConnections.set(playerId, new Set([connection.socket.id]))
}

const handlePlayerConnections = (connection: ServerConnection, playerId: string) => {
  let playerConnections = gameState.playerConnections.get(playerId)

  if (!playerConnections) {
    playerConnections = new Set<string>()
    gameState.playerConnections.set(playerId, playerConnections)
  }

  playerConnections.add(connection.socket.id)

  disconnectOtherSockets(connection, playerId)
}

export const connectPlayer = (connection: ServerConnection): void => {
  const now = new Date().toISOString()
  const { playerId } = connection
  const { id: deviceId } = connection.device

  const existingPlayer = gameState.players.get(playerId)
  const playerDevices = gameState.devices.get(playerId) ?? []

  const existingDevice = playerDevices.find((device) => device.id === deviceId)

  let player: ServerPlayer
  let device: ServerDevice

  if (existingPlayer) {
    player = {
      ...existingPlayer,
      isActive: true,
      lastSeenAt: now,
    }
    gameState.players.set(playerId, player)
  } else {
    player = {
      id: randomUUID(),
      name: `Player-${Math.floor(Math.random() * 1000)}`,
      createdAt: now,
      lastSeenAt: now,
      isActive: true,
    }

    gameState.players.set(player.id, player)
    connection.socket.data.playerId = player.id
  }

  if (existingDevice) {
    device = {
      ...existingDevice,
      lastSeenAt: now,
      isActive: true,
    }

    const updatedDevices = playerDevices.map((d) => (d.id === deviceId ? device : d))

    gameState.devices.set(player.id, updatedDevices)
  } else {
    device = {
      ...connection.device,
      id: randomUUID(),
      createdAt: now,
      lastSeenAt: now,
      playerId: player.id,
      isActive: true,
    }

    gameState.devices.set(player.id, [...playerDevices, device])
    connection.socket.data.device.id = device.id
  }

  handlePlayerConnections(connection, player.id)

  connection.socket.emit('playerConnected', {
    ...player,
    devices: gameState.devices.get(player.id),
  })
  connection.socket.emit('playerRooms', getRoomsByPlayerId(player.id))
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
  const playerId = connection.playerId
  const now = new Date().toISOString()
  const room = gameState.rooms.get(roomId)
  const player = gameState.players.get(playerId)
  const roomMembers = getRoomMembersByRoomId(roomId)

  if (room && player) {
    if (roomMembers.length + 1 <= room.maxPlayers) {
      gameState.roomMembers.set(roomId, {
        roomId,
        isAdmin,
        playerId,
        joinedAt: now,
        isActive: true,
        lastSeenAt: now,
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
  const playerId = connection.playerId
  const player = gameState.players.get(playerId)

  if (!player) return

  ///////
  const playerRooms = getRoomsByPlayerId(playerId)

  // room related stuff
  playerRooms.forEach((room) => {
    const roomMember = getRoomMembersByRoomId(room.id).find(
      (member) => member.playerId === playerId
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
  ////////
  setDevicesToInactive(playerId)

  gameState.playerConnections.delete(playerId)

  gameState.players.set(playerId, {
    ...player,
    isActive: false,
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
