export type RetryableTask = {
  taskId: string;
  type: 'upload' | 'download';
  params: any;
  status?: 'pending' | 'failed' | 'retrying';
};

class RetryManager {
  private tasksToRetry: RetryableTask[] = [];
  private listeners: (() => void)[] = [];

  addTask(task: RetryableTask) {
    this.tasksToRetry.push({ ...task, status: 'failed' });
    this.notify();
  }

  addTasks(tasks: RetryableTask[]) {
    const tasksWithStatus = tasks.map((task) => ({ ...task, status: 'failed' }) as RetryableTask);
    this.tasksToRetry.push(...tasksWithStatus);
    this.notify();
  }

  changeStatus(taskId: string, status: 'pending' | 'failed' | 'retrying') {
    this.tasksToRetry = this.tasksToRetry.map((task) => (task.taskId === taskId ? { ...task, status } : task));
    this.notify();
  }

  removeTask(taskId: string) {
    this.tasksToRetry = this.tasksToRetry.filter((task) => task.taskId !== taskId);
    this.notify();
  }

  removeTaskByIdAndParams(taskId: string, where: { [attribute: string]: any }) {
    this.tasksToRetry = this.tasksToRetry.filter((task) => {
      const idMatches = task.taskId === taskId;

      const attributesMatch = Object.entries(where).every(([key, value]) => task.params[key] === value);

      return !(idMatches && attributesMatch);
    });

    this.notify();
  }

  clearTasks() {
    this.tasksToRetry = [];
    this.notify();
  }

  getTasks(type?: 'upload' | 'download') {
    return type ? this.tasksToRetry.filter((task) => task.type === type) : this.tasksToRetry;
  }

  getTasksById(id: string) {
    return this.tasksToRetry.filter((task) => task.taskId === id);
  }

  isRetryingTask(taskId: string): boolean {
    return this.tasksToRetry.some((task) => task.taskId === taskId);
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
  }

  unsubscribe(listener: () => void) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

const retryManager = new RetryManager();
export default retryManager;
