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

export interface ClientDevice {
  id: string
  os: string
  type: string
  browser: string
}

// 👤 Players and Devices
export interface ServerDevice extends ClientDevice {
  createdAt: string
  lastSeenAt: string
  playerId: string
  isActive: boolean
}

export interface ServerPlayer {
  id: string
  name: string
  createdAt: string
  lastSeenAt: string
  isOnline: boolean
}

export interface ClientPlayer extends ServerPlayer {
  devices: ServerDevice[]
}

// 🏠 Rooms and Members
export interface RoomConfig {
  name: string
  maxPlayers: number
}

export interface ServerRoom extends RoomConfig {
  id: string
  createdAt: string
  updatedAt: string
  isGameStarted: boolean
}

export interface ClientRoom extends ServerRoom {
  members: RoomMember[]
  messages: RoomMessage[]
}

export interface RoomMember {
  joinedAt: string
  roomId: string
  isAdmin: boolean
  playerId: string
  lastSeenAt: string
  isActive: boolean
}

// 💬 Messaging
export interface RoomMessage {
  id: string
  roomId: string
  message: string
  createdAt: string
  playerId: string
}

// 🧠 Server State
export interface ServerGameState {
  devices: Map<string, ServerDevice>
  rooms: Map<string, ServerRoom>
  players: Map<string, ServerPlayer>
  roomMembers: Map<string, RoomMember>
  roomMessages: Map<string, RoomMessage>
  playerConnections: Map<string, ServerDevice>
}
