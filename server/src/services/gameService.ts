import {
  AppOverview,
  RoomConfig,
  RoomMembership,
  RoomMessage,
  Connection,
  PopulatedDevice,
  GameState,
  Player,
  Room,
  PopulatedRoom,
  Device,
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

const removePlayerData = (playerId: string): void => {
  gameState.playerConnections.delete(playerId)
  gameState.players.delete(playerId)
  gameState.devices.delete(playerId)

  for (const [id, roomMembership] of gameState.roomMemberships) {
    if (roomMembership.playerId === playerId) {
      gameState.roomMemberships.delete(id)
    }
  }
}

// can only be gotten with playerId
const getRoomsByPlayerId = (playerId: string): Map<string, Room> => {
  const rooms = new Map<string, Room>()
  const playerMemberships = getRoomMembershipsByPlayerId(playerId)

  for (const roomMembership of playerMemberships.values()) {
    const room = getRoomByRoomId(roomMembership.roomId)
    if (room) rooms.set(room.id, room)
  }

  return rooms
}

// can only be gotten with playerId
const getPopulatedRoomsByPlayerId = (playerId: string): Map<string, PopulatedRoom> => {
  const rooms = new Map<string, PopulatedRoom>()
  const playerRooms = getRoomsByPlayerId(playerId)

  for (const roomId of playerRooms.keys()) {
    const populatedRoom = getPopulatedRoomByRoomId(roomId)
    if (populatedRoom) rooms.set(roomId, populatedRoom)
  }

  return rooms
}

// can only be gotten with playerId
const getRoomMembershipsByPlayerId = (playerId: string): Map<string, RoomMembership> => {
  const memberships = new Map<string, RoomMembership>()

  for (const [id, roomMembership] of gameState.roomMemberships) {
    if (roomMembership.playerId === playerId) memberships.set(id, roomMembership)
  }

  return memberships
}

/////////////////////////////

// can only be gotten with roomId
const getRoomByRoomId = (roomId: string): Room | undefined => {
  return gameState.rooms.get(roomId)
}

const populateRoom = (room: Room): PopulatedRoom => ({
  ...room,
  roomMemberships: getRoomMembersByRoomId(room.id),
  messages: getRoomMessagesByRoomId(room.id),
})

// can only be gotten with roomId
const getPopulatedRoomByRoomId = (roomId: string): PopulatedRoom | undefined => {
  const room = getRoomByRoomId(roomId)
  return room ? populateRoom(room) : undefined
}

// can only be gotten with roomId
const getRoomMembersByRoomId = (roomId: string): Map<string, RoomMembership> => {
  const roomMemberships = new Map<string, RoomMembership>()

  for (const [id, roomMembership] of gameState.roomMemberships) {
    if (roomMembership.roomId === roomId) roomMemberships.set(id, roomMembership)
  }

  return roomMemberships
}

// can only be gotten with roomId
const getRoomMessagesByRoomId = (roomId: string): Map<string, RoomMessage> => {
  const messages = new Map<string, RoomMessage>()

  for (const [id, message] of gameState.roomMessages) {
    if (message.roomId === roomId) messages.set(id, message)
  }

  return messages
}

/////////////

const gameState: GameState = {
  rooms: new Map<string, Room>(), // <room.id, room>
  players: new Map<string, Player>(), // <player.id, player>
  devices: new Map<string, PopulatedDevice[]>(), // <playerId, devices>
  roomMemberships: new Map<string, RoomMembership>(), // <roomId:playerId, roomMemberships>
  roomMessages: new Map<string, RoomMessage>(), // <roomId:playerId, message>
  playerConnections: new Map<string, Set<string>>(), // <playerId, socketIds>
}

export const getAppOverview = (): AppOverview => {
  return {
    totalRooms: gameState.rooms.size,
    totalPlayers: gameState.players.size,
  }
}

const disconnectOtherSockets = (connection: Connection, playerId: string) => {
  const { socket, io, device } = connection
  const playerDevices = gameState.devices.get(playerId)
  const playerConnections = gameState.playerConnections.get(playerId)

  if (!playerConnections || !playerDevices) return

  // Disconnect all other sockets except the current one
  for (const socketId of playerConnections) {
    if (socketId !== socket.id) {
      io.sockets.sockets.get(socketId)?.emit('error', 'You logged in on another device')
      io.sockets.sockets.get(socketId)?.disconnect(true)
    }
  }

  // Deactivate all other devices except the current one
  const updatedDevices = playerDevices.map((d) =>
    d.id === device.id ? d : { ...d, isActive: false }
  )

  gameState.devices.set(playerId, updatedDevices)
  gameState.playerConnections.set(playerId, new Set([socket.id]))
}

const handlePlayerConnections = (connection: Connection, playerId: string) => {
  const { socket } = connection

  const playerConnections = gameState.playerConnections.get(playerId) ?? new Set<string>()

  playerConnections.add(socket.id)
  gameState.playerConnections.set(playerId, playerConnections)

  disconnectOtherSockets(connection, playerId)
}

// Game logic
///////////////////////////////////////////////////////////////////////////////

export function createOrUpdatePlayer(playerId: string): Player {
  const timestamp = new Date().toISOString()
  const existing = gameState.players.get(playerId)

  const player: Player = existing
    ? {
        ...existing,
        isActive: true,
        lastSeenAt: timestamp,
      }
    : {
        id: randomUUID(),
        isActive: true,
        createdAt: timestamp,
        lastSeenAt: timestamp,
        name: `Player-${Math.floor(Math.random() * 1000)}`,
      }

  gameState.players.set(player.id, player)

  return player
}

export function createOrUpdateDevice(device: Device, playerId: string): PopulatedDevice {
  const deviceId = device.id
  const timestamp = new Date().toISOString()
  const existingDevices = gameState.devices.get(playerId) ?? []
  const existingDevice = existingDevices.find((d) => d.id === deviceId)

  const populatedDevice: PopulatedDevice = existingDevice
    ? {
        ...existingDevice,
        isActive: true,
        lastSeenAt: timestamp,
      }
    : {
        ...device,
        playerId,
        isActive: true,
        id: randomUUID(),
        createdAt: timestamp,
        lastSeenAt: timestamp,
      }

  gameState.devices.set(
    playerId,
    existingDevice
      ? existingDevices.map((d) => (d.id === deviceId ? populatedDevice : d))
      : [...existingDevices, populatedDevice]
  )

  return populatedDevice
}

export const connectPlayer = (connection: Connection): void => {
  const { socket, playerId, device } = connection
  const player = createOrUpdatePlayer(playerId)
  const populatedDevice = createOrUpdateDevice(device, player.id)

  socket.data.playerId = player.id
  socket.data.device.id = populatedDevice.id

  handlePlayerConnections(connection, player.id)

  socket.emit('playerConnected', {
    ...player,
    devices: gameState.devices.get(player.id),
  })

  socket.emit('playerRooms', getPopulatedRoomsByPlayerId(player.id))
}

export const createRoom = (connection: Connection, config: RoomConfig): void => {
  const roomId = generateRoomCode()
  const { socket, playerId } = connection
  const timestamp = new Date().toISOString()

  const newRoom: Room = {
    ...config,
    id: roomId,
    adminId: playerId,
    createdAt: timestamp,
    updatedAt: timestamp,
    isGameStarted: false,
  }

  gameState.rooms.set(roomId, newRoom)

  socket.emit('roomCreated', roomId)
}

export const joinRoom = (connection: Connection, roomId: string): void => {
  const { playerId, socket, io } = connection
  const timestamp = new Date().toISOString()

  const room = gameState.rooms.get(roomId)
  if (!room) {
    socket.emit('error', 'Room not found')
    return
  }

  const player = gameState.players.get(playerId)
  if (!player) {
    socket.emit('error', 'Player not found')
    return
  }

  const roomMembershipId = `${roomId}:${playerId}`
  const isAlreadyMember = gameState.roomMemberships.has(roomMembershipId)

  const roomMemberships = getRoomMembersByRoomId(roomId)
  if (!isAlreadyMember && roomMemberships.size >= room.maxPlayers) {
    socket.emit('error', 'Room is full')
    return
  }

  // Set or update membership
  gameState.roomMemberships.set(roomMembershipId, {
    roomId,
    playerId,
    isActive: true,
    joinedAt: timestamp,
    id: roomMembershipId,
    lastSeenAt: timestamp,
    playerName: player.name,
    isAdmin: playerId === room.adminId,
  })

  socket.join(room.id)

  socket.to(room.id).emit('playerJoined', `${player.name} just joined the room.`)

  io.to(room.id).emit('roomUpdated', getPopulatedRoomByRoomId(room.id))
}

// export const sendMessage = (connection: Connection, message: string): void => {
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
//     playerName: gameState.players.get(connection.playerId))?.playerName || 'Unktimestampn',
//   })
// }

export const disconnectPlayer = (connection: Connection): void => {
  const { socket, playerId } = connection
  const timestamp = new Date().toISOString()
  const player = gameState.players.get(playerId)

  if (!player) return

  // Handle room memberships
  getRoomMembershipsByPlayerId(playerId).forEach((roomMembership) => {
    if (!roomMembership.isActive) return

    roomMembership.isActive = false
    roomMembership.lastSeenAt = timestamp

    socket.to(roomMembership.roomId).emit('playerLeft', `${player.name} just left the room.`)
    socket
      .to(roomMembership.roomId)
      .emit('roomUpdated', getPopulatedRoomByRoomId(roomMembership.roomId))
  })

  // Remove player connection
  gameState.playerConnections.delete(playerId)

  // Mark player devices as inactive
  gameState.devices.get(playerId)?.forEach((device) => {
    device.isActive = false
  })

  // Mark player as inactive
  gameState.players.set(playerId, {
    ...player,
    isActive: false,
    lastSeenAt: timestamp,
  })
}

export const getGameState = () => gameState
