export const createUploadWebWorker = (): Worker => {
  return new Worker(new URL('./upload.worker', import.meta.url), { type: 'module' });
};

export const createDownloadWebWorker = (): Worker => {
  return new Worker(new URL('./download.worker', import.meta.url), { type: 'module' });
};
