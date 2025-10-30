export interface StreamSaverOptions {
  /**
   * Size of the file in bytes (optional)
   * @deprecated Use Content-Length header instead
   */
  size?: number | null;

  /**
   * Custom pathname for the download URL
   */
  pathname?: string | null;

  /**
   * Strategy for the writable stream
   */
  writableStrategy?: QueuingStrategy<Uint8Array>;

  /**
   * Strategy for the readable stream
   */
  readableStrategy?: QueuingStrategy<Uint8Array>;

  /**
   * Headers to pass to the service worker
   */
  headers?: HeadersInit;
}

export interface StreamSaverConfig {
  /**
   * URL to the mitm.html file
   * Default: '/streamsaver/mitm.html?version=2.0.0'
   */
  mitm: string;

  /**
   * Whether StreamSaver is supported in the current environment
   */
  supported: boolean;

  /**
   * Version information
   */
  version: {
    full: string;
    major: number;
    minor: number;
    dot: number;
  };
}

export interface MitmTransporter {
  frame?: Window | HTMLIFrameElement;
  loaded: boolean;
  isIframe: boolean;
  isPopup: boolean;
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
