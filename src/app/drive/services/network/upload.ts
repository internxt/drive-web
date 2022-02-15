import { Cipher, createHash } from 'crypto';
import { request } from 'https';
import { Sha256 } from 'asmcrypto.js';
import EventEmitter from 'events';

export interface Abortable {
  stop: () => void;
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

// export function uploadFile(plainFile: File, cipher: Cipher, url: string): [Promise<void>, Abortable] {
//   const readable = plainFile.stream().getReader();
//   const formattedUrl = new URL(url);
//   const eventEmitter = new EventEmitter();
//   const { size: totalBytes } = plainFile;

//   let progress = 0;
//   let uploadedBytes = 0;
//   let aborted = false;

//   const uploadFinishedPromise = new Promise<void>((resolve, reject) => {
//     const req = request(
//       {
//         headers: {
//           'Content-Type': 'application/octet-stream',
//         },
//         hostname: formattedUrl.hostname,
//         port: formattedUrl.port,
//         protocol: formattedUrl.protocol,
//         path: formattedUrl.pathname + '?' + formattedUrl.searchParams.toString(),
//         method: 'PUT',
//       },
//       (res) => {
//         let rawResponse = '';

//         res
//           .on('data', (chunk) => {
//             rawResponse += chunk;
//           })
//           .once('end', () => {
//             res.statusCode !== 200 ? reject(JSON.parse(rawResponse)) : resolve();
//           });
//       },
//     );

//     eventEmitter.once('abort', () => {
//       aborted = true;
//       req.abort();
//       readable.cancel();
//     });

//     let done = false;

//     try {
//       (async () => {
//         while (!done && !aborted) {
//           const status = await readable.read();

//           if (!status.done) {
//             const overloaded = !req.write(cipher.update(status.value));

//             uploadedBytes += (status.value as Uint8Array).length;

//             if (overloaded) {
//               await new Promise((res) => req.once('drain', res));
//             }
//           }

//           progress = uploadedBytes / totalBytes;

//           console.log('Progress: ' + (progress * 100).toFixed(2) + '%');

//           done = status.done;
//         }

//         req.end();
//       })();
//     } catch (err) {
//       if (aborted) {
//         return resolve();
//       }
//       reject(err);
//     }
//   });

//   return [
//     uploadFinishedPromise,
//     {
//       stop: () => {
//         eventEmitter.emit('abort');
//       },
//     },
//   ];
// }

// export function uploadFile(plainFile: File, cipher: Cipher, url: string): [Promise<void>, Abortable] {
//   const readable = plainFile.stream().getReader();
//   const formattedUrl = new URL(url);
//   const eventEmitter = new EventEmitter();
//   const { size: totalBytes } = plainFile;

//   let progress = 0;
//   let uploadedBytes = 0;
//   let aborted = false;

//   eventEmitter.once('abort', () => {
//     aborted = true;
//     readable.cancel();
//   });

//   let done = false;
//   const blobParts: ArrayBuffer[] = [];

//   const uploadFinishedPromise = (async () => {
//     while (!done && !aborted) {
//       const status = await readable.read();

//       if (!status.done) {
//         blobParts.push(cipher.update(status.value));

//         uploadedBytes += (status.value as Uint8Array).length;
//       }

//       progress = uploadedBytes / totalBytes;

//       console.log('Progress: ' + (progress * 100).toFixed(2) + '%');

//       done = status.done;
//     }
//     const headers = new Headers();
//     headers.append('Content-Type', 'application/octet-stream');

//     await fetch(formattedUrl.toString(), {
//       method: 'PUT',
//       headers,
//       body: new Blob(blobParts, { type: 'application/octet-stream' }),
//     });
//   })();

//   return [
//     uploadFinishedPromise,
//     {
//       stop: () => {
//         eventEmitter.emit('abort');
//       },
//     },
//   ];
// }

export function uploadFile(plainFile: File, cipher: Cipher, url: string): [Promise<void>, Abortable] {
  const readable = plainFile.stream().getReader();
  const formattedUrl = new URL(url);
  const eventEmitter = new EventEmitter();
  const { size: totalBytes } = plainFile;

  let progress = 0;
  let uploadedBytes = 0;
  let aborted = false;

  eventEmitter.once('abort', () => {
    aborted = true;
    readable.cancel();
  });

  let done = false;
  const blobParts: ArrayBuffer[] = [];

  const uploadFinishedPromise = (async () => {
    while (!done && !aborted) {
      const status = await readable.read();

      if (!status.done) {
        blobParts.push(cipher.update(status.value));

        uploadedBytes += (status.value as Uint8Array).length;
      }

      progress = uploadedBytes / totalBytes;

      console.log('Encrypt Progress: ' + (progress * 100).toFixed(2) + '%');

      done = status.done;
    }
    const headers = new Headers();
    headers.append('Content-Type', 'application/octet-stream');

    const uploadRequest = new XMLHttpRequest();

    const upload = new Promise((resolve, reject) => {
      uploadRequest.onload = resolve;
      uploadRequest.onerror = reject;
    });
    uploadRequest.upload.addEventListener('progress', (e) => {
      console.log('Upload Progress: ' + ((e.loaded / e.total) * 100).toFixed(2) + '%');
    });
    uploadRequest.addEventListener('loadstart', (e) => {
      console.log('load start');
    });
    uploadRequest.addEventListener('abort', (e) => {
      console.log('abort');
    });
    uploadRequest.addEventListener('error', (e) => {
      console.log('error');
    });
    uploadRequest.addEventListener('timeout', (e) => {
      console.log('timeout');
    });
    uploadRequest.addEventListener('loadend', (e) => {
      console.log('loadend');
    });
    uploadRequest.addEventListener('load', function (e) {
      // HTTP status message (200, 404 etc)
      console.log(uploadRequest.status);

      // request.response holds response from the server
      console.log(uploadRequest.response);
    });

    uploadRequest.open('PUT', formattedUrl.toString());
    uploadRequest.send(new Blob(blobParts, { type: 'application/octet-stream' }));
    await upload;
  })();

  return [
    uploadFinishedPromise,
    {
      stop: () => {
        eventEmitter.emit('abort');
      },
    },
  ];
}
