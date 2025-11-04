/* eslint-disable quotes */
import { StreamSaverOptions, MitmTransporter, ServiceWorkerMessage, ServiceWorkerResponse } from './types';

export const STREAM_SAVER_MITM = '/streamsaver/mitm.html?version=2.0.0';

export class StreamSaver {
  private mitmTransporter: MitmTransporter | null = null;

  constructor() {}

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
    const channel = new MessageChannel();

    this.loadTransporter();

    // Make filename RFC5987 compatible
    const encodedFilename = encodeURIComponent(filename.replace(/\//g, ':'))
      .replace(/['()]/g, escape)
      .replace(/\*/g, '%2A');

    const response: ServiceWorkerMessage = {
      transferringReadable: true,
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

    const transformStream = new TransformStream();
    channel.port1.postMessage({ readableStream: transformStream.readable }, [transformStream.readable]);

    const abortCleanup = () => {
      channel.port1.postMessage('abort');
      channel.port1.onmessage = null;
      channel.port1.close();
      channel.port2.close();
    };

    const onMessageReceived = (event: MessageEvent<ServiceWorkerResponse>) => {
      const { data } = event;

      if (data.download) {
        this.makeIframe(data.download);
        return;
      }

      if (data.abort) {
        abortCleanup();
        return;
      }

      console.error('Unknown message received from service worker', data);
    };

    channel.port1.onmessage = onMessageReceived;

    if (this.mitmTransporter?.loaded) {
      this.mitmTransporter.postMessage(...args);
    } else {
      this.mitmTransporter?.addEventListener('load', () => this.mitmTransporter?.postMessage(...args), { once: true });
    }

    return transformStream.writable;
  }
}

const streamSaver = new StreamSaver();

export default streamSaver;
