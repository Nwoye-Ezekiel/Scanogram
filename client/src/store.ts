import { create } from 'zustand'
import { Socket } from 'socket.io-client'
import { Player, Room } from 'shared/types'
import { immer } from 'zustand/middleware/immer'

interface InitialState {
  // Initial state properties
  error: string
  isLoading: boolean
  isConnected: boolean
  socket: Socket | null

  // Player and room state
  player: Player | null

  // Game statistics
  totalRooms: number
  totalPlayers: number
  totalActiveGames: number
}

// Store state type
interface State extends InitialState {}

// Store actions type
type Actions = {
  actions: {
    reset: () => void
    updateRoom: (room: Room) => void
    setError: (error: string) => void
    updatePlayer: (player: Player) => void
    setIsLoading: (isLoading: boolean) => void
    setIsConnected: (isConnected: boolean) => void
    setSocket: (socket: Socket | null) => void
    setGameStats: (gameStats: {
      totalRooms: number
      totalPlayers: number
      totalActiveGames: number
    }) => void
  }
}

// Initial state
const initialState: InitialState = {
  error: '',
  totalRooms: 0,
  player: null,
  isLoading: true,
  isConnected: false,
  totalPlayers: 0,
  totalActiveGames: 0,
  socket: null,
}

// Create the store
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
          state.totalActiveGames = gameStats.totalActiveGames
        })
      },
      setSocket: (socket) => {
        set((state) => {
          ;(state as any).socket = socket
        })
      },
      updatePlayer: (player: Player) => {
        set((state) => {
          state.player = player
        })
      },
      updateRoom: (room: Room) => {
        set((state) => {
          if (state.player) {
            state.player = {
              ...state.player,
              room: room,
            }
          }
        })
      },
      reset: () => {
        set(initialState)
      },
    },
  }))
)
