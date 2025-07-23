import { Socket, Server } from 'socket.io'

// 🔌 Connection Layer
export interface Connection {
  io: Server
  socket: Socket
  playerId: string
  device: Device
}

// 📊 App Stats / Overview
export interface AppOverview {
  totalRooms: number
  totalPlayers: number
}

export interface Device {
  id: string
  os: string
  type: string
  browser: string
}

// 👤 Players and Devices
export interface PopulatedDevice extends Device {
  createdAt: string
  lastSeenAt: string
  playerId: string
  isActive: boolean
}

export interface Player {
  id: string
  name: string
  createdAt: string
  lastSeenAt: string
  isActive: boolean
}

export interface PopulatedPlayer extends Player {
  devices: PopulatedDevice[]
}

// 🏠 Rooms and Members
export interface RoomConfig {
  name: string
  maxPlayers: number
}

export interface Room extends RoomConfig {
  id: string
  createdAt: string
  updatedAt: string
  adminId: string
  isGameStarted: boolean
}

export interface PopulatedRoom extends Room {
  roomMemberships: RoomMembership[]
  messages: RoomMessage[]
}

export interface RoomMembership {
  id: string
  roomId: string
  isAdmin: boolean
  joinedAt: string
  playerId: string
  isActive: boolean
  playerName: string
  lastSeenAt: string
}

// 💬 Messaging
export interface RoomMessage {
  id: string
  roomId: string
  message: string
  createdAt: string
  playerId: string
  playerName: string
}

// 🧠 Server State
export interface GameState {
  rooms: Map<string, Room>
  players: Map<string, Player>
  roomMemberships: Map<string, RoomMembership>
  roomMessages: Map<string, RoomMessage>
  devices: Map<string, PopulatedDevice[]>
  playerConnections: Map<string, Set<string>>
}
