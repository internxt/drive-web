type MessageWorkerResult = 'chunk' | 'blob' | 'abort' | 'progress' | 'error' | 'success';

export interface MessageData {
  result: MessageWorkerResult;
  readableStream: ReadableStream<Uint8Array>;
  blob: Blob;
  progress?: number;
  fileId?: string;
  error?: unknown;
  chunk?: Uint8Array;
}
