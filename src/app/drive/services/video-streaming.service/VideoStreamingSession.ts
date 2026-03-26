import { VideoSessionDestroyedError } from '../errors/video-streaming.errors';
import { VideoStreamingService } from './index';

export interface VideoStreamingSessionConfig {
  fileId: string;
  bucketId: string;
  fileSize: number;
  fileType: string;
  mnemonic: string;
  credentials: {
    user: string;
    pass: string;
  };
}

const PLAYER_URL = '/video-stream/player.html';

type EVENTS = 'PLAYER_LOADED' | 'READY' | 'ERROR' | 'CHUNK_REQUEST';

export class VideoStreamingSession {
  private service: VideoStreamingService | null = null;
  private isDestroyed = false;
  private iframe: HTMLIFrameElement | null = null;
  private messageHandler: ((event: MessageEvent) => void | Promise<void>) | null = null;

  constructor(private readonly config: VideoStreamingSessionConfig) {}

  async init(container: HTMLElement, onReady: () => void, onError: (error: string) => void): Promise<boolean> {
    this.service = new VideoStreamingService(this.config);

    this.setupMessageListener(onReady, onError);

    await this.generateIframe(container);

    return true;
  }

  private generateIframe(container: HTMLElement): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.getElementById('video-iframe')) {
        this.iframe = document.getElementById('video-iframe') as HTMLIFrameElement;
        resolve();
        return;
      }

      this.iframe = document.createElement('iframe');
      this.iframe.id = 'video-iframe';
      this.iframe.src = PLAYER_URL;
      this.iframe.style.cssText = `
        background: transparent;
        border: none;
        display: block;
        max-width: 90vw;
        max-height: 80vh;
      `;
      this.iframe.allow = 'autoplay';

      this.iframe.onload = () => {
        console.log('[IframeVideoService] Iframe loaded, waiting for player ready...');
      };

      this.iframe.onerror = () => {
        reject(new Error('Failed to load video player iframe'));
      };

      container.appendChild(this.iframe);
      resolve();
    });
  }

  // Set up the message listener
  private setupMessageListener(onReady: () => void, onError: (error: string) => void): void {
    this.messageHandler = async (event: MessageEvent) => {
      if (this.iframe && event.source !== this.iframe.contentWindow) {
        return;
      }

      const eventType = event.data.type as EVENTS;
      const payload = event.data.payload;

      switch (eventType) {
        case 'PLAYER_LOADED':
          console.log('[IframeVideoService] Player loaded, initializing video...');
          this.sendToIframe('INIT_VIDEO', {
            sessionId: this.config.fileId,
            fileSize: this.config.fileSize,
            mimeType: this.config.fileType,
          });
          break;

        case 'READY':
          console.log('[IframeVideoService] Video ready to play');
          if (payload.videoWidth && payload.videoHeight && this.iframe) {
            this.resizeIframeToVideo(payload.videoWidth, payload.videoHeight);
          }
          onReady();
          break;

        case 'ERROR':
          console.error('[IframeVideoService] Error:', payload.message);
          onError(payload.message);
          break;

        case 'CHUNK_REQUEST': {
          console.log('[IframeVideoService] Chunk request received: ', payload);

          if (this.isDestroyed) {
            throw new VideoSessionDestroyedError('Session destroyed during chunk request');
          }

          const chunkData = await this.service?.handleChunkRequest(payload);

          if (chunkData) {
            this.sendToIframe('CHUNK_RESPONSE', {
              requestId: payload.requestId,
              data: chunkData,
            });
          }
          break;
        }
      }
    };

    window.addEventListener('message', this.messageHandler);
  }

  private sendToIframe(type: string, payload: unknown): void {
    if (this.iframe) {
      this.iframe.contentWindow?.postMessage({ type, payload }, globalThis.location.origin);
    }
  }

  private resizeIframeToVideo(videoWidth: number, videoHeight: number): void {
    if (!this.iframe) return;

    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.8;

    const aspectRatio = videoWidth / videoHeight;

    let width = videoWidth;
    let height = videoHeight;

    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    this.iframe.style.width = `${width}px`;
    this.iframe.style.height = `${height}px`;
  }

  destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    if (this.iframe) {
      this.sendToIframe('DESTROY', {});
      this.iframe.remove();
      this.iframe = null;
    }

    this.isDestroyed = true;

    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }

    if (this.service) {
      this.service.cleanup();
      this.service = null;
    }
  }
}
