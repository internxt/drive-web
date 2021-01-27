import io from 'socket.io-client';
export const socket = io(process.env.NODE_ENV === 'production' ? '' : 'localhost:8000', {
    path: '/api/sockets'
});