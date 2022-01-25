import { Cipher } from 'crypto';
import { request } from 'https';
import { Sha256 } from 'asmcrypto.js';

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

  return Buffer.from(hasher.result!).toString('hex');
}

export async function uploadFile(plainFile: File, cipher: Cipher, url: string): Promise<void> {
  const readable = plainFile.stream().getReader();
  const formattedUrl = new URL(url);
  const req = request({
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    hostname: formattedUrl.hostname,
    port: formattedUrl.port,
    protocol: formattedUrl.protocol,
    path: formattedUrl.pathname + '?' + formattedUrl.searchParams.toString(),
    method: 'PUT',
  });

  let done = false;

  cipher.pipe(req);

  while (!done) {
    const status = await readable.read();

    if (!status.done) {
      cipher.update(status.value);
    }

    done = status.done;
  }
}
