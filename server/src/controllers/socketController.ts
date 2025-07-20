import util from 'node:util'
import { RoomConfig } from 'shared/types'
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

    const connection = { io, socket }

    ///////////////////////////////

    gameService.connectPlayer(connection)

    io.emit('gameStats', gameService.getAppState())

    console.log(
      'GAME STATE: Initial Connection',
      util.inspect(gameService.getGateState(), { depth: null, colors: true })
    )

    ////////////////////////////////

    socket.on('createRoom', (config: RoomConfig, callback: (response: any) => void) => {
      gameService.createRoom(connection, config, callback)

      io.emit('gameStats', gameService.getAppState())

      console.log(
        'GAME STATE: Create Room',
        util.inspect(gameService.getGateState(), { depth: null, colors: true })
      )
    })

    socket.on('joinRoom', (roomCode: string) => {
      gameService.addPlayerToRoom(connection, roomCode)

      io.emit('gameStats', gameService.getAppState())

      console.log(
        'GAME STATE: Join Room',
        util.inspect(gameService.getGateState(), { depth: null, colors: true })
      )
    })

    socket.on('sendMessage', (message: string) => {
      gameService.sendMessage(connection, message)

      console.log(
        'GAME STATE: Sent Message',
        util.inspect(gameService.getGateState(), { depth: null, colors: true })
      )
    })

    // socket.on('leaveRoom', (roomCode: string) => {
    //   const room = gameService.getRoomByCode(roomCode)
    //   const player = gameService.getPlayerByPlayerId(socket.id)

    //   if (!room || !player) return

    //   gameService.leaveRoom(socket.id)

    //   socket.to(room.roomId).emit('playerLeft', `${player.playerName} just left the room.`)

    //   socket.leave(room.roomId)

    //   io.to(room.roomId).emit('roomPlayers', gameService.getPlayersByPlayerIds(room.players))

    //   io.emit('gameStats', gameService.getAppState())

    //   console.log(
    //     'GAME STATE: ',
    //     util.inspect(gameService.getGateState(), {
    //       depth: null,
    //       colors: true,
    //     })
    //   )
    // })

    // socket.on('startGame', (roomCode: string) => {
    //   const room = gameService.getRoomByCode(roomCode)
    //   if (!room) return

    //   gameService.startGame(roomCode)
    //   io.to(room.roomId).emit('gameStatus', room.isGameStarted)
    //   io.emit('gameStats', gameService.getAppState())

    //   console.log(
    //     'GAME STATE: ',
    //     util.inspect(gameService.getGateState(), { depth: null, colors: true })
    //   )
    // })

    socket.on('disconnect', () => {
      gameService.disconnectPlayer(connection)

      io.emit('gameStats', gameService.getAppState())

      console.log(
        'GAME STATE: Player Disconnected',
        util.inspect(gameService.getGateState(), { depth: null, colors: true })
      )
    })
  })

  io.on('error', (error) => {
    console.error('Socket error:', error)
  })
}
