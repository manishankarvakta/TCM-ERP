"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

interface SocketOptions {
  onTaskUpdated?: (data: any) => void;
  onTaskMoved?: (data: any) => void;
  onProjectUpdated?: (data: any) => void;
  onPresenceUpdate?: (data: any) => void;
}

/**
 * Optimized Client Hook for Enterprise Realtime Integration
 * Safely manages WebSocket handshakes, reconnects, and collaborative presence.
 */
export function useProjectSocket(projectId: string, options?: SocketOptions) {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);

  useEffect(() => {
    // Prevent anonymous connections to secure the socket server
    if (!session?.user?.id || !projectId) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    
    // In production, if NEXT_PUBLIC_SOCKET_URL is not set, avoid connecting to localhost
    if (!socketUrl && typeof window !== "undefined" && window.location.hostname !== "localhost") {
      console.warn("[Socket] NEXT_PUBLIC_SOCKET_URL is not set. Realtime features are disabled on production.");
      return;
    }

    const finalSocketUrl = socketUrl || "http://localhost:3001";
    
    // Handshake passes userId for Backend Validation
    const socket = io(finalSocketUrl, {
      auth: { userId: session.user.id },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      // Confine listening strictly to this specific project's data
      socket.emit("join_room", { room: `entity:project:${projectId}` });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    // --- EVENT LISTENERS (Strictly Read-Only) ---

    socket.on("TASK_UPDATED", (data) => {
      // Allows UI to instantly patch local React Query / Zustand state
      options?.onTaskUpdated?.(data);
    });

    socket.on("TASK_MOVED", (data) => {
      // Optimized specifically for smooth Kanban drag-and-drop syncing
      options?.onTaskMoved?.(data);
    });

    socket.on("PROJECT_UPDATED", (data) => {
      // Allows macroscopic dashboard refreshes on workflow changes
      options?.onProjectUpdated?.(data);
    });

    // Realtime Presence / Collaborative Cursor tracking foundation
    socket.on("presence_update", (data: { userId: string, action: string }) => {
      setActiveUsers(prev => {
        if (data.action === "joined" && !prev.includes(data.userId)) {
            return [...prev, data.userId];
        }
        if (data.action === "left") {
            return prev.filter(id => id !== data.userId);
        }
        return prev;
      });
      options?.onPresenceUpdate?.(data);
    });

    return () => {
      // Ensure graceful cleanup to prevent memory leaks in the browser
      socket.emit("leave_room", { room: `entity:project:${projectId}` });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId, session?.user?.id, options]);

  return { 
      isConnected, 
      activeUsers, 
      activeUserCount: activeUsers.length 
  };
}
