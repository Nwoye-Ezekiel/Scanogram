# Logic Duel Backend

A real-time multiplayer code-breaking game backend built with Node.js, Express, and Socket.IO.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd logic-duel-backend
```

2. Install dependencies:

```bash
npm install
```

## Development

To run the server in development mode with hot-reload:

```bash
npm run dev
```

## Production

1. Build the TypeScript code:

```bash
npm run build
```

2. Start the server:

```bash
npm start
```

The server will run on `http://localhost:3000` by default.

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /stats` - Get online and waiting player counts

## Socket.IO Events

### Client to Server

- `setIdentity` - Set player name and country
- `createPrivateRoom` - Create a new private room
- `joinPrivateRoom` - Join an existing private room
- `startGame` - Start the game (admin only)
- `pauseGame` - Pause the game
- `resumeGame` - Resume the game
- `setSecretNumber` - Set your secret number
- `makeGuess` - Make a guess
- `sendMessage` - Send a chat message
- `transferAdmin` - Transfer admin rights
- `toggleMute` - Toggle chat mute
- `updateGameSettings` - Update room settings
- `quitGame` - Leave the current room

### Server to Client

- `error` - Error message
- `roomCreated` - Room creation confirmation
- `roomJoined` - Room join confirmation
- `playerJoined` - New player joined notification
- `playerLeft` - Player left notification
- `gameStateUpdate` - Game state update
- `gamePaused` - Game paused notification
- `gameResumed` - Game resumed notification
- `gameOver` - Game over notification
- `chatMessage` - New chat message
- `adminChanged` - Admin rights transferred
- `playerMuted` - Player muted notification
- `playerUnmuted` - Player unmuted notification
# zeegames-backend
