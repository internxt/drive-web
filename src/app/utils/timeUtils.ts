export const wait = (ms: number): Promise<void> => {
  if (isNaN(ms) || ms < 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
};
