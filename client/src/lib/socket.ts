let socket: WebSocket | null = null;

export function connectSocket(userId: string): WebSocket {
  if (socket && socket.readyState === WebSocket.OPEN) {
    return socket;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws?userId=${userId}`;
  
  socket = new WebSocket(wsUrl);
  
  socket.addEventListener('open', () => {
    console.log('WebSocket connection established');
  });

  socket.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
  });

  socket.addEventListener('close', (event) => {
    console.log('WebSocket connection closed:', event.code, event.reason);
    socket = null;
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close();
  }
  socket = null;
}

export function getSocket(): WebSocket | null {
  return socket;
}

export function sendMessage(message: any): void {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    console.warn('WebSocket is not connected. Cannot send message:', message);
  }
}
