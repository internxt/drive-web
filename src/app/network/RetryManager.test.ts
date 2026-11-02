import { describe, it, test, expect, vi, beforeEach } from 'vitest';
import RetryManager, { RetryableTask, RetryableTaskStatus, RetryableTaskType } from './RetryManager';

describe('RetryManager', () => {
  const sampleTask: RetryableTask = { taskId: 'task1', type: RetryableTaskType.Download, params: {} };
  const anotherTask: RetryableTask = { taskId: 'task2', type: RetryableTaskType.Download, params: {} };

  beforeEach(() => {
    RetryManager.clearTasks();
  });

  it('should add multiple tasks with failed status', () => {
    RetryManager.addTasks([sampleTask, anotherTask]);
    const tasks = RetryManager.getTasks();
    expect(tasks).toHaveLength(2);
    expect(tasks).toContainEqual({ ...sampleTask, status: RetryableTaskStatus.Failed });
    expect(tasks).toContainEqual({ ...anotherTask, status: RetryableTaskStatus.Failed });
  });

  it('should replace an existing task instead of duplicating it when re-added', () => {
    RetryManager.addTasks([sampleTask, anotherTask]);
    RetryManager.addTasks([{ ...sampleTask, retryable: false }]);
    const tasks = RetryManager.getTasks();
    expect(tasks).toHaveLength(2);
    expect(tasks.filter((task) => task.taskId === 'task1')).toEqual([
      { ...sampleTask, retryable: false, status: RetryableTaskStatus.Failed },
    ]);
  });

  it('should change the status of a task', () => {
    RetryManager.addTasks([sampleTask]);
    RetryManager.changeStatus('task1', RetryableTaskStatus.Retrying);
    const tasks = RetryManager.getTasks();
    expect(tasks[0].status).toBe(RetryableTaskStatus.Retrying);
  });

  it('should not change status if taskId does not exist', () => {
    RetryManager.addTasks([sampleTask]);
    RetryManager.changeStatus('invalidTask', RetryableTaskStatus.Retrying);
    const tasks = RetryManager.getTasks();
    expect(tasks[0].status).toBe(RetryableTaskStatus.Failed);
  });

  const addTwoDownloadsSharingTaskId = (): void =>
    RetryManager.addTasks([
      { taskId: 'download-1', params: { id: 'a' }, type: RetryableTaskType.Download },
      { taskId: 'download-1', params: { id: 'b' }, type: RetryableTaskType.Download },
    ]);

  const getDownloadStatuses = (): (RetryableTaskStatus | undefined)[] =>
    RetryManager.getTasksById('download-1').map((task) => task.status);

  test('when one of two downloads sharing a task id is retried, then only that one is Retrying', () => {
    addTwoDownloadsSharingTaskId();

    RetryManager.changeStatus('download-1', RetryableTaskStatus.Retrying, { id: 'a' });

    expect(getDownloadStatuses()).toEqual([RetryableTaskStatus.Retrying, RetryableTaskStatus.Failed]);
  });

  test('when the status changes without params to match, then every task with that task id changes', () => {
    addTwoDownloadsSharingTaskId();

    RetryManager.changeStatus('download-1', RetryableTaskStatus.Retrying);

    expect(getDownloadStatuses()).toEqual([RetryableTaskStatus.Retrying, RetryableTaskStatus.Retrying]);
  });

  it('should clear all tasks', () => {
    RetryManager.addTasks([sampleTask, anotherTask]);
    RetryManager.clearTasks();
    const tasks = RetryManager.getTasks();
    expect(tasks).toHaveLength(0);
  });

  it('should notify listeners on state change', () => {
    const listener = vi.fn();
    RetryManager.subscribe(listener);
    RetryManager.addTasks([sampleTask]);
    expect(listener).toHaveBeenCalledTimes(1);

    RetryManager.changeStatus('task1', RetryableTaskStatus.Retrying);
    expect(listener).toHaveBeenCalledTimes(2);

    RetryManager.clearTasks();
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('should unsubscribe listeners correctly', () => {
    const listener = vi.fn();
    RetryManager.subscribe(listener);
    RetryManager.unsubscribe(listener);
    RetryManager.addTasks([sampleTask]);
    expect(listener).not.toHaveBeenCalled();
  });

  it('should handle multiple listeners', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    RetryManager.subscribe(listener1);
    RetryManager.subscribe(listener2);

    RetryManager.addTasks([sampleTask]);
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);

    RetryManager.unsubscribe(listener1);
    RetryManager.addTasks([anotherTask]);
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(2);
  });
});
