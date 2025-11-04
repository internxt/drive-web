import fileDownload from 'js-file-download';
import { AsyncZipDeflate, Zip } from 'fflate';

import streamSaver from '../../../services/StreamSaver';
import browserService from './browser.service';
import { binaryStreamToBlob } from './stream.service';

type FlatFolderZipOpts = {
  abortController?: AbortController;
  progress?: (loadedBytes: number) => void;
};

export class FlatFolderZip {
  private readonly finished!: Promise<void>;
  private zip: ZipStream;
  private passThrough: ReadableStream<Uint8Array>;
  private folderName: string;
  private abortController?: AbortController;

  constructor(folderName: string, opts: FlatFolderZipOpts) {
    this.folderName = folderName;

    console.info('Using fast method for creating a zip');
    this.zip = createFolderWithFilesWritable(opts.progress);
    this.abortController = opts.abortController;

    // TODO: check why opts.progress is causing zip corruption
    this.passThrough = this.zip.stream;

    if (browserService.isBrave()) return;

    this.finished = this.passThrough.pipeTo(streamSaver.createWriteStream(folderName + '.zip'), {
      signal: opts.abortController?.signal,
    });
  }

  addFile(name: string, source: ReadableStream<Uint8Array>): void {
    if (this.abortController?.signal.aborted) return;

    this.zip.addFile(name, source);
  }

  addFolder(name: string): void {
    if (this.abortController?.signal.aborted) return;

    this.zip.addFolder(name);
  }

  async close(): Promise<void> {
    if (this.abortController?.signal.aborted) {
      this.zip.terminate();
      return;
    }

    this.zip.end();

    if (browserService.isBrave()) {
      return fileDownload(await binaryStreamToBlob(this.passThrough), `${this.folderName}.zip`, 'application/zip');
    }

    await this.finished;
  }

  abort(): void {
    this.zip.terminate();
    this.abortController?.abort('Zip aborted');
  }
}
type AddFileToZipFunction = (name: string, source: ReadableStream<Uint8Array>) => void;
type AddFolderToZipFunction = (name: string) => void;
export interface ZipStream {
  addFile: AddFileToZipFunction;
  addFolder: AddFolderToZipFunction;
  stream: ReadableStream<Uint8Array>;
  end: () => void;
  terminate: () => void;
}

export function createFolderWithFilesWritable(progress?: FlatFolderZipOpts['progress']): ZipStream {
  const zip = new Zip();
  let passthroughController: ReadableStreamDefaultController<Uint8Array> | null = null;

  const passthrough = new ReadableStream<Uint8Array>({
    start(controller) {
      passthroughController = controller;
    },
    cancel() {
      if (passthroughController) {
        try {
          passthroughController.close();
        } catch {
          // noop
        }
        passthroughController = null;
      }
    },
  });

  zip.ondata = (err, data, final) => {
    if (err) {
      console.error('Error in ZIP data event:', err);
      return;
    }

    if (data) {
      passthroughController?.enqueue(data);
    }

    if (final) {
      passthroughController?.close();
      passthroughController = null;
    }
  };

  let processedSize = 0;

  // todo: abort with .terminate()
  return {
    addFile: (name: string, source: ReadableStream<Uint8Array>): void => {
      const writer = new AsyncZipDeflate(name, {
        level: 0,
      });

      zip.add(writer);

      source.pipeTo(
        new WritableStream({
          write(chunk) {
            processedSize += chunk.length;

            progress?.(processedSize);

            writer.push(chunk, false);
          },
          close() {
            writer.push(new Uint8Array(0), true);
          },
        }),
      );
    },
    addFolder: (name: string): void => {
      const writer = new AsyncZipDeflate(name + '/', {
        level: 0,
      });
      zip.add(writer);
      writer.push(new Uint8Array(0), true);
    },
    stream: passthrough,
    end: () => {
      zip.end();
    },
    terminate: () => {
      zip.terminate();
    },
  };
}
