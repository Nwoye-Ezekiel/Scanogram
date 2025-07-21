import { useStore } from 'src/store'
import { lazy, Suspense } from 'react'
import { CircularProgress } from '@mui/material'
import { useWebSocket } from 'hooks/useWebSocket'
import { QueryClient, QueryClientProvider } from 'react-query'
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'

const Game = lazy(() => import('pages/game'))
// const QrCodeCracker = lazy(() => import('pages/qrcode-cracker'))
const JoinPrivateRoom = lazy(() => import('pages/qrcode-cracker/join-private-room'))
const JoinPublicRoom = lazy(() => import('pages/qrcode-cracker/join-public-room'))
const CreatePrivateRoom = lazy(() => import('pages/qrcode-cracker/create-private-room'))
const PrivateRoomLobby = lazy(() => import('pages/qrcode-cracker/private-room-lobby'))
const Splash = lazy(() => import('pages/splash'))
const PageNotFound = lazy(() => import('pages/page-not-found'))

function App() {
  useWebSocket()
  const isConnected = useStore((state) => state.isConnected)

  const queryClient = new QueryClient()

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <CircularProgress />
        <div className="mt-4 text-lg font-medium">Connecting to game server...</div>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center h-screen">
            <CircularProgress />
          </div>
        }
      >
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Splash />} />
            <Route path="game" element={<Outlet />}>
              <Route index element={<Game />} />
              <Route path="create" element={<CreatePrivateRoom />} />
              <Route path="join" element={<JoinPrivateRoom />} />
              <Route path="public" element={<JoinPublicRoom />} />
              <Route path=":roomId/lobby" element={<PrivateRoomLobby />} />
              {/* <Route path=":roomId/play" element={<QrCodeCracker />} /> */}
            </Route>
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </BrowserRouter>
      </Suspense>
    </QueryClientProvider>
  )
}

export default App
