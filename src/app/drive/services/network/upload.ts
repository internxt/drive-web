import { Cipher, createHash } from 'crypto';
import { request } from 'https';
import { Sha256 } from 'asmcrypto.js';
import EventEmitter from 'events';

export interface Abortable {
  stop: () => void
}

export async function calculateEncryptedFileHash(plainFile: File, cipher: Cipher): Promise<string> {
  const readable = plainFile.stream().getReader();
  const hasher = new Sha256();

  let done = false;

  while (!done) {
    const status = await readable.read();

    if (!status.done) {
      hasher.process(cipher.update(status.value));
    }

    done = status.done;
  }

  hasher.finish();

  return createHash('ripemd160').update(Buffer.from(hasher.result!)).digest('hex');
}

export function uploadFile(plainFile: File, cipher: Cipher, url: string): [Promise<void>, Abortable] {
  const readable = plainFile.stream().getReader();
  const formattedUrl = new URL(url);
  const eventEmitter = new EventEmitter();

  let aborted = false;

  const uploadFinishedPromise = new Promise<void>((resolve, reject) => {
    const req = request({
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      hostname: formattedUrl.hostname,
      port: formattedUrl.port,
      protocol: formattedUrl.protocol,
      path: formattedUrl.pathname + '?' + formattedUrl.searchParams.toString(),
      method: 'PUT',
    }, (res) => {
      let rawResponse = '';

      res.on('data', (chunk) => {
        rawResponse += chunk;
      }).once('end', () => {
        res.statusCode !== 200 ? reject(JSON.parse(rawResponse)) : resolve();
      });
    });

    eventEmitter.once('abort', () => {
      aborted = true;
      req.abort();
      readable.cancel();
    });

    let done = false;

    try {
      (async () => {
        while (!done && !aborted) {
          const status = await readable.read();

          if (!status.done) {
            const overloaded = !req.write(cipher.update(status.value));

            if (overloaded) {
              await new Promise(res => req.once('drain', res));
            }
          }

          done = status.done;
        }

        req.end();
      })();
    } catch (err) {
      if (aborted) {
        return resolve();
      }
      reject(err);
    }
  });

  return [uploadFinishedPromise, {
    stop: () => {
      eventEmitter.emit('abort');
    }
  }];
}
