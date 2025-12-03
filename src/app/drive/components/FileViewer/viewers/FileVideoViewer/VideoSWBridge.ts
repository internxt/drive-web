export interface VideoStreamSession {
  fileId: string;
  bucketId: string;
  fileSize: number;
}

export interface ChunkRequestPayload {
  sessionId: string;
  start: number;
  end: number;
  fileSize: number;
  requestId: string;
}

export class VideoSWBridge {
  private sessionId = crypto.randomUUID();
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private isDestroyed = false;
  private serviceWorker: ServiceWorker | null = null;

  constructor(
    private session: VideoStreamSession,
    private onChunkRequest: (request: ChunkRequestPayload) => Promise<Uint8Array>,
  ) {}

  private async waitForServiceWorker(): Promise<ServiceWorker> {
    if (navigator.serviceWorker.controller) {
      const isAlive = await this.pingServiceWorker(navigator.serviceWorker.controller);
      if (isAlive) {
        console.log('[VideoSWBridge] Existing SW controller is alive');
        return navigator.serviceWorker.controller;
      }
    }

    const registration = await navigator.serviceWorker.ready;
    console.log('[VideoSWBridge] SW ready, scope:', registration.scope);

    if (registration.active && !navigator.serviceWorker.controller) {
      console.log('[VideoSWBridge] SW active but not controller, claiming clients...');
      await this.claimClients(registration.active);

      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((resolve) => {
          const handler = () => {
            navigator.serviceWorker.removeEventListener('controllerchange', handler);
            resolve();
          };
          navigator.serviceWorker.addEventListener('controllerchange', handler);

          setTimeout(() => {
            navigator.serviceWorker.removeEventListener('controllerchange', handler);
            resolve();
          }, 2000);
        });
      }
    }

    if (registration.installing || registration.waiting) {
      console.log('[VideoSWBridge] Waiting for SW to activate...');
      const sw = registration.installing || registration.waiting;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for SW activation'));
        }, 10000);

        const checkState = () => {
          if (sw!.state === 'activated') {
            clearTimeout(timeout);
            resolve();
          }
        };

        sw!.addEventListener('statechange', checkState);
        checkState();
      });
    }

    if (navigator.serviceWorker.controller) {
      console.log('[VideoSWBridge] Controller available');
      return navigator.serviceWorker.controller;
    }

    if (registration.active) {
      console.log('[VideoSWBridge] Using registration.active as fallback');
      return registration.active;
    }

    throw new Error('No SW available');
  }

  private claimClients(sw: ServiceWorker): Promise<void> {
    return new Promise((resolve) => {
      const channel = new MessageChannel();

      const timeout = setTimeout(() => {
        console.log('[VideoSWBridge] Claim timeout, continuing anyway');
        resolve();
      }, 3000);

      channel.port1.onmessage = (event) => {
        if (event.data.type === 'CLIENTS_CLAIMED') {
          clearTimeout(timeout);
          console.log('[VideoSWBridge] Clients claimed successfully');
          resolve();
        }
      };

      sw.postMessage({ type: 'CLAIM_CLIENTS' }, [channel.port2]);
    });
  }

  private pingServiceWorker(sw: ServiceWorker): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        navigator.serviceWorker.removeEventListener('message', handler);
        resolve(false);
      }, 2000);

      const handler = (event: MessageEvent) => {
        if (event.data.type === 'PONG') {
          clearTimeout(timeout);
          navigator.serviceWorker.removeEventListener('message', handler);
          resolve(true);
        }
      };

      navigator.serviceWorker.addEventListener('message', handler);
      sw.postMessage({ type: 'PING' });
    });
  }

  async init(): Promise<void> {
    console.log('[VideoSWBridge] Initializing, sessionId:', this.sessionId);

    const sw = await this.waitForServiceWorker();
    this.serviceWorker = sw;
    console.log('[VideoSWBridge] Service Worker ready');

    if (this.isDestroyed) {
      console.log('[VideoSWBridge] Destroyed during init, aborting');
      return;
    }

    this.setupMessageListener();

    sw.postMessage({
      type: 'REGISTER_VIDEO_SESSION',
      sessionId: this.sessionId,
      fileSize: this.session.fileSize,
    });

    console.log('[VideoSWBridge] Session registered:', this.sessionId);
  }

  private setupMessageListener(): void {
    this.messageHandler = async (event: MessageEvent) => {
      if (this.isDestroyed) {
        return;
      }

      if (event.data.type !== 'CHUNK_REQUEST') {
        return;
      }

      const request = event.data.payload as ChunkRequestPayload;
      const port = event.ports[0];

      if (!port) {
        console.error('[VideoSWBridge] No port in CHUNK_REQUEST');
        return;
      }

      if (request.sessionId !== this.sessionId) {
        console.log(
          '[VideoSWBridge] Ignoring request for different session:',
          request.sessionId,
          '!= mine:',
          this.sessionId,
        );

        return;
      }

      console.log(
        '[VideoSWBridge] Processing CHUNK_REQUEST:',
        request.requestId,
        'range:',
        request.start,
        '-',
        request.end,
      );

      try {
        const data = await this.onChunkRequest(request);

        if (this.isDestroyed) {
          console.log('[VideoSWBridge] Destroyed during chunk fetch, not sending response');
          port.postMessage({
            requestId: request.requestId,
            error: 'Session destroyed',
          });
          return;
        }

        console.log('[VideoSWBridge] Sending chunk response:', data.byteLength, 'bytes');
        port.postMessage({
          requestId: request.requestId,
          data,
        });
      } catch (error) {
        console.error('[VideoSWBridge] Error fetching chunk:', error);
        port.postMessage({
          requestId: request.requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    navigator.serviceWorker.addEventListener('message', this.messageHandler);
    console.log('[VideoSWBridge] Message listener registered for session:', this.sessionId);
  }

  getVideoUrl(): string {
    return `/video-stream/${this.sessionId}`;
  }

  destroy(): void {
    console.log('[VideoSWBridge] Destroying session:', this.sessionId);
    this.isDestroyed = true;

    const sw = this.serviceWorker || navigator.serviceWorker.controller;
    if (sw) {
      sw.postMessage({
        type: 'UNREGISTER_VIDEO_SESSION',
        sessionId: this.sessionId,
      });
    }

    if (this.messageHandler) {
      navigator.serviceWorker.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }

    this.serviceWorker = null;
  }
}
