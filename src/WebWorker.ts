export const createWebWorker = (worker) => {
  const code = worker.toString();
  const blob = new Blob(['(' + code + ')()'], { type: 'application/javascript' });
  return new Worker(new URL(URL.createObjectURL(blob), import.meta.url), { type: 'module' });
};
