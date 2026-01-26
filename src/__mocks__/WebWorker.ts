export class MockWorker implements Partial<Worker> {
  private listeners: Record<string, ((event: any) => void)[]> = {};
  public messagesSent: any[] = [];
  public terminated = false;

  addEventListener(type: string, callback: (event: any) => void) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(callback);
  }

  removeEventListener(type: string, callback: (event: any) => void) {
    this.listeners[type] = (this.listeners[type] || []).filter((cb) => cb !== callback);
  }

  postMessage(message: any) {
    this.messagesSent.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  emitMessage(dataEvent: any) {
    const event = { data: { ...dataEvent } };
    (this.listeners['message'] || []).forEach((cb) => cb(event));
  }

  emitError(error: any) {
    (this.listeners['error'] || []).forEach((cb) => cb(error));
  }
}
