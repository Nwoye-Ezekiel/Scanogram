import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import { setupSocketHandlers } from "./controllers/socketController";

const app = express();
const httpServer = createServer(app);

// Enable CORS
app.use(cors());
app.use(express.json());

// Initialize Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Setup socket handlers
setupSocketHandlers(io);

const PORT = process.env.PORT || 5002;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
