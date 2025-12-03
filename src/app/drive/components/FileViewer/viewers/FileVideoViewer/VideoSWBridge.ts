import { wait } from 'utils';

export interface VideoStreamSession {
  fileId: string;
  bucketId: string;
  fileSize: number;
}

export interface ChunkRequestPayload {
  fileId: string;
  bucketId: string;
  start: number;
  end: number;
  fileSize: number;
  requestId: string;
}

export class VideoSWBridge {
  private sessionId = crypto.randomUUID();
  private messageHandler: ((event: MessageEvent) => void) | null = null;

  constructor(
    private session: VideoStreamSession,
    private onChunkRequest: (request: ChunkRequestPayload) => Promise<Uint8Array>,
  ) {}

  async init() {
    console.log('[VideoSWBridge] Registering Service Worker...');

    // Registrar el Service Worker
    const registration = await navigator.serviceWorker.register('/video-streaming.js', {
      scope: '/',
    });

    console.log('[VideoSWBridge] Service Worker registered:', registration);

    // Esperar a que el Service Worker esté activo y ready
    await navigator.serviceWorker.ready;
    console.log('[VideoSWBridge] Service Worker ready');

    // Dar un momento para que el SW tome control (gracias a skipWaiting y claim)
    await wait(200);

    console.log('[VideoSWBridge] Controller available:', navigator.serviceWorker.controller);

    // Configurar el listener de mensajes del Service Worker
    this.setupMessageListener();

    // Registrar la sesión en el Service Worker
    this.sendMessage({
      type: 'REGISTER_VIDEO_SESSION',
      sessionId: this.sessionId,
      fileId: this.session.fileId,
      bucketId: this.session.bucketId,
      fileSize: this.session.fileSize,
    });

    console.log('[VideoSWBridge] Session registered:', this.sessionId);
  }

  private setupMessageListener() {
    this.messageHandler = async (event: MessageEvent) => {
      if (event.data.type !== 'CHUNK_REQUEST') return;

      const request = event.data.payload as ChunkRequestPayload;
      const port = event.ports[0];

      if (!port) {
        return;
      }

      console.log('REQUEST IN VIDEO SW BRIDGE: ', request);

      try {
        const data = await this.onChunkRequest(request);

        port.postMessage({
          requestId: request.requestId,
          data,
        });
      } catch (error) {
        port.postMessage({
          requestId: request.requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: request,
        });
      }
    };

    navigator.serviceWorker.addEventListener('message', this.messageHandler);
  }

  private sendMessage(message: unknown) {
    if (navigator.serviceWorker.controller) {
      console.log('[VideoSWBridge] Sending message:', message);
      navigator.serviceWorker.controller.postMessage(message);
    } else {
      console.error('[VideoSWBridge] No controller available to send message');
    }
  }

  getVideoUrl(): string {
    return `/video-stream/${this.sessionId}`;
  }

  destroy() {
    // Remover el listener de mensajes
    if (this.messageHandler) {
      navigator.serviceWorker.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
  }
}
