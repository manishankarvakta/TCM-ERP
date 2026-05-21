import { Server } from "socket.io";
import { createServer } from "http";
import Redis from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import dotenv from "dotenv";

dotenv.config();

const PORT = parseInt(process.env.SOCKET_PORT || "3001", 10);
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Initialize standard HTTP Server
const httpServer = createServer();

// Initialize Socket.IO with strict CORS for Next.js App
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Configure Redis Adapter for Horizontal Scaling
const pubClient = new Redis(REDIS_URL);
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));

// Dedicated Redis Subscriber for Next.js Server Action Events
const eventSubscriber = new Redis(REDIS_URL);

eventSubscriber.subscribe("realtime-events", (err, count) => {
  if (err) {
    console.error("[Socket] Failed to subscribe to realtime-events:", err);
    return;
  }
  console.log(`[Socket] Subscribed to realtime-events. Active channels: ${count}`);
});

eventSubscriber.on("message", (channel, message) => {
  if (channel === "realtime-events") {
    try {
      const { room, event, data } = JSON.parse(message);
      // Broadcast the event to the specific room
      io.to(room).emit(event, data);
    } catch (e) {
      console.error("[Socket] Failed to parse Redis message:", e);
    }
  }
});

io.on("connection", (socket) => {
  const userId = socket.handshake.auth.userId;

  if (!userId) {
    console.warn("[Socket] Connection rejected: No user ID");
    return socket.disconnect(true);
  }

  // Automatically join the user's personal notification room
  const userRoom = `user:${userId}`;
  socket.join(userRoom);
  console.log(`[Socket] Client connected: ${socket.id} (User: ${userId})`);

  // Handle explicit room joins (e.g., Project Workspace)
  socket.on("join_room", (payload) => {
    const { room } = payload;
    if (room) {
      socket.join(room);
      console.log(`[Socket] Client ${socket.id} joined ${room}`);
      
      // Handle presence broadcasting
      if (room.startsWith("entity:project:")) {
         io.to(room).emit("presence_update", { userId, action: "joined" });
      }
    }
  });

  socket.on("leave_room", (payload) => {
    const { room } = payload;
    if (room) {
      socket.leave(room);
      console.log(`[Socket] Client ${socket.id} left ${room}`);
      
      if (room.startsWith("entity:project:")) {
         io.to(room).emit("presence_update", { userId, action: "left" });
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    // Presence cleanup handled natively by Socket.IO room disconnects
  });
});

// Start Server
httpServer.listen(PORT, () => {
  console.log(`[Socket] Engine running horizontally scaled on port ${PORT}`);
  console.log(`[Socket] Redis Adapter synced with: ${REDIS_URL}`);
});
