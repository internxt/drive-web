import io, { Socket } from 'socket.io-client';
import localStorageService from '../local-storage.service';
import envService from '../env.service';
import { LocalStorageItem } from 'app/core/types';

import type { EventHandler } from './event-handler.service';

export default class RealtimeService {
  private socket?: Socket;
  private static instance: RealtimeService;
  private readonly isProduction = envService.isProduction();

  static getInstance(): RealtimeService {
    if (!this.instance) {
      this.instance = new RealtimeService();
    }

    return this.instance;
  }

  init(eventHandler: EventHandler, onConnected?: () => void): void {
    if (this.socket?.connected || this.socket?.active) return;

    if (!this.isProduction) {
      console.log('[REALTIME]: CONNECTING...');
    }

    const notificationsUrl = envService.getVariable('notifications');

    this.socket = io(notificationsUrl, {
      auth: {
        token: getToken(),
      },
      reconnection: this.isProduction,
      withCredentials: this.isProduction,
    });

    this.socket.on('connect', () => {
      console.log('[REALTIME]: CONNECTED WITH ID', this.socket?.id);
      onConnected?.();
    });

    this.socket.on('event', (data) => {
      console.log('[REALTIME] EVENT RECEIVED:', JSON.stringify(data, null, 2));

      eventHandler.handleEvent(data);
    });

    this.socket.on('disconnect', (reason) => {
      if (!this.isProduction) {
        console.log('[REALTIME] DISCONNECTED:', reason);
      }
    });

    this.socket.on('connect_error', (error) => {
      if (error.message.includes('ID unknown')) {
        this.socket?.disconnect();
        this.socket?.connect();
      }
      if (!this.isProduction) console.error('[REALTIME] CONNECTION ERROR:', error);
    });
  }

  stop(): void {
    console.log('[REALTIME] STOPPING...');

    if (this.socket?.connected) {
      console.log('[REALTIME] SOCKET CLOSED.');
      this.socket.disconnect();
    }
  }
}

function getToken(): string {
  return localStorageService.get(LocalStorageItem.NewToken) as string;
}
