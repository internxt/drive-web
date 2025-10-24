import { DownloadChunkTask } from 'app/network/NetworkFacade';

export class NetworkUtils {
  public static readonly instance: NetworkUtils = new NetworkUtils();

  public readonly createDownloadChunks = (fileSize: number, chunkSize: number, maxChunkRetries: number) => {
    const chunks: DownloadChunkTask[] = [];
    let pos = 0;
    let index = 0;

    const initialSmallChunks = 8;
    for (let i = 1; i <= initialSmallChunks && pos < fileSize; i++) {
      const size = i * 128 * 1024;
      const end = Math.min(pos + size, fileSize);

      chunks.push({
        index: index++,
        chunkStart: pos,
        chunkEnd: end - 1,
        attempt: 0,
        maxRetries: maxChunkRetries,
      });

      pos = end;
    }

    const minChunkSize = Math.floor(chunkSize * 0.4);
    while (pos < fileSize) {
      const randomSize = Math.floor(Math.random() * (chunkSize - minChunkSize + 1)) + minChunkSize;

      const end = Math.min(pos + randomSize, fileSize);

      chunks.push({
        index: index++,
        chunkStart: pos,
        chunkEnd: end - 1,
        attempt: 0,
        maxRetries: maxChunkRetries,
      });

      pos = end;
    }

    return chunks;
  };
}
