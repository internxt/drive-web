import io from 'socket.io-client';
export const socket = io(process.env.REACT_APP_API_URL, {
  transports: ['websocket'],
  upgrade: false,
  path: '/api/sockets',
});
