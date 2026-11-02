export enum RetryableTaskType {
  Download = 'download',
}

export enum RetryableTaskStatus {
  Pending = 'pending',
  Failed = 'failed',
  Retrying = 'retrying',
}

export type RetryableTask = {
  taskId: string;
  type: RetryableTaskType;
  params: any;
  status?: RetryableTaskStatus;
  retryable?: boolean;
};

type ParamsFilter = { [attribute: string]: unknown };

const matchesTask = (task: RetryableTask, taskId: string, where: ParamsFilter = {}): boolean =>
  task.taskId === taskId && Object.entries(where).every(([key, value]) => task.params?.[key] === value);

class RetryManager {
  private tasksToRetry: RetryableTask[] = [];
  private listeners: (() => void)[] = [];

  /**
   * Adds tasks to the retry list, marking them as failed.
   * A task can only appear once per taskId: re-adding a failed task
   * replaces its entry instead of duplicating it in the retry list.
   */
  addTasks(tasks: RetryableTask[]) {
    const incomingTaskIds = new Set(tasks.map((task) => task.taskId));
    this.tasksToRetry = this.tasksToRetry.filter((task) => !incomingTaskIds.has(task.taskId));
    this.tasksToRetry.push(...tasks.map((task) => ({ ...task, status: RetryableTaskStatus.Failed })));
    this.notify();
  }

  changeStatus(taskId: string, status: RetryableTaskStatus, where?: ParamsFilter) {
    this.tasksToRetry = this.tasksToRetry.map((task) =>
      matchesTask(task, taskId, where) ? { ...task, status } : task,
    );
    this.notify();
  }

  removeTaskByIdAndParams(taskId: string, where: ParamsFilter) {
    this.tasksToRetry = this.tasksToRetry.filter((task) => !matchesTask(task, taskId, where));

    this.notify();
  }

  clearTasks() {
    this.tasksToRetry = [];
    this.notify();
  }

  getTasks() {
    return this.tasksToRetry;
  }

  getTasksById(id: string) {
    return this.tasksToRetry.filter((task) => task.taskId === id);
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
