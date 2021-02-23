import io from 'socket.io-client';
export const socket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000', {
  transports: ['websocket'],
  upgrade: false,
  path: '/api/sockets'
});