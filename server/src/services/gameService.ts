import {
  Connection,
  GameState,
  GameStats,
  Player,
  Room,
  RoomConfig,
  RoomPlayer,
} from 'shared/types'

function getRoomPlayers(roomCode: string) {
  const room = gameState.rooms.get(roomCode)

  if (!room) return []

  return Array.from(room.players.values()).map((player) => ({
    playerId: player.playerId,
    active: player.active,
    playerName: player.playerName,
    isRoomAdmin: player.isRoomAdmin,
  }))
}

const gameState: GameState = {
  rooms: new Map(),
  players: new Map(),
}

export const getAppState = (): GameStats => {
  return {
    totalRooms: gameState.rooms.size,
    totalPlayers: gameState.players.size,
  }
}

export const connectPlayer = (connection: Connection): void => {
  const player = {
    room: null,
    isRoomAdmin: false,
    playerId: connection.socket.id,
    playerName: `Player ${gameState.players.size + 1}`,
  }

  gameState.players.set(connection.socket.id, player)

  connection.socket.emit('playerUpdated', player)
}

export const createRoom = (
  connection: Connection,
  config: RoomConfig,
  callback: (response: any) => void
): void => {
  const now = Date.now().toString()
  const roomNumber = (gameState.rooms.size + 1).toString().padStart(3, '0')
  const roomCode = config.roomName.substring(0, 3) + roomNumber

  const newRoom: Room = {
    ...config,
    roomId: now,
    roomCode: roomCode,
    isGameStarted: false,
    players: new Map<string, RoomPlayer>(),
  }

  gameState.rooms.set(roomCode, newRoom)

  addPlayerToRoom(connection, roomCode, true)

  callback({ success: true, roomCode })
}

export const addPlayerToRoom = (
  connection: Connection,
  roomCode: string,
  isRoomAdmin: boolean = false
): void => {
  const room = gameState.rooms.get(roomCode)
  const player = gameState.players.get(connection.socket.id)

  if (room && player) {
    if (room.players.size + 1 <= room.maxPlayers) {
      room.players.set(connection.socket.id, {
        isRoomAdmin,
        active: true,
        playerId: player.playerId,
        playerName: player.playerName,
      })

      player.room = room
      player.isRoomAdmin = isRoomAdmin

      connection.socket.join(room.roomCode)

      connection.socket
        .to(room.roomCode)
        .emit('playerJoined', `${player.playerName} just joined the room.`)

      connection.io.to(room.roomCode).emit('roomUpdated', {
        ...room,
        players: getRoomPlayers(roomCode),
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

export const sendMessage = (connection: Connection, message: string): void => {
  const roomCode = gameState.players.get(connection.socket.id)?.room?.roomCode ?? ''
  const room = gameState.rooms.get(roomCode)

  if (!room) {
    connection.socket.emit('error', 'Room not found')
    return
  }

  if (!room.players.has(connection.socket.id)) {
    connection.socket.emit('error', 'You are not in this room')
    return
  }

  connection.socket.to(room.roomCode).emit('sentMessage', {
    message,
    playerId: connection.socket.id,
    createdAt: new Date().toISOString(),
    playerName: gameState.players.get(connection.socket.id)?.playerName || 'Unknown',
  })
}

export const disconnectPlayer = (connection: Connection): void => {
  const player = gameState.players.get(connection.socket.id)

  if (!player) return

  const room = gameState.rooms.get(player.room?.roomCode || '')

  if (room) {
    const roomPlayer = room.players.get(connection.socket.id)

    if (!roomPlayer) return

    roomPlayer.active = false

    connection.socket
      .to(room.roomCode)
      .emit('playerLeft', `${player.playerName} just left the room.`)

    connection.socket.to(room.roomCode).emit('roomUpdated', {
      ...room,
      players: getRoomPlayers(room.roomCode),
    })
  }
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
//     // Use room.roomCode as the key
//     gameState.rooms.delete(room.roomCode)
//   } else {
//     const isRoomAdmin = player?.room?.isRoomAdmin

//     if (isRoomAdmin) {
//       const nextAdmin = getPlayerByPlayerId(Array.from(room.players)[0])
//       if (nextAdmin?.room) {
//         nextAdmin.room.isRoomAdmin = true
//       }
//     }
//   }

//   player.room = null
// }

export const getRoomByRoomId = (roomCode: string): Room | null => {
  return gameState.rooms.get(roomCode) ?? null
}

export const getGateState = (): GameState => {
  return gameState
}

export const getRoomByCode = (roomCode: string): Room | null => {
  return Array.from(gameState.rooms.values()).find((room) => room.roomCode === roomCode) ?? null
}

export const getRoomByPlayerId = (playerId: string): Room | null => {
  const player = gameState.players.get(playerId)
  if (!player) return null

  return (
    Array.from(gameState.rooms.values()).find((room) => {
      return room.players.has(playerId)
    }) ?? null
  )
}

export const getPlayerByPlayerId = (playerId: string): Player | null => {
  return gameState.players.get(playerId) ?? null
}

export const getPlayersByPlayerIds = (playerIds: Set<string>): Player[] => {
  return Array.from(playerIds)
    .map((playerId: string) => getPlayerByPlayerId(playerId))
    .filter((player): player is Player => player !== undefined)
}

export const startGame = (roomCode: string): void => {
  const room = getRoomByCode(roomCode)
  if (!room) return

  room.isGameStarted = true
}
