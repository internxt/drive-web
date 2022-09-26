import io, { Socket } from 'socket.io-client';
import localStorageService from './local-storage.service';

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
      withCredentials: true
    });

    this.socket.io.on('open', () => {
      this.socket?.io.engine.transport.on('pollComplete', () => {
        const request = this.socket?.io.engine.transport.pollXhr.xhr;
        const cookieHeader = request.getResponseHeader('set-cookie');
        if (!cookieHeader) {
          return;
        }
        cookieHeader.forEach((cookieString: string) => {
          if (cookieString.includes('INGRESSCOOKIE=')) {
            const cookie = cookieString.split(';')[0];
            if (this.socket) {
              this.socket.io.opts.extraHeaders = {
                cookie,
              };
            }
          }
        });
      });
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
      if (!isProduction())
        console.error('[REALTIME] CONNECTION ERROR:', error);
    });
  }

  getClientId(): string {
    if (!this.socket) {
      throw new Error('Realtime service is not connected');
    }
    return this.socket.id;
  }

  onEvent(cb: (data: any) => void): void {
    if (this.socket?.disconnected) {
      return console.log('[REALTIME] SOCKET IS DISCONNECTED');
    }

    this.socket?.on('event', (data) => {
      if (!isProduction()) {
        console.log('[REALTIME] EVENT RECEIVED:', JSON.stringify(data, null, 2));
      }

      cb(data);
    });
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
