import util from 'node:util'
import { ClientDevice, RoomConfig } from 'shared/types'
import { Server, Socket } from 'socket.io'
import * as gameService from '../services/gameService'

export function serializeForClient(obj: any): any {
  if (obj instanceof Set) {
    return Array.from(obj).map(serializeForClient)
  }
  if (obj instanceof Map) {
    return Object.fromEntries(Array.from(obj.entries()).map(([k, v]) => [k, serializeForClient(v)]))
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeForClient)
  }
  if (obj && typeof obj === 'object') {
    const result: any = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = serializeForClient(obj[key])
      }
    }
    return result
  }
  return obj
}

export function wrapSocketEmit(socket: Socket) {
  const originalEmit = socket.emit
  socket.emit = function (event: string, ...args: any[]) {
    const serializedArgs = args.map(serializeForClient)
    return originalEmit.call(this, event, ...serializedArgs)
  }
}

export function wrapIoEmit(io: Server) {
  const originalEmit = io.emit
  io.emit = function (event: string, ...args: any[]) {
    const serializedArgs = args.map(serializeForClient)
    return originalEmit.call(this, event, ...serializedArgs)
  }
}

export const setupSocketHandlers = (io: Server): void => {
  wrapIoEmit(io)

  io.on('connection', (socket: Socket) => {
    wrapSocketEmit(socket)

    const playerId = socket.handshake.query.playerId as string
    const device: ClientDevice = JSON.parse(socket.handshake.query.device as string)

    socket.data.playerId = playerId
    socket.data.device = device

    const connection = { io, socket, playerId, device }

    gameService.connectPlayer(connection)

    io.emit('gameStats', gameService.getGameState())

    console.log(
      'GAME STATE: Initial Connection',
      util.inspect(gameService.getGameState(), { depth: null, colors: true })
    )

    ////////////////////////////////

    socket.on('createRoom', (config: RoomConfig) => {
      gameService.createRoom(connection, config)

      io.emit('gameStats', gameService.getGameState())

      console.log(
        'GAME STATE: Create Room',
        util.inspect(gameService.getGameState(), { depth: null, colors: true })
      )
    })

    socket.on('joinRoom', (roomId: string) => {
      gameService.addPlayerToRoom(connection, roomId, false)

      io.emit('gameStats', gameService.getGameState())

      console.log(
        'GAME STATE: Join Room',
        util.inspect(gameService.getGameState(), { depth: null, colors: true })
      )
    })

    // socket.on('sendMessage', (message: string) => {
    //   gameService.sendMessage(connection, message)

    //   console.log(
    //     'GAME STATE: Sent Message',
    //     util.inspect(gameService.getGameState(), { depth: null, colors: true })
    //   )
    // })

    // socket.on('leaveRoom', (roomId: string) => {
    //   const room = gameService.getRoomByCode(roomId)
    //   const player = gameService.getPlayerByPlayerId(socket.id)

    //   if (!room || !player) return

    //   gameService.leaveRoom(socket.id)

    //   socket.to(room.roomId).emit('playerLeft', `${player.playerName} just left the room.`)

    //   socket.leave(room.roomId)

    //   io.to(room.roomId).emit('roomPlayers', gameService.getPlayersByPlayerIds(room.players))

    //   io.emit('gameStats', gameService.getGameState())

    //   console.log(
    //     'GAME STATE: ',
    //     util.inspect(gameService.getGameState(), {
    //       depth: null,
    //       colors: true,
    //     })
    //   )
    // })

    // socket.on('startGame', (roomId: string) => {
    //   const room = gameService.getRoomByCode(roomId)
    //   if (!room) return

    //   gameService.startGame(roomId)
    //   io.to(room.roomId).emit('gameStatus', room.isGameStarted)
    //   io.emit('gameStats', gameService.getGameState())

    //   console.log(
    //     'GAME STATE: ',
    //     util.inspect(gameService.getGameState(), { depth: null, colors: true })
    //   )
    // })

    socket.on('disconnect', () => {
      gameService.disconnectPlayer(connection)

      io.emit('gameStats', gameService.getGameState())

      console.log(
        'GAME STATE: Player Disconnected',
        util.inspect(gameService.getGameState(), { depth: null, colors: true })
      )
    })
  })

  io.on('error', (error) => {
    console.error('Socket error:', error)
  })
}
