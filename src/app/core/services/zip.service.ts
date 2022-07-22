import streamSaver from 'streamsaver';
import fileDownload from 'js-file-download';

import { binaryStreamToBlob, buildProgressStream } from './stream.service';

type FlatFolderZipOpts = {
  abortController?: AbortController;
  progress?: (loadedBytes: number) => void;
}
function isBrave() {
  const maybeBrave = (window.navigator as { brave?: { isBrave?: { name: 'isBrave' } } }).brave;

  return maybeBrave != undefined && maybeBrave?.isBrave?.name == 'isBrave';
}
export class FlatFolderZip {
  private finished!: Promise<void>;
  private zip: ZipStream;
  private passThrough: ReadableStream<Uint8Array>;
  private folderName: string;
  private abortController?: AbortController;
  private isServiceWorkerAllowed: boolean;

  constructor(folderName: string, isServiceWorkerAllowed: boolean, opts: FlatFolderZipOpts) {
    this.isServiceWorkerAllowed = isServiceWorkerAllowed;
    this.folderName = folderName;
    this.zip = createFolderWithFilesWritable();
    this.abortController = opts.abortController;

    this.passThrough = opts.progress ?
      buildProgressStream(this.zip.stream, opts.progress) :
      this.zip.stream;

    const isFirefox = navigator.userAgent.indexOf('Firefox') !== -1;

    if (isBrave() || !isServiceWorkerAllowed) return;

    if (isFirefox) {
      loadWritableStreamPonyfill().then(() => {
        streamSaver.WritableStream = window.WritableStream;

        this.finished = this.passThrough.pipeTo(
          streamSaver.createWriteStream(folderName + '.zip'),
          { signal: opts.abortController?.signal }
        );
      });
    } else {
      this.finished = this.passThrough.pipeTo(
        streamSaver.createWriteStream(folderName + '.zip'),
        { signal: opts.abortController?.signal }
      );
    }
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
    if (this.abortController?.signal.aborted) return;

    this.zip.end();

    if (isBrave() || !this.isServiceWorkerAllowed) {
      return fileDownload(
        await binaryStreamToBlob(this.passThrough),
        `${this.folderName}.zip`,
        'application/zip'
      );
    }

    await this.finished;
  }

  abort(): void {
    this.abortController?.abort();
  }
}

interface FileLike {
  name: string,
  lastModified?: Date,
  directory?: boolean,
  comment?: string;
  stream: () => ReadableStream
}

interface ZipObject {
  level: number;
  ctrl: ReadableStreamController<unknown>;
  directory: boolean;
  nameBuf: Uint8Array;
  comment: Uint8Array;
  compressedLength: number;
  uncompressedLength: number;
  writeHeader: () => void;
  writeFooter: (x?: unknown) => void;
  offset?: number;
  header?: {
    array: Uint8Array;
    view: DataView;
  };
  crc?: Crc32;
  fileLike: FileLike;
  reader?: ReadableStreamReader<Uint8Array>;
}

class Crc32 {
  private crc: number;
  private table: number[];

  constructor() {
    this.crc = -1;

    let i: number;
    let j: number;
    let t: number;

    const table: number[] = [];

    for (i = 0; i < 256; i++) {
      t = i;
      for (j = 0; j < 8; j++) {
        t = (t & 1)
          ? (t >>> 1) ^ 0xEDB88320
          : t >>> 1;
      }
      table[i] = t;
    }

    this.table = table;
  }

  append(data: Uint8Array) {
    let crc = this.crc | 0; const table = this.table;
    for (let offset = 0, len = data.length | 0; offset < len; offset++) {
      crc = (crc >>> 8) ^ table[(crc ^ data[offset]) & 0xFF];
    }
    this.crc = crc;
  }

  get() {
    return ~this.crc;
  }
}

const getDataHelper = (byteLength: number) => {
  const uint8 = new Uint8Array(byteLength);

  return {
    array: uint8,
    view: new DataView(uint8.buffer)
  };
};

const pump = (zipObj: ZipObject) =>
  zipObj.reader?.read().then(
    (chunk: { done: boolean, value?: Uint8Array }) => {
      if (chunk.done) return zipObj.writeFooter();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const outputData = chunk.value!;
      zipObj.crc?.append(outputData);
      zipObj.uncompressedLength += outputData.length;
      zipObj.compressedLength += outputData.length;
      zipObj.ctrl.enqueue(outputData);
    });

/**
 * [createWriter description]
 * @param  {Object} underlyingSource [description]
 * @return {Boolean}                  [description]
 */
export default function createZipReadable(underlyingSource: {
  start: (writer: {
    enqueue: (fileLike: FileLike) => void
    close: () => void
  }) => void | undefined,
  pull?: (writer: {
    enqueue: (fileLike: FileLike) => void
    close: () => void
  }) => void
}): ReadableStream<Uint8Array> {
  const files: Record<string, ZipObject> = Object.create(null);
  const filenames: string[] = [];
  const encoder = new TextEncoder();
  let offset = 0;
  let activeZipIndex = 0;
  let ctrl: ReadableStreamController<Uint8Array>;
  let activeZipObject: ZipObject, closed: boolean;

  function next() {
    activeZipIndex++;
    activeZipObject = files[filenames[activeZipIndex]];
    if (activeZipObject) processNextChunk();
    else if (closed) closeZip();
  }

  const zipWriter = {
    enqueue(fileLike: FileLike) {
      if (closed) {
        // eslint-disable-next-line max-len
        throw new TypeError('Cannot enqueue a chunk into a readable stream that is closed or has been requested to be closed');
      }

      let name = fileLike.name.trim();
      const date = new Date(typeof fileLike.lastModified === 'undefined' ? Date.now() : fileLike.lastModified);

      if (fileLike.directory && !name.endsWith('/')) name += '/';
      if (files[name]) throw new Error('File already exists.');

      const nameBuf = encoder.encode(name);
      filenames.push(name);

      const zipObject = files[name] = {
        level: 0,
        ctrl,
        crc: new Crc32(),
        directory: !!fileLike.directory,
        nameBuf,
        comment: encoder.encode(fileLike.comment || ''),
        compressedLength: 0,
        uncompressedLength: 0,
        header: {
          array: new Uint8Array(),
          view: new DataView(new ArrayBuffer(0))
        },
        offset: 0,
        writeHeader() {
          const header = getDataHelper(26);
          const data = getDataHelper(30 + nameBuf.length);

          zipObject.offset = offset;
          zipObject.header = header;

          if (zipObject.level !== 0 && !zipObject.directory) {
            header.view.setUint16(4, 0x0800);
          }
          header.view.setUint32(0, 0x14000808);
          header.view.setUint16(6, (((date.getHours() << 6) | date.getMinutes()) << 5) | date.getSeconds() / 2, true);
          header.view.setUint16(8, (
            (((date.getFullYear() - 1980) << 4) | (date.getMonth() + 1)) << 5) | date.getDate(),
            true
          );
          header.view.setUint16(22, nameBuf.length, true);
          data.view.setUint32(0, 0x504b0304);
          data.array.set(header.array, 4);
          data.array.set(nameBuf, 30);
          offset += data.array.length;
          ctrl.enqueue(data.array);
        },
        writeFooter() {
          const footer = getDataHelper(16);
          footer.view.setUint32(0, 0x504b0708);

          if (zipObject.crc) {
            zipObject.header.view.setUint32(10, zipObject.crc.get(), true);
            zipObject.header.view.setUint32(14, zipObject.compressedLength, true);
            zipObject.header.view.setUint32(18, zipObject.uncompressedLength, true);
            footer.view.setUint32(4, zipObject.crc.get(), true);
            footer.view.setUint32(8, zipObject.compressedLength, true);
            footer.view.setUint32(12, zipObject.uncompressedLength, true);
          }

          ctrl.enqueue(footer.array);
          offset += zipObject.compressedLength + 16;
          next();
        },
        fileLike
      };

      if (!activeZipObject) {
        activeZipObject = zipObject;
        processNextChunk();
      }
    },
    close() {
      if (closed) throw new TypeError('Cannot close a readable stream that has already been requested to be closed');
      if (!activeZipObject) closeZip();
      closed = true;
    }
  };

  function closeZip() {
    let length = 0;
    let index = 0;
    let indexFilename, file;
    for (indexFilename = 0; indexFilename < filenames.length; indexFilename++) {
      file = files[filenames[indexFilename]];
      length += 46 + file.nameBuf.length + file.comment.length;
    }
    const data = getDataHelper(length + 22);
    for (indexFilename = 0; indexFilename < filenames.length; indexFilename++) {
      file = files[filenames[indexFilename]];
      data.view.setUint32(index, 0x504b0102);
      data.view.setUint16(index + 4, 0x1400);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      data.array.set(file.header!.array, index + 6);
      data.view.setUint16(index + 32, file.comment.length, true);
      if (file.directory) {
        data.view.setUint8(index + 38, 0x10);
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      data.view.setUint32(index + 42, file.offset!, true);
      data.array.set(file.nameBuf, index + 46);
      data.array.set(file.comment, index + 46 + file.nameBuf.length);
      index += 46 + file.nameBuf.length + file.comment.length;
    }
    data.view.setUint32(index, 0x504b0506);
    data.view.setUint16(index + 8, filenames.length, true);
    data.view.setUint16(index + 10, filenames.length, true);
    data.view.setUint32(index + 12, length, true);
    data.view.setUint32(index + 16, offset, true);
    ctrl.enqueue(data.array);
    ctrl.close();
  }

  function processNextChunk() {
    if (!activeZipObject) return;
    if (activeZipObject.directory) return activeZipObject.writeFooter(activeZipObject.writeHeader());
    if (activeZipObject.reader) return pump(activeZipObject);
    if (activeZipObject.fileLike.stream) {
      activeZipObject.crc = new Crc32();
      activeZipObject.reader = activeZipObject.fileLike.stream().getReader();
      activeZipObject.writeHeader();
    } else next();
  }

  return new ReadableStream({
    start: c => {
      ctrl = c;
      underlyingSource.start && Promise.resolve(underlyingSource.start(zipWriter));
    },
    pull() {
      return processNextChunk() || (
        underlyingSource.pull &&
        Promise.resolve(underlyingSource.pull(zipWriter))
      );
    }
  });
}

export function loadWritableStreamPonyfill(): Promise<void> {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/web-streams-polyfill@2.0.2/dist/ponyfill.min.js';
  document.head.appendChild(script);

  return new Promise((resolve) => {
    script.onload = function () {
      resolve();
    };
  });
}

type AddFileToZipFunction = (name: string, source: ReadableStream<Uint8Array>) => void
type AddFolderToZipFunction = (name: string) => void
export interface ZipStream {
  addFile: AddFileToZipFunction,
  addFolder: AddFolderToZipFunction,
  stream: ReadableStream<Uint8Array>,
  end: () => void
}

export function createFolderWithFilesWritable(): ZipStream {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let controller: any;

  const zipStream = createZipReadable({ start(ctrl) { controller = ctrl; } });

  return {
    addFile: (name: string, source: ReadableStream<Uint8Array>): void => {
      controller.enqueue({ name, stream: () => source });
    },
    addFolder: (name: string): void => {
      controller.enqueue({ name, directory: true });
    },
    stream: zipStream,
    end: () => {
      controller.close();
    }
  };
}
