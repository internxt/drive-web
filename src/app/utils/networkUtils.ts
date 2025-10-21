import { DownloadChunkTask } from 'app/network/NetworkFacade';

export class NetworkUtils {
  public static readonly instance: NetworkUtils = new NetworkUtils();

  public readonly createDownloadChunks = (fileSize: number, chunkSize: number, maxChunkRetires: number) => {
    const chunks: DownloadChunkTask[] = [];
    let pos = 0;
    let index = 0;

    // Start with small chunks so the first few chunks are downloaded quickly and the UI is updated
    const initialSmallChunks = 8;
    for (let i = 1; i <= initialSmallChunks && pos < fileSize; i++) {
      const size = i * 128 * 1024;
      const end = Math.min(pos + size, fileSize);

      chunks.push({
        index: index++,
        chunkStart: pos,
        chunkEnd: end - 1,
        attempt: 0,
        maxRetries: maxChunkRetires,
      });

      pos = end;
    }

    // Then, download the rest of the chunks with the normal chunk size
    while (pos < fileSize) {
      const end = Math.min(pos + chunkSize, fileSize);

      chunks.push({
        index: index++,
        chunkStart: pos,
        chunkEnd: end - 1,
        attempt: 0,
        maxRetries: maxChunkRetires,
      });

      pos = end;
    }

    return chunks;
  };
}
