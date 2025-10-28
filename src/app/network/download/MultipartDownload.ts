import { queue, QueueObject } from 'async';
import { DownloadOptions, DownloadChunkTask } from '../types/index';
import { USE_MULTIPART_THRESHOLD_BYTES as FIFTY_MEGABYTES } from '../networkConstants';
import { NetworkFacade } from '../NetworkFacade';
import { MaxRetriesExceededError } from '../errors/download.errors';

export interface DownloadFilePayload {
  bucketId: string;
  fileId: string;
  mnemonic: string;
  fileSize: number;
  options?: DownloadOptions;
}

export class MultipartDownload {
  private readonly concurrency = 6;

  private downloadedBytes = 0;
  private completedChunksDownloadedCount = 0;
  private nextChunkToStream = 0;
  private completedChunks: Array<Uint8Array[] | null> = [];
  private downloadQueue: QueueObject<DownloadChunkTask> | null = null;

  constructor(private readonly network: NetworkFacade) {}

  /**
   * Downloads a file in chunks and streams the chunks as they are downloaded.
   * @param bucketId The bucket ID where the file is located.
   * @param fileId The file ID of the file to download.
   * @param mnemonic The mnemonic used to encrypt the file.
   * @param fileSize The size of the file in bytes.
   * @param options The options to download the file.
   * @returns A promise that resolves to a readable stream of the file.
   */
  public downloadFile(params: DownloadFilePayload): ReadableStream<Uint8Array> {
    const { bucketId, fileId, mnemonic, fileSize, options } = params;

    const tasks = this.createDownloadTasks(fileSize);

    this.initializeDownloadState(tasks.length);

    return new ReadableStream<Uint8Array>({
      start: async (controller) => {
        await this.startDownload({
          tasks,
          bucketId,
          fileId,
          mnemonic,
          fileSize,
          controller,
          options,
        });
      },
    });
  }

  private initializeDownloadState(tasksLength: number): void {
    this.downloadedBytes = 0;
    this.completedChunksDownloadedCount = 0;
    this.nextChunkToStream = 0;
    this.completedChunks = new Array(tasksLength).fill(null);
  }

  public readonly createDownloadTasks = (fileSize: number, chunkSize = FIFTY_MEGABYTES, maxChunkRetries = 3) => {
    const task: DownloadChunkTask[] = [];
    let pos = 0;
    let index = 0;

    const minChunkSize = Math.floor(chunkSize * 0.4);
    while (pos < fileSize) {
      const randomSize = Math.floor(Math.random() * (chunkSize - minChunkSize + 1)) + minChunkSize;

      const end = Math.min(pos + randomSize, fileSize);

      task.push({
        index: index++,
        chunkStart: pos,
        chunkEnd: end - 1,
        attempt: 0,
        maxRetries: maxChunkRetries,
      });

      pos = end;
    }

    return task;
  };

  private async startDownload(params: {
    tasks: DownloadChunkTask[];
    bucketId: string;
    fileId: string;
    mnemonic: string;
    fileSize: number;
    controller: ReadableStreamDefaultController<Uint8Array>;
    options?: DownloadOptions;
  }): Promise<void> {
    const { tasks, bucketId, fileId, mnemonic, fileSize, controller, options } = params;

    this.downloadQueue = queue(
      async (task: DownloadChunkTask) =>
        await this.executeTask({
          task,
          bucketId,
          fileId,
          mnemonic,
          fileSize,
          controller,
          options,
        }),
      this.concurrency,
    );

    this.downloadQueue.error((err, task) => {
      this.handleDownloadError({
        task,
        error: err,
        controller,
        options,
      });
    });

    this.downloadQueue.drain(() => {
      this.streamRemainingChunks(controller, tasks.length);
      controller.close();
    });

    for (const task of tasks) {
      this.downloadQueue.push(task);
    }
  }

  private registerCompletedChunk(index: number, chunkData: Uint8Array[]): void {
    this.completedChunks[index] = chunkData;
    this.completedChunksDownloadedCount++;

    const chunkBytes = this.countDownloadedBytes(chunkData);
    this.downloadedBytes += chunkBytes;
  }

  private revertPartialDownload(index: number): void {
    const chunkData = this.completedChunks[index];
    if (!chunkData) return;

    const partialBytes = this.countDownloadedBytes(chunkData);
    this.completedChunks[index] = null;

    if (!partialBytes) return;

    this.downloadedBytes -= partialBytes;
    console.log(`[DOWNLOAD-MULTIPART] Reverted ${partialBytes} bytes from chunk ${index}`);
  }

  private countDownloadedBytes(chunkData: Uint8Array[]): number {
    return chunkData.reduce((acc, chunk) => acc + chunk.length, 0);
  }

  private streamOrderedChunks(controller: ReadableStreamDefaultController<Uint8Array>): void {
    while (
      this.nextChunkToStream < this.completedChunks.length &&
      this.completedChunks[this.nextChunkToStream] !== null
    ) {
      const chunkData = this.completedChunks[this.nextChunkToStream]!;

      console.log('[DOWNLOAD-MULTIPART] Streaming chunk', this.nextChunkToStream);

      for (const data of chunkData) {
        controller.enqueue(data);
      }

      this.completedChunks[this.nextChunkToStream] = null;
      this.nextChunkToStream++;
    }
  }

  private streamRemainingChunks(controller: ReadableStreamDefaultController<Uint8Array>, totalTasks: number): void {
    if (this.completedChunksDownloadedCount === totalTasks && this.nextChunkToStream < totalTasks) {
      console.warn('[DOWNLOAD-MULTIPART] Streaming remaining chunks before closing');
      this.streamOrderedChunks(controller);
    }
  }

  private async downloadChunk(
    bucketId: string,
    fileId: string,
    mnemonic: string,
    chunkStart: number,
    chunkEnd: number,
    options?: DownloadOptions,
  ): Promise<Uint8Array[]> {
    const chunkStream = await this.network.downloadChunk({
      bucketId,
      fileId,
      mnemonic,
      chunkStart,
      chunkEnd,
      options,
    });

    const chunks: Uint8Array[] = [];

    for await (const chunk of this.readableStreamToAsyncIterator(chunkStream)) {
      chunks.push(chunk);
    }

    return chunks;
  }

  private async executeTask(params: {
    task: DownloadChunkTask;
    bucketId: string;
    fileId: string;
    mnemonic: string;
    fileSize: number;
    controller: ReadableStreamDefaultController<Uint8Array>;
    options?: DownloadOptions;
  }): Promise<void> {
    const { task, bucketId, fileId, mnemonic, fileSize, controller, options } = params;

    try {
      const chunkData = await this.downloadChunk(bucketId, fileId, mnemonic, task.chunkStart, task.chunkEnd, options);

      console.log('[DOWNLOAD-MULTIPART] Downloaded chunk', task.index);

      this.registerCompletedChunk(task.index, chunkData);

      options?.downloadingCallback?.(fileSize, this.downloadedBytes);

      this.streamOrderedChunks(controller);
    } catch (error) {
      this.handleDownloadError({
        task,
        error: error as Error,
        controller,
        options,
      });
    }
  }

  private handleDownloadError(params: {
    task: DownloadChunkTask;
    error: Error;
    controller: ReadableStreamDefaultController<Uint8Array>;
    options?: DownloadOptions;
  }): void {
    const { task, error, controller, options } = params;

    console.log(
      `[DOWNLOAD-MULTIPART] Download error for task: ${task.index} with chunk start: ${task.chunkStart}`,
      error.message,
    );

    this.revertPartialDownload(task.index);

    if (task.attempt >= task.maxRetries) {
      const finalError = new MaxRetriesExceededError(task.maxRetries, error.message);
      options?.abortController?.abort();
      this.downloadQueue?.kill();
      controller.error(finalError);
      return;
    }

    task.attempt++;
    this.downloadQueue?.unshift(task);
  }

  private async *readableStreamToAsyncIterator<T>(stream: ReadableStream<T>): AsyncGenerator<T> {
    const reader = stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) return;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  }
}
