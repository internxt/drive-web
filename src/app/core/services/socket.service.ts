import io, { Socket } from 'socket.io-client';
import localStorageService from './local-storage.service';

export const SOCKET_EVENTS = {
  FILE_CREATED: 'FILE_CREATED',
};

export default class RealtimeService {
  private socket?: Socket;
  private static instance: RealtimeService;

  static getInstance(): RealtimeService {
    if (!this.instance) {
      this.instance = new RealtimeService();
    }

    return this.instance;
  }

  init(onConnected?: () => void): void {
    if (!isProduction()) {
      console.log('[REALTIME]: CONNECTING...');
    }

    this.socket = io(process.env.REACT_APP_NOTIFICATIONS_URL, {
      auth: {
        token: getToken(),
      },
      reconnection: isProduction(),
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      if (!isProduction()) {
        console.log('[REALTIME]: CONNECTED WITH ID', this.socket?.id);
      }

      onConnected?.();
    });

    this.socket.on('disconnect', (reason) => {
      if (!isProduction()) {
        console.log('[REALTIME] DISCONNECTED:', reason);
      }
    });

    this.socket.on('connect_error', (error) => {
      if (!isProduction()) console.error('[REALTIME] CONNECTION ERROR:', error);
    });
  }

  getClientId(): string | undefined {
    if (!this.socket) {
      throw new Error('Realtime service is not connected');
    }
    return this.socket.id;
  }

  onEvent(cb: (data: any) => void): boolean {
    if (this.socket?.disconnected) {
      console.log('[REALTIME] SOCKET IS DISCONNECTED');
      return false;
    }

    this.socket?.on('event', (data) => {
      if (!isProduction()) {
        console.log('[REALTIME] EVENT RECEIVED:', JSON.stringify(data, null, 2));
      }

      cb(data);
    });
    return true;
  }

  removeAllListeners() {
    this.socket?.removeAllListeners();
  }

  stop(): void {
    console.log('[REALTIME] STOPING...');

    if (this.socket && this.socket?.connected) {
      console.log('[REALTIME] SOCKET CLOSED.');
      this.socket?.close();
    }
  }
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function getToken(): string {
  return localStorageService.get('xNewToken') as string;
}
