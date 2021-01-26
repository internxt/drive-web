import io from 'socket.io-client';
export const socket = io(process.env.NODE_ENV === 'production' ? process.env.REACT_APP_API_URL : 'localhost:8000', {
    path: '/api/sockets'
});