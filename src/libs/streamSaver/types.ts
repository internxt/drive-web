export interface StreamSaverOptions {
  size?: number | null;
  pathname?: string | null;
  headers?: HeadersInit;
}

export interface MitmTransporter {
  frame?: Window | HTMLIFrameElement | null;
  loaded: boolean;
  postMessage: (...args: any[]) => void;
  remove: () => void;
  addEventListener: (type: string, listener: EventListener, options?: AddEventListenerOptions) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
  dispatchEvent: (event: Event) => boolean;
}

export interface ServiceWorkerMessage {
  pathname: string;
  headers: Record<string, string>;
  transferringReadable?: boolean;
  readableStream?: ReadableStream<Uint8Array>;
}

export interface ServiceWorkerResponse {
  download?: string;
  abort?: boolean;
  debug?: string;
}
