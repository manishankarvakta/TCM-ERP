"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io as ClientIO, Socket } from "socket.io-client";

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children, userId }: { children: React.ReactNode; userId?: string }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Only connect if the user is authenticated
    if (!userId) {
        if (socket) {
            socket.disconnect();
            setSocket(null);
            setIsConnected(false);
        }
        return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    
    // In production, if NEXT_PUBLIC_SOCKET_URL is not set, avoid connecting to localhost
    if (!socketUrl && typeof window !== "undefined" && window.location.hostname !== "localhost") {
      console.warn("[Socket] NEXT_PUBLIC_SOCKET_URL is not set. Realtime features are disabled on production.");
      return;
    }

    const finalSocketUrl = socketUrl || "http://localhost:3001";
    
    // Instantiate Socket Client
    const socketInstance = ClientIO(finalSocketUrl, {
      auth: {
        userId: userId,
      },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketInstance.on("connect", () => {
      console.log("[Socket] Connected to realtime engine");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("[Socket] Disconnected from realtime engine");
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [userId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
