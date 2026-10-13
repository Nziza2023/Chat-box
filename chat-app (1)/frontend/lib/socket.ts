import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;

// We keep exactly ONE socket connection for the whole app (not one per
// component) and share it everywhere via this function. Creating a new
// connection every time a component mounted would quickly open dozens of
// redundant connections to the server.
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: { token: getAccessToken() },
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  // Refresh the token used for this connection attempt in case it changed
  s.auth = { token: getAccessToken() };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
}
