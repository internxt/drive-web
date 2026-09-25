export const createUploadWebWorker = (): Worker => {
  return new Worker(new URL('./upload.worker', import.meta.url), { type: 'module' });
};

export const createDownloadWebWorker = (): Worker => {
  return new Worker(new URL('./download.worker', import.meta.url), { type: 'module' });
};

export const createImagePreviewWebWorker = (): Worker => {
  return new Worker(new URL('./app/drive/services/image-preview.service/imagePreview.worker', import.meta.url), {
    type: 'module',
  });
};
