import { create } from 'zustand'
import { Socket } from 'socket.io-client'
import { immer } from 'zustand/middleware/immer'
import { ClientPlayer, ClientRoom } from 'shared/types'
import { setDeviceId, setPlayerId } from './services'

interface InitialState {
  error: string
  isLoading: boolean
  isConnected: boolean
  socket: Socket | null
  player: ClientPlayer | null
  rooms: Map<string, ClientRoom>
  totalRooms: number
  totalPlayers: number
}

interface State extends InitialState {}

type Actions = {
  actions: {
    reset: () => void
    playerRooms: (rooms: ClientRoom[]) => void
    updateRoom: (room: ClientRoom) => void
    setError: (error: string) => void
    connectPlayer: (player: ClientPlayer) => void
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
  rooms: new Map<string, ClientRoom>(),
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
      connectPlayer: (player: ClientPlayer) => {
        set((state) => {
          state.player = player
        })

        setPlayerId(player.id)

        const activeDevice = player.devices.find((device) => device.isActive)

        if (activeDevice) {
          setDeviceId(activeDevice.id)
        }
      },
      playerRooms: (rooms) => {
        set((state) => {
          state.rooms = new Map(rooms.map((room) => [room.id, room]))
        })
      },
      updateRoom: (room) => {
        set((state) => {
          state.rooms.set(room.id, room)
        })
      },
      reset: () => {
        set(initialState)
      },
    },
  }))
)
