export interface BlobWritable {
  getWriter: () => {
    abort: () => Promise<void>;
    close: () => Promise<void>;
    closed: Promise<undefined>;
    desiredSize: number | null;
    ready: Promise<undefined>;
    releaseLock: () => void;
    write: (chunk: BlobPart) => Promise<void>;
  };
  locked: boolean;
  abort: () => Promise<void>;
  close: () => Promise<void>;
}

export function getBlobWritable(filename: string, onClose: (result: Blob) => void): BlobWritable {
  let blobParts: BlobPart[] = [];

  return {
    getWriter: () => {
      return {
        abort: async () => {
          blobParts = [];
        },
        close: async () => {
          onClose(new File(blobParts, filename));
        },
        closed: Promise.resolve(undefined),
        desiredSize: 3 * 1024 * 1024,
        ready: Promise.resolve(undefined),
        releaseLock: () => {
          // no op
        },
        write: async (chunk) => {
          blobParts.push(chunk);
        },
      };
    },
    locked: false,
    abort: async () => {
      blobParts = [];
    },
    close: async () => {
      onClose(new File(blobParts, filename));
    },
  };
}

async function pipe(readable: ReadableStream, writable: BlobWritable): Promise<void> {
  const reader = readable.getReader();
  const writer = writable.getWriter();

  let done = false;

  while (!done) {
    const status = await reader.read();

    if (!status.done) {
      await writer.write(status.value);
    }

    done = status.done;
  }

  await reader.closed;
  await writer.close();
}

export async function downloadFileAsBlob(source: ReadableStream, destination: BlobWritable): Promise<void> {
  await pipe(source, destination);
}
