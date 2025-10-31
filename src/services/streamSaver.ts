/* eslint-disable quotes */
import { InvalidChunkError } from './errors/streamSaver.errors';
import { StreamSaverOptions, MitmTransporter, ServiceWorkerMessage, ServiceWorkerResponse } from './types';

export const STREAM_SAVER_MITM = '/streamsaver/mitm.html?version=2.0.0';

export class StreamSaver {
  private mitmTransporter: MitmTransporter | null = null;
  private supportsTransferable = false;

  constructor() {
    this.detectTransferableSupport();
  }

  /**
   * Detect if browser supports transferable streams
   */
  private detectTransferableSupport(): void {
    try {
      new Response(new ReadableStream());

      const { readable } = new TransformStream();
      const mc = new MessageChannel();
      mc.port1.postMessage(readable, [readable as any]);
      mc.port1.close();
      mc.port2.close();
      this.supportsTransferable = true;
    } catch (err) {
      this.supportsTransferable = false;
    }
  }

  /**
   * Create a hidden iframe and append it to the DOM
   */
  private makeIframe(src: string): MitmTransporter {
    if (!src) throw new Error('iframe src is required');

    const iframe = document.createElement('iframe');
    iframe.hidden = true;
    iframe.src = src;
    iframe.name = 'iframe';

    const transport: MitmTransporter = {
      frame: iframe,
      loaded: false,
      postMessage: (...args: any[]) => iframe.contentWindow?.postMessage(...args),
      remove: () => iframe.remove(),
      addEventListener: (type: string, listener: EventListener, options?: AddEventListenerOptions) =>
        iframe.addEventListener(type, listener, options),
      removeEventListener: (type: string, listener: EventListener) => iframe.removeEventListener(type, listener),
      dispatchEvent: (event: Event) => iframe.dispatchEvent(event),
    };

    iframe.addEventListener(
      'load',
      () => {
        transport.loaded = true;
      },
      { once: true },
    );

    document.body.appendChild(iframe);
    return transport;
  }

  /**
   * Load the MITM transporter (iframe)
   */
  private loadTransporter(): void {
    if (!this.mitmTransporter) {
      this.mitmTransporter = this.makeIframe(STREAM_SAVER_MITM);
    }
  }

  /**
   * Create a writable stream for downloading files
   */
  public createWriteStream(filename: string, options?: StreamSaverOptions): WritableStream<Uint8Array> {
    let channel: MessageChannel | null = null;
    let transformStream: TransformStream<Uint8Array, Uint8Array> | null = null;

    this.loadTransporter();
    channel = new MessageChannel();

    // Make filename RFC5987 compatible
    const encodedFilename = encodeURIComponent(filename.replace(/\//g, ':'))
      .replace(/['()]/g, escape)
      .replace(/\*/g, '%2A');

    const response: ServiceWorkerMessage = {
      transferringReadable: this.supportsTransferable,
      pathname: options?.pathname || Math.random().toString().slice(-6) + '/' + encodedFilename,
      headers: {
        'Content-Type': 'application/octet-stream; charset=utf-8',
        'Content-Disposition': "attachment; filename*=UTF-8''" + encodedFilename,
      },
    };

    if (options?.size) {
      response.headers['Content-Length'] = options.size.toString();
    }

    const args: [ServiceWorkerMessage, string, MessagePort[]] = [response, '*', [channel.port2]];

    if (this.supportsTransferable) {
      transformStream = new TransformStream();
      channel.port1.postMessage({ readableStream: transformStream.readable }, [transformStream.readable]);
    }

    channel.port1.onmessage = (evt: MessageEvent<ServiceWorkerResponse>) => {
      if (evt.data.download) {
        this.makeIframe(evt.data.download);
      } else if (evt.data.abort) {
        chunks = [];
        channel?.port1.postMessage('abort');
        if (channel) {
          channel.port1.onmessage = null;
          channel.port1.close();
          channel.port2.close();
          channel = null;
        }
      }
    };

    if (this.mitmTransporter?.loaded) {
      this.mitmTransporter.postMessage(...args);
    } else {
      this.mitmTransporter?.addEventListener('load', () => this.mitmTransporter?.postMessage(...args), { once: true });
    }

    let chunks: Uint8Array[] = [];

    return (
      (transformStream?.writable as WritableStream<Uint8Array>) ||
      new WritableStream<Uint8Array>({
        write(chunk: Uint8Array) {
          if (!(chunk instanceof Uint8Array)) {
            throw new InvalidChunkError();
          }
          channel?.port1.postMessage(chunk);
        },
        close() {
          channel?.port1.postMessage('end');
        },
        abort() {
          chunks = [];
          channel?.port1.postMessage('abort');
          if (channel) {
            channel.port1.onmessage = null;
            channel.port1.close();
            channel.port2.close();
            channel = null;
          }
        },
      })
    );
  }
}

const streamSaver = new StreamSaver();

export default streamSaver;
