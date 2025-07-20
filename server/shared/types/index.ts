import { Socket, Server } from 'socket.io'

export interface RoomConfig {
  roomName: string
  maxPlayers: number
}

export interface RoomPlayer {
  playerId: string
  playerName: string
  active: boolean
  isRoomAdmin: boolean
}

export interface Player {
  playerName: string
  playerId: string
  room: Room | null
  isRoomAdmin: boolean
}

export interface Message {
  id: string
  playerId: string
  message: string
  timestamp: number
}

export interface Room {
  roomId: string
  roomCode: string
  roomName: string
  maxPlayers: number
  players: Map<string, RoomPlayer>
  isGameStarted: boolean
}

export interface GameState {
  rooms: Map<string, Room>
  players: Map<string, Player>
}

export interface GameStats {
  totalRooms: number
  totalPlayers: number
}

export interface Connection {
  socket: Socket
  io: Server
}
