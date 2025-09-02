import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";

export function useSocket() {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect if not authenticated
      if (socket) {
        disconnectSocket();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Connect socket
    const ws = connectSocket(user.id);
    setSocket(ws);

    const handleOpen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };

    const handleClose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    };

    const handleError = (error: Event) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.addEventListener('open', handleOpen);
    ws.addEventListener('close', handleClose);
    ws.addEventListener('error', handleError);

    return () => {
      ws.removeEventListener('open', handleOpen);
      ws.removeEventListener('close', handleClose);
      ws.removeEventListener('error', handleError);
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuthenticated, user]);

  return {
    socket: socket || getSocket(),
    isConnected,
  };
}
