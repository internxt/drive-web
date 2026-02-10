import io, { Socket } from 'socket.io-client';
import localStorageService from '../local-storage.service';
import envService from '../env.service';
import { SocketNotConnectedError } from './errors/socket.errors';
import { EventData } from './types/socket.types';

export default class RealtimeService {
  private socket?: Socket;
  private static instance: RealtimeService;
  private readonly eventHandlers: Set<(data: EventData) => void> = new Set();

  static getInstance(): RealtimeService {
    if (!this.instance) {
      this.instance = new RealtimeService();
    }

    return this.instance;
  }

  init(onConnected?: () => void): void {
    if (!envService.isProduction()) {
      console.log('[REALTIME]: CONNECTING...');
    }

    this.socket = io(envService.getVariable('notifications'), {
      auth: {
        token: getToken(),
      },
      reconnection: true,
      withCredentials: envService.isProduction(),
    });

    this.socket.on('connect', () => {
      if (!envService.isProduction()) {
        console.log('[REALTIME]: CONNECTED WITH ID', this.socket?.id);
      }
      onConnected?.();
    });

    this.socket.on('event', (data) => {
      if (!envService.isProduction()) {
        console.log('[REALTIME] EVENT RECEIVED:', JSON.stringify(data, null, 2));
      }

      this.eventHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error('[REALTIME] Error in event handler:', error);
        }
      });
    });

    this.socket.on('disconnect', (reason) => {
      if (!envService.isProduction()) {
        console.log('[REALTIME] DISCONNECTED:', reason);
      }
    });

    this.socket.on('connect_error', (error) => {
      if (!envService.isProduction()) console.error('[REALTIME] CONNECTION ERROR:', error);
    });
  }

  getClientId(): string | undefined {
    if (!this.socket) {
      throw new SocketNotConnectedError();
    }
    return this.socket.id;
  }

  onEvent(cb: (data: any) => void): () => void {
    if (!envService.isProduction()) {
      console.log('[REALTIME] Registering event handler. Total handlers:', this.eventHandlers.size + 1);
    }

    this.eventHandlers.add(cb);

    return () => {
      if (!envService.isProduction()) {
        console.log('[REALTIME] Removing event handler. Remaining handlers:', this.eventHandlers.size - 1);
      }
      this.eventHandlers.delete(cb);
    };
  }

  removeAllListeners() {
    if (!envService.isProduction()) {
      console.log('[REALTIME] Clearing all event handlers');
    }
    this.eventHandlers.clear();
  }

  stop(): void {
    console.log('[REALTIME] STOPING...');

    if (this.socket?.connected) {
      console.log('[REALTIME] SOCKET CLOSED.');
      this.socket.close();
    }
  }
}

function getToken(): string {
  return localStorageService.get('xNewToken') as string;
}
