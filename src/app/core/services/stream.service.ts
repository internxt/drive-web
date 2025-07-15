type BinaryStream = ReadableStream<Uint8Array>;

export async function binaryStreamToBlob(stream: BinaryStream, mimeType?: string): Promise<Blob> {
  const reader = stream.getReader();
  const slices: Uint8Array[] = [];

  let finish = false;

  while (!finish) {
    const { done, value } = await reader.read();

    if (!done) {
      slices.push(value as Uint8Array);
    }

    finish = done;
  }

  return new Blob(slices, mimeType ? { type: mimeType } : {});
}

export function buildProgressStream(source: BinaryStream, onRead: (readBytes: number) => void): BinaryStream {
  const reader = source.getReader();
  let readBytes = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const status = await reader.read();

      if (status.done) {
        controller.close();
      } else {
        readBytes += (status.value as Uint8Array).length;

        onRead(readBytes);
        controller.enqueue(status.value);
      }
    },
    cancel() {
      return reader.cancel();
    },
  });
}

export function joinReadableBinaryStreams(streams: BinaryStream[]): ReadableStream {
  const streamsCopy = streams.map((s) => s);
  let keepReading = true;

  const flush = () => streamsCopy.forEach((s) => s.cancel());

  const stream = new ReadableStream({
    async pull(controller) {
      if (!keepReading) return flush();

      const downStream = streamsCopy.shift();

      if (!downStream) {
        return controller.close();
      }

      const reader = downStream.getReader();
      let done = false;

      while (!done && keepReading) {
        const status = await reader.read();

        if (!status.done) {
          controller.enqueue(status.value);
        }

        done = status.done;
      }

      reader.releaseLock();
    },
    cancel() {
      keepReading = false;
    },
  });

  return stream;
}

/**
 * Given a stream of a file, it will read it and enqueue its parts in chunkSizes
 * @param readable Readable stream
 * @param chunkSize The chunkSize in bytes that we want each chunk to be
 * @returns A readable whose output is chunks of the file of size chunkSize
 */
export function streamFileIntoChunks(
  readable: ReadableStream<Uint8Array>,
  chunkSize: number,
): ReadableStream<Uint8Array> {
  const reader = readable.getReader();
  let buffer = new Uint8Array(0);

  return new ReadableStream({
    async pull(controller) {
      function handleDone() {
        if (buffer.byteLength > 0) {
          controller.enqueue(buffer);
        }
        return controller.close();
      }

      while (buffer.byteLength < chunkSize) {
        const status = await reader.read();

        if (status.done) return handleDone();

        const newBuffer = new Uint8Array(buffer.byteLength + status.value.byteLength);
        newBuffer.set(buffer);
        newBuffer.set(status.value, buffer.byteLength);
        buffer = newBuffer;
      }

      controller.enqueue(buffer.slice(0, chunkSize));
      buffer = buffer.slice(chunkSize);
    },
  });
}
