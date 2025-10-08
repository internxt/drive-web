type MessageWorkerResult = 'chunk' | 'blob' | 'abort' | 'progress' | 'error' | 'success';

export interface MessageData {
  result: MessageWorkerResult;
  readableStream: ReadableStream<Uint8Array<ArrayBufferLike>>;
  blob: Blob;
  progress?: number;
  fileId?: string;
  error?: string;
  chunk?: Uint8Array<ArrayBufferLike>;
}
