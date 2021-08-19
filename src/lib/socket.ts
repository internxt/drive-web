import io from 'socket.io-client';
import envService from '../services/env.service';

export const socket = io(envService.isProduction() ? '' : 'http://localhost:8000', {
  transports: ['websocket'],
  upgrade: false,
  path: '/api/sockets'
});