export interface VideoStreamSession {
  fileId: string;
  bucketId: string;
  fileSize: number;
}

export interface ChunkRequestPayload {
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

    console.log('[VideoSWBridge] Service Worker ready');

    this.setupMessageListener();

    this.sendMessage({
      type: 'REGISTER_VIDEO_SESSION',
      sessionId: this.sessionId,
      fileSize: this.session.fileSize,
    });

    console.log('[VideoSWBridge] Session registered:', this.sessionId);
  }

  private setupMessageListener() {
    this.messageHandler = async (event: MessageEvent) => {
      console.log('MESSAGE');
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
    if (this.messageHandler) {
      this.sendMessage({
        type: 'UNREGISTER_VIDEO_SESSION',
      });
      navigator.serviceWorker.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
  }
}
