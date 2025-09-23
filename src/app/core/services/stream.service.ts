import { createDecipheriv, Decipher } from 'crypto';

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

  return new Blob(slices as BlobPart[], mimeType ? { type: mimeType } : {});
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

/**
 * Creates a ReadableStream that decrypts the given input slices with the given key and IV.
 * The `startOffsetByte` parameter can be used to decrypt files that are not aligned with the AES block size.
 * In this case, it will generate a new IV for the given range and skip the first `startOffset` bytes of the encrypted stream.
 * @param {ReadableStream<Uint8Array>[]} inputSlices - The input slices to decrypt.
 * @param {Buffer} key - The key to use for decryption.
 * @param {Buffer} iv - The IV to use for decryption.
 * @param {number} [startOffsetByte] - The optional offset in bytes to start decryption from.
 * @returns {ReadableStream<Uint8Array>} - The decrypted stream.
 */
export function decryptStream(
  inputSlices: ReadableStream<Uint8Array>[],
  key: Buffer,
  iv: Buffer,
  startOffsetByte?: number,
): ReadableStream<Uint8Array> {
  let decipher: Decipher;
  if (startOffsetByte) {
    const aesBlockSize = 16;
    const startOffset = startOffsetByte % aesBlockSize;
    const startBlockFirstByte = startOffsetByte - startOffset;
    const startBlockNumber = startBlockFirstByte / aesBlockSize;

    const ivForRange = (BigInt('0x' + iv.toString('hex')) + BigInt(startBlockNumber)).toString(16).padStart(32, '0');
    const newIv = Buffer.from(ivForRange, 'hex');

    const skipBuffer = Buffer.alloc(startOffset, 0);

    decipher = createDecipheriv('aes-256-ctr', key, newIv);
    decipher.update(skipBuffer);
  } else {
    decipher = createDecipheriv('aes-256-ctr', key, iv);
  }
  const encryptedStream = joinReadableBinaryStreams(inputSlices);

  let keepReading = true;

  const decryptedStream = new ReadableStream({
    async pull(controller) {
      if (!keepReading) return;

      const reader = encryptedStream.getReader();
      const status = await reader.read();

      if (status.done) {
        controller.close();
      } else {
        controller.enqueue(decipher.update(status.value));
      }

      reader.releaseLock();
    },
    cancel() {
      keepReading = false;
    },
  });

  return decryptedStream;
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
