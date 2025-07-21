import { Socket, Server } from 'socket.io'

// 🔌 Connection Layer
export interface ServerConnection {
  io: Server
  socket: Socket
  playerId: string
}

// 📊 App Stats / Overview
export interface AppOverview {
  totalRooms: number
  totalPlayers: number
}

// 👤 Players and Devices
export interface Device {
  id: string
  os: string
  type: string
  browser: string
  createdAt: Date
  lastSeenAt: Date
  playerId: string
  userAgent: string
  isActive: boolean
}

export interface ServerPlayer {
  id: string
  name: string
  createdAt: Date
  lastSeenAt: Date
  isOnline: boolean
}

export interface ClientPlayer extends ServerPlayer {
  devices: Device[]
}

// 🏠 Rooms and Members
export interface RoomConfig {
  name: string
  maxPlayers: number
}

export interface ServerRoom extends RoomConfig {
  id: string
  createdAt: Date
  updatedAt: Date
  isGameStarted: boolean
}

export interface ClientRoom extends ServerRoom {
  members: RoomMember[]
  messages: RoomMessage[]
}

export interface RoomMember {
  joinedAt: Date
  roomId: string
  isAdmin: boolean
  playerId: string
  lastSeenAt: Date
  isActive: boolean
}

// 💬 Messaging
export interface RoomMessage {
  id: string
  roomId: string
  message: string
  createdAt: Date
  playerId: string
}

// 🧠 Server State
export interface ServerGameState {
  devices: Map<string, Device>
  rooms: Map<string, ServerRoom>
  players: Map<string, ServerPlayer>
  roomMembers: Map<string, RoomMember>
  roomMessages: Map<string, RoomMessage>
}
