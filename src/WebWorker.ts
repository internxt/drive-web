export const createWebWorker = (worker) => {
  const code = worker.toString();
  const blob = new Blob(['(' + code + ')()'], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob), { type: 'module' });
};
