export class PcCloudError extends Error {
  constructor(message?: string) {
    super(message ?? 'An error occurred while processing your payment');
    this.name = 'PcCloudError';
  }
}
