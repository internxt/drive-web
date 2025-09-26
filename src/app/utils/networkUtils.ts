import { DownloadChunkTask } from 'app/network/NetworkFacade';

export class NetworkUtils {
  public static readonly instance: NetworkUtils = new NetworkUtils();

  public readonly createDownloadChunks = (fileSize: number, chunkSize: number, maxChunkRetires: number) => {
    let start = 0;
    let chunkIndex = 0;
    const chunks: Array<DownloadChunkTask> = [];

    // Split the file into chunks
    while (start < fileSize) {
      const end = Math.min(start + chunkSize - 1, fileSize - 1);
      chunks.push({
        index: chunkIndex,
        chunkStart: start,
        chunkEnd: end,
        attempt: 0,
        maxRetries: maxChunkRetires,
      });
      start = end + 1;
      chunkIndex++;
    }

    return chunks;
  };
}
