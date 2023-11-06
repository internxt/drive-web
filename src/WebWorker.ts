export const createUploadWebWorker = (): Worker => {
  return new Worker(new URL('./upload.worker', import.meta.url), { type: 'module' });
};
