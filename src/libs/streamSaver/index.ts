/* eslint-disable quotes */
import { StreamSaverOptions, MitmTransporter, ServiceWorkerMessage, ServiceWorkerResponse } from './types';

export const STREAM_SAVER_MITM = '/streamsaver/mitm.html?version=2.0.0';

export class StreamSaver {
  private mitmTransporter: MitmTransporter | null = null;
  private supportsTransferable = false;
  public WritableStream = globalThis.WritableStream;

  constructor() {
    this.detectTransferableSupport();
  }

  private detectTransferableSupport(): void {
    try {
      const { readable } = new TransformStream();
      const mc = new MessageChannel();
      mc.port1.postMessage(readable, [readable]);
      mc.port1.close();
      mc.port2.close();
      this.supportsTransferable = true;
      console.log('[StreamSaver] Transferable streams supported');
    } catch {
      this.supportsTransferable = false;
      console.log('[StreamSaver] Transferable streams NOT supported, using fallback');
    }
  }

  private makeIframe(src: string): MitmTransporter {
    if (!src) throw new Error('iframe src is required');

    console.log(`[StreamSaver] Creating iframe with src: ${src}`);

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

    iframe.addEventListener('load', () => (transport.loaded = true), { once: true });

    iframe.addEventListener('error', (e) => {
      console.error('[StreamSaver] Iframe failed to load:', e);
    });

    document.body.appendChild(iframe);
    return transport;
  }

  private loadTransporter(): void {
    if (!this.mitmTransporter) {
      console.log('[StreamSaver] Loading transporter');
      this.mitmTransporter = this.makeIframe(STREAM_SAVER_MITM);
    }
  }

  private manualWritableStream(
    channel: MessageChannel,
    bytesWritten: number,
    downloadUrl: string | null,
  ): WritableStream<Uint8Array> {
    return new WritableStream<Uint8Array>({
      write(chunk) {
        if (!(chunk instanceof Uint8Array)) {
          throw new TypeError('Can only write Uint8Arrays');
        }

        console.log('[StreamSaver] Writing chunk:', chunk.length, 'bytes');
        channel.port1.postMessage(chunk);
        bytesWritten += chunk.length;

        if (downloadUrl) {
          location.href = downloadUrl;
          downloadUrl = null;
        }
      },
      close() {
        console.log('[StreamSaver] Stream closed, total bytes:', bytesWritten);
        channel.port1.postMessage('end');
      },
      abort() {
        console.log('[StreamSaver] Stream aborted');
        channel.port1.postMessage('abort');
        channel.port1.onmessage = null;
        // Delay closing ports to ensure 'abort' message delivers
        setTimeout(() => {
          channel.port1.close();
          channel.port2.close();
        }, 200);
      },
    });
  }

  public createWriteStream(filename: string, options?: StreamSaverOptions): WritableStream<Uint8Array> {
    console.log(
      '[StreamSaver] Creating write stream for:',
      filename,
      'supportsTransferable:',
      this.supportsTransferable,
    );

    this.loadTransporter();

    const messageChannel = new MessageChannel();
    let bytesWritten = 0;
    let downloadUrl: string | null = null;

    // Make filename RFC5987 compatible
    const encodedFilename = encodeURIComponent(filename.replaceAll('/', ':'));

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

    const args: [ServiceWorkerMessage, string, MessagePort[]] = [response, '*', [messageChannel.port2]];

    let transformStream: TransformStream<Uint8Array, Uint8Array> | null = null;

    // If the browser supports Transferable streams, use them. E.g. Firefox, Chrome
    if (this.supportsTransferable) {
      console.log('[StreamSaver] Using transferable stream');

      transformStream = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          if (!(chunk instanceof Uint8Array)) {
            throw new TypeError('Can only write Uint8Arrays');
          }
          bytesWritten += chunk.length;
          controller.enqueue(chunk);

          if (downloadUrl) {
            location.href = downloadUrl;
            downloadUrl = null;
          }
        },
        flush() {
          if (downloadUrl) {
            location.href = downloadUrl;
          }
        },
      });

      const readableStream = transformStream.readable;
      messageChannel.port1.postMessage({ readableStream }, [readableStream]);
    }

    messageChannel.port1.onmessage = (evt: MessageEvent<ServiceWorkerResponse>) => {
      console.log('[StreamSaver] Message received from SW:', evt.data);

      if (evt.data.download) {
        console.log('[StreamSaver] Creating download iframe:', evt.data.download);
        this.makeIframe(evt.data.download);
      } else if (evt.data.abort) {
        console.log('[StreamSaver] Abort received');
        messageChannel.port1.postMessage('abort');
        messageChannel.port1.onmessage = null;
        messageChannel.port1.close();
        messageChannel.port2.close();
      }
    };

    if (this.mitmTransporter?.loaded) {
      this.mitmTransporter.postMessage(...args);
    } else {
      this.mitmTransporter?.addEventListener('load', () => this.mitmTransporter?.postMessage(...args), { once: true });
    }

    if (transformStream?.writable) {
      return transformStream.writable;
    }

    // Use manual writable stream for browsers that don't support Transferable streams. E.g. Safari
    return this.manualWritableStream(messageChannel, bytesWritten, downloadUrl);
  }
}

const streamSaver = new StreamSaver();

export default streamSaver;
