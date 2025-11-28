const pollingService = {
  create(fn: () => void, period: number): NodeJS.Timeout {
    return setInterval(fn, period);
  },
  destroy(interval: NodeJS.Timeout): void {
    clearInterval(interval);
  },
};

export default pollingService;
