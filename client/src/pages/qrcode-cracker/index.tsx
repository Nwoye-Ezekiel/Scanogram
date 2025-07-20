import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Socket } from 'socket.io-client'

interface Position {
  x: number
  y: number
}

interface Velocity {
  x: number
  y: number
}

interface Wall {
  x: number
  y: number
  width: number
  height: number
}

interface Cell {
  walls: boolean[]
  visited: boolean
}

interface JoystickInput {
  x: number
  y: number
}

// Optimized player state for network synchronization
interface NetworkPlayerState {
  position: Position
  velocity: Velocity
  timestamp: number
}

class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 2 ** 32
    return this.seed / 2 ** 32
  }

  getSeed(): number {
    return this.seed
  }
}

class MazeGenerator {
  width: number
  height: number
  cellSize: number
  grid: Cell[][]
  private rng: SeededRandom
  private originalSeed: number

  constructor(width: number, height: number, cellSize: number, seed?: number) {
    this.width = width
    this.height = height
    this.cellSize = cellSize
    this.grid = []
    this.originalSeed = seed ?? Math.floor(Math.random() * 1000000)
    this.rng = new SeededRandom(this.originalSeed)
    this.initializeGrid()
  }

  setSeed(seed: number) {
    this.originalSeed = seed
    this.rng = new SeededRandom(seed)
    this.grid = []
    this.initializeGrid()
  }

  getSeed(): number {
    return this.originalSeed
  }

  initializeGrid() {
    for (let y = 0; y < this.height; y++) {
      this.grid[y] = []
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = { walls: [true, true, true, true], visited: false }
      }
    }
  }

  generate(startX: number, startY: number) {
    this.rng = new SeededRandom(this.originalSeed)

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x].visited = false
        this.grid[y][x].walls = [true, true, true, true]
      }
    }

    this.grid[startY][startX].visited = true
    const stack: number[][] = [[startX, startY]]
    const directions = [
      [0, -1], // up
      [1, 0], // right
      [0, 1], // down
      [-1, 0], // left
    ]

    while (stack.length > 0) {
      const [x, y] = stack.pop()!
      const neighbors: number[][] = []

      for (let i = 0; i < directions.length; i++) {
        const [dx, dy] = directions[i]
        const nx = x + dx
        const ny = y + dy

        if (
          nx >= 0 &&
          nx < this.width &&
          ny >= 0 &&
          ny < this.height &&
          !this.grid[ny][nx].visited
        ) {
          neighbors.push([nx, ny, i])
        }
      }

      if (neighbors.length > 0) {
        stack.push([x, y])
        const randomIndex = Math.floor(this.rng.next() * neighbors.length)
        const [nx, ny, dir] = neighbors[randomIndex]

        this.grid[y][x].walls[dir] = false
        this.grid[ny][nx].walls[(dir + 2) % 4] = false
        this.grid[ny][nx].visited = true
        stack.push([nx, ny])
      }
    }
  }

  getWalls(): Wall[] {
    const walls: Wall[] = []
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid[y][x]
        if (cell.walls[0]) {
          walls.push({
            x: x * this.cellSize,
            y: y * this.cellSize,
            width: this.cellSize,
            height: 2,
          })
        }
        if (cell.walls[1]) {
          walls.push({
            x: (x + 1) * this.cellSize,
            y: y * this.cellSize,
            width: 2,
            height: this.cellSize,
          })
        }
        if (cell.walls[2]) {
          walls.push({
            x: x * this.cellSize,
            y: (y + 1) * this.cellSize,
            width: this.cellSize,
            height: 2,
          })
        }
        if (cell.walls[3]) {
          walls.push({
            x: x * this.cellSize,
            y: y * this.cellSize,
            width: 2,
            height: this.cellSize,
          })
        }
      }
    }
    return walls
  }
}

const QrCodeCracker = ({ socket, roomCode }: { socket: Socket; roomCode: string }) => {
  const [position, setPosition] = useState<Position>({ x: 20, y: 20 })
  const [velocity, setVelocity] = useState<Velocity>({ x: 0, y: 0 })
  const [gameStatus, setGameStatus] = useState('Navigate to the green finish line!')
  const [winner, setWinner] = useState<string | null>(null)
  const [joystickInput, setJoystickInput] = useState<JoystickInput>({ x: 0, y: 0 })
  const [currentSeed] = useState<number>(133)
  const [networkPlayers, setNetworkPlayers] = useState<Map<string, NetworkPlayerState>>(new Map())

  const gameContainerRef = useRef<HTMLDivElement>(null)
  const joystickHandleRef = useRef<HTMLDivElement>(null)
  const joystickContainerRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number>()
  const isDraggingRef = useRef(false)
  const joystickCenterRef = useRef<Position>({ x: 0, y: 0 })

  // Network optimization refs
  const lastEmitTime = useRef<number>(0)
  const lastEmittedPosition = useRef<Position>({ x: 20, y: 20 })
  const lastEmittedVelocity = useRef<Velocity>({ x: 0, y: 0 })
  const pendingEmit = useRef<boolean>(false)

  const cellSize = 40
  const mazeWidth = 20
  const mazeHeight = 15
  const maxSpeed = 3
  const maxDistance = 40

  // Network optimization constants
  const EMIT_RATE_MS = 1000 / 60 // 30 FPS for network updates
  const POSITION_THRESHOLD = 1 // Only emit if moved more than 1 pixel
  const VELOCITY_THRESHOLD = 0.1 // Only emit if velocity changed significantly

  const maze = useRef(new MazeGenerator(mazeWidth, mazeHeight, cellSize, currentSeed))
  const obstacles = useRef<Wall[]>([])
  const finishLine = useRef<Position>({
    x: (mazeWidth - 1) * cellSize + cellSize / 2,
    y: (mazeHeight - 1) * cellSize + cellSize / 2,
  })

  const boundaries = {
    left: 0,
    top: 0,
    right: 800 - 20,
    bottom: 600 - 20,
  }

  const generatePlayerId = () => 'player_' + Math.random().toString(36).substr(2, 9)
  const playerId = useRef(generatePlayerId())

  // Initialize maze
  useEffect(() => {
    maze.current.generate(0, 0)
    obstacles.current = maze.current.getWalls()
  }, [currentSeed])

  // Socket event listeners for real-time updates
  useEffect(() => {
    const handlePlayerUpdate = (data: { playerId: string; state: NetworkPlayerState }) => {
      setNetworkPlayers((prev) => {
        const updated = new Map(prev)
        updated.set(data.playerId, data.state)
        return updated
      })
    }

    const handlePlayerDisconnect = (data: { playerId: string }) => {
      setNetworkPlayers((prev) => {
        const updated = new Map(prev)
        updated.delete(data.playerId)
        return updated
      })
    }

    socket.on('playerUpdate', handlePlayerUpdate)
    socket.on('playerDisconnect', handlePlayerDisconnect)

    return () => {
      socket.off('playerUpdate', handlePlayerUpdate)
      socket.off('playerDisconnect', handlePlayerDisconnect)
    }
  }, [socket])

  const isColliding = (rect1: Wall, rect2: Wall): boolean => {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    )
  }

  const canMoveTo = (newPos: Position): boolean => {
    if (
      newPos.x < boundaries.left ||
      newPos.x > boundaries.right ||
      newPos.y < boundaries.top ||
      newPos.y > boundaries.bottom
    ) {
      return false
    }

    const playerRect: Wall = {
      x: newPos.x,
      y: newPos.y,
      width: 20,
      height: 20,
    }

    for (const obstacle of obstacles.current) {
      if (isColliding(playerRect, obstacle)) {
        return false
      }
    }

    return true
  }

  const calculateMovementWithSliding = (pos: Position, vel: Velocity): Position => {
    const newX = pos.x + vel.x
    const newY = pos.y + vel.y
    const fullMovement = { x: newX, y: newY }

    if (canMoveTo(fullMovement)) {
      return fullMovement
    }

    const xOnlyMovement = { x: newX, y: pos.y }
    const canMoveX = canMoveTo(xOnlyMovement)
    const yOnlyMovement = { x: pos.x, y: newY }
    const canMoveY = canMoveTo(yOnlyMovement)

    if (canMoveX && canMoveY) {
      return Math.abs(vel.x) > Math.abs(vel.y) ? xOnlyMovement : yOnlyMovement
    }

    if (canMoveX) return xOnlyMovement
    if (canMoveY) return yOnlyMovement

    const steps = 5
    let bestPosition = { x: pos.x, y: pos.y }

    for (let i = steps; i > 0; i--) {
      const factor = i / steps
      const testX = pos.x + vel.x * factor
      const testY = pos.y + vel.y * factor

      const scaledMovement = { x: testX, y: testY }
      if (canMoveTo(scaledMovement)) {
        return scaledMovement
      }

      const scaledXMovement = { x: testX, y: pos.y }
      if (canMoveTo(scaledXMovement)) {
        bestPosition = scaledXMovement
      }

      const scaledYMovement = { x: pos.x, y: testY }
      if (canMoveTo(scaledYMovement)) {
        bestPosition = scaledYMovement
      }
    }

    return bestPosition
  }

  const checkFinishLine = (pos: Position): boolean => {
    const dx = pos.x - finishLine.current.x
    const dy = pos.y - finishLine.current.y
    return Math.sqrt(dx * dx + dy * dy) < 20
  }

  // Optimized network emission with throttling and delta compression
  const emitPlayerUpdate = useCallback(
    (newPosition: Position, newVelocity: Velocity) => {
      const now = Date.now()

      // Check if enough time has passed since last emit
      if (now - lastEmitTime.current < EMIT_RATE_MS) {
        pendingEmit.current = true
        return
      }

      // Check if position or velocity changed significantly
      const positionDelta = Math.sqrt(
        Math.pow(newPosition.x - lastEmittedPosition.current.x, 2) +
          Math.pow(newPosition.y - lastEmittedPosition.current.y, 2)
      )

      const velocityDelta = Math.sqrt(
        Math.pow(newVelocity.x - lastEmittedVelocity.current.x, 2) +
          Math.pow(newVelocity.y - lastEmittedVelocity.current.y, 2)
      )

      if (positionDelta < POSITION_THRESHOLD && velocityDelta < VELOCITY_THRESHOLD) {
        return
      }

      // Emit the update
      const playerState: NetworkPlayerState = {
        position: newPosition,
        velocity: newVelocity,
        timestamp: now,
      }

      socket.emit('playerUpdate', {
        roomCode,
        playerId: playerId.current,
        state: playerState,
      })

      // Update last emit tracking
      lastEmitTime.current = now
      lastEmittedPosition.current = { ...newPosition }
      lastEmittedVelocity.current = { ...newVelocity }
      pendingEmit.current = false
    },
    [EMIT_RATE_MS, socket, roomCode]
  )

  // Separate throttled emit function for pending updates
  useEffect(() => {
    const emitPendingUpdate = () => {
      if (pendingEmit.current) {
        emitPlayerUpdate(position, velocity)
      }
    }

    const interval = setInterval(emitPendingUpdate, EMIT_RATE_MS)
    return () => clearInterval(interval)
  }, [EMIT_RATE_MS, emitPlayerUpdate, position, velocity])

  // Client-side prediction for other players
  const interpolatePlayerPosition = (playerState: NetworkPlayerState): Position => {
    const now = Date.now()
    const timeDelta = (now - playerState.timestamp) / 1000 // Convert to seconds

    // Predict position based on last known velocity
    return {
      x: playerState.position.x + playerState.velocity.x * timeDelta * 60, // Assuming 60 FPS
      y: playerState.position.y + playerState.velocity.y * timeDelta * 60,
    }
  }

  // Main game loop with optimized network updates
  useEffect(() => {
    const gameLoop = () => {
      const newVelocity: Velocity = {
        x: joystickInput.x * maxSpeed,
        y: joystickInput.y * maxSpeed,
      }

      const newPosition = calculateMovementWithSliding(position, newVelocity)

      // Update local state
      if (newPosition.x !== position.x || newPosition.y !== position.y) {
        setPosition(newPosition)
      }

      if (newVelocity.x !== velocity.x || newVelocity.y !== velocity.y) {
        setVelocity(newVelocity)
      }

      // Emit network update (with built-in throttling)
      emitPlayerUpdate(newPosition, newVelocity)

      // Check win condition
      if (checkFinishLine(newPosition) && !winner) {
        setWinner(playerId.current)
        setGameStatus('You won the race!')
        socket.emit('gameWon', { roomCode, playerId: playerId.current })
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [
    joystickInput,
    position,
    velocity,
    winner,
    emitPlayerUpdate,
    calculateMovementWithSliding,
    socket,
    roomCode,
  ])

  // Joystick handlers
  const updateJoystickCenter = useCallback(() => {
    if (joystickContainerRef.current) {
      const rect = joystickContainerRef.current.getBoundingClientRect()
      joystickCenterRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      }
    }
  }, [])

  useEffect(() => {
    updateJoystickCenter()
    window.addEventListener('resize', updateJoystickCenter)
    return () => window.removeEventListener('resize', updateJoystickCenter)
  }, [updateJoystickCenter])

  const handleJoystickStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    if (joystickHandleRef.current) {
      joystickHandleRef.current.style.transition = 'none'
    }
  }

  const handleJoystickMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingRef.current || !joystickHandleRef.current) return

    e.preventDefault()

    const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX
    const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY

    const deltaX = clientX - joystickCenterRef.current.x
    const deltaY = clientY - joystickCenterRef.current.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    let x = deltaX
    let y = deltaY

    if (distance > maxDistance) {
      const angle = Math.atan2(deltaY, deltaX)
      x = Math.cos(angle) * maxDistance
      y = Math.sin(angle) * maxDistance
    }

    joystickHandleRef.current.style.transform = `translate(${x}px, ${y}px)`
    setJoystickInput({
      x: x / maxDistance,
      y: y / maxDistance,
    })
  }, [])

  const handleJoystickEnd = useCallback(() => {
    if (!isDraggingRef.current) return

    isDraggingRef.current = false
    if (joystickHandleRef.current) {
      joystickHandleRef.current.style.transition = 'transform 0.2s ease'
      joystickHandleRef.current.style.transform = 'translate(0px, 0px)'
    }
    setJoystickInput({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    document.addEventListener('mousemove', handleJoystickMove)
    document.addEventListener('mouseup', handleJoystickEnd)
    document.addEventListener('touchmove', handleJoystickMove, { passive: false })
    document.addEventListener('touchend', handleJoystickEnd)

    return () => {
      document.removeEventListener('mousemove', handleJoystickMove)
      document.removeEventListener('mouseup', handleJoystickEnd)
      document.removeEventListener('touchmove', handleJoystickMove)
      document.removeEventListener('touchend', handleJoystickEnd)
    }
  }, [handleJoystickMove, handleJoystickEnd])

  return (
    <div className="m-0 p-5 font-sans bg-slate-900 text-white overflow-hidden min-h-screen">
      {/* Info Panel */}
      <div className="fixed top-5 left-5 bg-black bg-opacity-70 p-4 rounded-lg text-sm leading-relaxed">
        <div>
          Position: {Math.round(position.x)}, {Math.round(position.y)}
        </div>
        <div>
          Velocity: {velocity.x.toFixed(1)}, {velocity.y.toFixed(1)}
        </div>
        <div>Players Online: {networkPlayers.size + 1}</div>
        <div>Status: {gameStatus}</div>
        <div className="mt-2">
          <strong>Seed: {currentSeed}</strong>
        </div>
        <div className="text-xs mt-1 opacity-70">
          Network Rate: {Math.round(1000 / EMIT_RATE_MS)} FPS
        </div>
      </div>

      {/* Game Container */}
      <div
        ref={gameContainerRef}
        className="relative w-[800px] h-[600px] bg-slate-800 border-4 border-slate-700 mx-auto rounded-xl overflow-hidden"
      >
        {/* Maze Walls */}
        {obstacles.current.map((wall, index) => (
          <div
            key={index}
            className="absolute bg-purple-600"
            style={{
              left: `${wall.x}px`,
              top: `${wall.y}px`,
              width: `${wall.width}px`,
              height: `${wall.height}px`,
            }}
          />
        ))}

        {/* Finish Line */}
        <div
          className="absolute w-5 h-5 bg-green-500 rounded-full z-10"
          style={{
            left: `${finishLine.current.x - 10}px`,
            top: `${finishLine.current.y - 10}px`,
          }}
        />

        {/* Main Player */}
        <div
          className="absolute w-5 h-5 bg-red-500 rounded-full z-20 transition-none"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
        />

        {/* Network Players with Client-side Prediction */}
        {Array.from(networkPlayers.entries()).map(([playerId, playerState]) => {
          const predictedPosition = interpolatePlayerPosition(playerState)
          return (
            <div
              key={playerId}
              className="absolute w-5 h-5 bg-blue-600 rounded-full z-20"
              style={{
                left: `${predictedPosition.x}px`,
                top: `${predictedPosition.y}px`,
                transition: 'all 0.1s linear', // Smooth interpolation
              }}
            />
          )
        })}
      </div>

      {/* Joystick */}
      <div
        ref={joystickContainerRef}
        className="fixed bottom-12 right-12 w-32 h-32 bg-white bg-opacity-10 border-4 border-white border-opacity-30 rounded-full flex items-center justify-center"
        style={{ touchAction: 'none' }}
      >
        <div
          ref={joystickHandleRef}
          className="w-10 h-10 bg-red-500 rounded-full cursor-grab relative transition-transform duration-100 ease-out active:cursor-grabbing"
          style={{ touchAction: 'none' }}
          onMouseDown={handleJoystickStart}
          onTouchStart={handleJoystickStart}
        />
      </div>
    </div>
  )
}

export default QrCodeCracker
