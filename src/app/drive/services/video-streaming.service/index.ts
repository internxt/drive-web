export interface VideoStreamSession {
  fileSize: number;
  mimeType: string;
}

export interface ChunkRequestPayload {
  sessionId: string;
  requestId: string;
  start: number;
  end: number;
  fileSize: number;
}

const DEFAULT_TIMEOUT = 5000;

export class VideoStreamingService {
  private readonly sessionId = crypto.randomUUID();
  private messageHandler: ((event: MessageEvent) => void | Promise<void>) | null = null;
  private isDestroyed = false;
  private destroyPromise: Promise<void> | null = null;

  constructor(
    private readonly session: VideoStreamSession,
    private readonly onChunkRequest: (request: ChunkRequestPayload) => Promise<Uint8Array>,
  ) {}

  async init(): Promise<void> {
    console.log('[VideoSWBridge] Initializing, sessionId:', this.sessionId);

    const sw = await this.claimServiceWorkerClient();
    console.log('[VideoSWBridge] Service Worker ready');

    if (this.isDestroyed) {
      console.log('[VideoSWBridge] Destroyed during init, aborting');
      return;
    }

    this.setupMessageListener();

    await this.registerSession(sw);

    console.log('[VideoSWBridge] Session registered and confirmed:', this.sessionId);
  }

  getVideoUrl(): string {
    return `/video-stream/${this.sessionId}`;
  }

  async destroy(): Promise<void> {
    if (this.destroyPromise) {
      return this.destroyPromise;
    }

    this.destroyPromise = this.performDestroy();
    return this.destroyPromise;
  }

  private async performDestroy(): Promise<void> {
    console.log('[VideoSWBridge] Destroying session:', this.sessionId);
    this.isDestroyed = true;

    const sw = navigator.serviceWorker.controller;
    if (sw) {
      await this.unregisterSession(sw);
    }

    if (this.messageHandler) {
      navigator.serviceWorker.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
  }

  private async claimServiceWorkerClient(): Promise<ServiceWorker> {
    const existingController = await this.getExistingController();

    if (existingController) {
      return existingController;
    }

    const registration = await navigator.serviceWorker.ready;
    console.log('[VideoSWBridge] SW ready, scope:', registration.scope);

    if (registration.active && !navigator.serviceWorker.controller) {
      await this.claimActiveServiceWorker(registration.active);
    }

    if (registration.installing || registration.waiting) {
      await this.waitForActivation(registration.installing || registration.waiting);
    }

    if (navigator.serviceWorker.controller) {
      return navigator.serviceWorker.controller;
    }

    throw new Error('No SW available');
  }

  private async getExistingController(): Promise<ServiceWorker | null> {
    if (!navigator.serviceWorker.controller) {
      return null;
    }

    const isAlive = await this.pingServiceWorker(navigator.serviceWorker.controller);
    if (isAlive) {
      console.log('[VideoSWBridge] Existing SW controller is alive');
      return navigator.serviceWorker.controller;
    }

    return null;
  }

  private async claimActiveServiceWorker(sw: ServiceWorker): Promise<void> {
    console.log('SW active but not controller, claiming clients...');
    await this.claimClients(sw);

    if (!navigator.serviceWorker.controller) {
      await this.waitForControllerChange();
    }
  }

  private waitForControllerChange(): Promise<void> {
    return new Promise<void>((resolve) => {
      const handler = () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handler);
        resolve();
      };

      navigator.serviceWorker.addEventListener('controllerchange', handler);

      setTimeout(() => {
        navigator.serviceWorker.removeEventListener('controllerchange', handler);
        resolve();
      }, DEFAULT_TIMEOUT);
    });
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

  private waitForActivation(sw: ServiceWorker | null): Promise<void> {
    if (!sw) {
      return Promise.reject(new Error('No SW to wait for'));
    }

    console.log('Waiting for SW to activate...');

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for SW activation'));
      }, 10000);

      const checkState = () => {
        if (sw.state === 'activated') {
          clearTimeout(timeout);
          resolve();
        }
      };

      sw.addEventListener('statechange', checkState);
      checkState();
    });
  }

  private pingServiceWorker(sw: ServiceWorker): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        navigator.serviceWorker.removeEventListener('message', handler);
        resolve(false);
      }, DEFAULT_TIMEOUT);

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

  private setupMessageListener(): void {
    this.messageHandler = async (event: MessageEvent) => {
      if (this.isDestroyed || event.data.type !== 'CHUNK_REQUEST') {
        return;
      }

      const request = event.data.payload as ChunkRequestPayload;
      const port = event.ports[0];

      if (!this.validateChunkRequest(request, port)) {
        return;
      }

      await this.processChunkRequest(request, port);
    };

    navigator.serviceWorker.addEventListener('message', this.messageHandler);
    console.log('Message listener registered for session:', this.sessionId);
  }

  private validateChunkRequest(request: ChunkRequestPayload, port: MessagePort | undefined): boolean {
    if (!port) {
      console.error('[VideoSWBridge] No port in CHUNK_REQUEST');
      return false;
    }

    if (request.sessionId !== this.sessionId) {
      console.log('Ignoring request for different session:', request.sessionId, '!= mine:', this.sessionId);
      return false;
    }

    return true;
  }

  private async processChunkRequest(request: ChunkRequestPayload, port: MessagePort): Promise<void> {
    try {
      const data = await this.onChunkRequest(request);

      if (this.isDestroyed) {
        this.sendChunkError(port, request.requestId, 'Session destroyed');
        console.log('Destroyed during chunk fetch, not sending response');
        return;
      }

      this.sendChunkResponse(port, request.requestId, data);
      console.log('Sending chunk response:', data.byteLength, 'bytes');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.sendChunkError(port, request.requestId, errorMessage);
      console.error('[VideoSWBridge] Error fetching chunk:', error);
    }
  }

  private sendChunkResponse(port: MessagePort, requestId: string, data: Uint8Array): void {
    port.postMessage({
      requestId,
      data,
    });
  }

  private sendChunkError(port: MessagePort, requestId: string, error: string): void {
    port.postMessage({
      requestId,
      error,
    });
  }

  private sendSessionMessage(
    sw: ServiceWorker,
    messageType: 'REGISTER_VIDEO_SESSION' | 'UNREGISTER_VIDEO_SESSION',
    expectedResponse: 'SESSION_REGISTERED' | 'SESSION_UNREGISTERED',
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();

      const timeout = setTimeout(() => {
        channel.port1.close();
        reject(new Error('Session message timeout'));
      }, DEFAULT_TIMEOUT);

      channel.port1.onmessage = (event) => {
        if (event.data.type === expectedResponse && event.data.sessionId === this.sessionId) {
          clearTimeout(timeout);
          channel.port1.close();
          resolve();
        }
      };

      const message =
        messageType === 'REGISTER_VIDEO_SESSION'
          ? {
              type: messageType,
              sessionId: this.sessionId,
              fileSize: this.session.fileSize,
              mimeType: this.session.mimeType,
            }
          : {
              type: messageType,
              sessionId: this.sessionId,
            };

      sw.postMessage(message, [channel.port2]);
    });
  }

  private registerSession(sw: ServiceWorker): Promise<void> {
    return this.sendSessionMessage(sw, 'REGISTER_VIDEO_SESSION', 'SESSION_REGISTERED');
  }

  private unregisterSession(sw: ServiceWorker): Promise<void> {
    return this.sendSessionMessage(sw, 'UNREGISTER_VIDEO_SESSION', 'SESSION_UNREGISTERED');
  }
}
