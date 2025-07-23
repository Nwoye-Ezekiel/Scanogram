import { create } from 'zustand'
import { Socket } from 'socket.io-client'
import { immer } from 'zustand/middleware/immer'
import { PopulatedPlayer, PopulatedRoom } from 'shared/types'
import { setDeviceId, setPlayerId } from './services'

interface InitialState {
  error: string
  isLoading: boolean
  isConnected: boolean
  socket: Socket | null
  player: PopulatedPlayer | null
  rooms: PopulatedRoom[]
  totalRooms: number
  totalPlayers: number
}

interface State extends InitialState {}

type Actions = {
  actions: {
    reset: () => void
    playerRooms: (rooms: PopulatedRoom[]) => void
    updateRoom: (room: PopulatedRoom) => void
    setError: (error: string) => void
    connectPlayer: (player: PopulatedPlayer) => void
    setIsLoading: (isLoading: boolean) => void
    setIsConnected: (isConnected: boolean) => void
    setSocket: (socket: Socket | null) => void
    setGameStats: (gameStats: { totalRooms: number; totalPlayers: number }) => void
  }
}

const initialState: InitialState = {
  error: '',
  totalRooms: 0,
  player: null,
  isLoading: true,
  isConnected: false,
  totalPlayers: 0,
  socket: null,
  rooms: [],
}

export const useStore = create<State & Actions>()(
  immer((set) => ({
    ...initialState,
    actions: {
      setIsConnected: (isConnected) => {
        set((state) => {
          state.isConnected = isConnected
        })
      },
      setIsLoading: (isLoading) => {
        set((state) => {
          state.isLoading = isLoading
        })
      },
      setError: (error) => {
        set((state) => {
          state.error = error
        })
      },
      setGameStats: (gameStats) => {
        set((state) => {
          state.totalRooms = gameStats.totalRooms
          state.totalPlayers = gameStats.totalPlayers
        })
      },
      setSocket: (socket) => {
        set((state) => {
          ;(state as any).socket = socket
        })
      },
      connectPlayer: (player: PopulatedPlayer) => {
        set((state) => {
          state.player = player
        })

        setPlayerId(player.id)

        const activeDevice = Array.from(player.devices.values()).find((device) => device.isActive)

        if (activeDevice) {
          setDeviceId(activeDevice.id)
        }
      },
      playerRooms: (rooms) => {
        set((state) => {
          state.rooms = rooms
        })
      },
      updateRoom: (room) => {
        set((state) => {
          const index = state.rooms.findIndex((r) => r.id === room.id)

          if (index !== -1) {
            const updatedRooms = [...state.rooms]
            updatedRooms[index] = room
            return { rooms: updatedRooms }
          } else {
            return { rooms: [...state.rooms, room] }
          }
        })
      },
      reset: () => {
        set(initialState)
      },
    },
  }))
)
