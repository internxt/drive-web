import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetryableTask } from './RetryManager';
import RetryManager from './RetryManager';

describe('RetryManager', () => {
  const sampleTask: RetryableTask = { taskId: 'task1', type: 'upload', params: {} };
  const anotherTask: RetryableTask = { taskId: 'task2', type: 'download', params: {} };

  beforeEach(() => {
    RetryManager.clearTasks();
  });

  it('should add a task with failed status', () => {
    RetryManager.addTask(sampleTask);
    const tasks = RetryManager.getTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toEqual({ ...sampleTask, status: 'failed' });
  });

  it('should add multiple tasks with failed status', () => {
    RetryManager.addTasks([sampleTask, anotherTask]);
    const tasks = RetryManager.getTasks();
    expect(tasks).toHaveLength(2);
    expect(tasks).toContainEqual({ ...sampleTask, status: 'failed' });
    expect(tasks).toContainEqual({ ...anotherTask, status: 'failed' });
  });

  it('should change the status of a task', () => {
    RetryManager.addTask(sampleTask);
    RetryManager.changeStatus('task1', 'retrying');
    const tasks = RetryManager.getTasks();
    expect(tasks[0].status).toBe('retrying');
  });

  it('should not change status if taskId does not exist', () => {
    RetryManager.addTask(sampleTask);
    RetryManager.changeStatus('invalidTask', 'retrying');
    const tasks = RetryManager.getTasks();
    expect(tasks[0].status).toBe('failed');
  });

  it('should remove a task by taskId', () => {
    RetryManager.addTasks([sampleTask, anotherTask]);
    RetryManager.removeTask('task1');
    const tasks = RetryManager.getTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].taskId).toBe('task2');
  });

  it('should clear all tasks', () => {
    RetryManager.addTasks([sampleTask, anotherTask]);
    RetryManager.clearTasks();
    const tasks = RetryManager.getTasks();
    expect(tasks).toHaveLength(0);
  });

  it('should return true if a task is being retried', () => {
    RetryManager.addTask(sampleTask);
    expect(RetryManager.isRetryingTask('task1')).toBe(true);
  });

  it('should return false if a task is not being retried', () => {
    RetryManager.addTask(sampleTask);
    expect(RetryManager.isRetryingTask('nonExistentTask')).toBe(false);
  });

  it('should notify listeners on state change', () => {
    const listener = vi.fn();
    RetryManager.subscribe(listener);
    RetryManager.addTask(sampleTask);
    expect(listener).toHaveBeenCalledTimes(1);

    RetryManager.changeStatus('task1', 'retrying');
    expect(listener).toHaveBeenCalledTimes(2);

    RetryManager.removeTask('task1');
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('should unsubscribe listeners correctly', () => {
    const listener = vi.fn();
    RetryManager.subscribe(listener);
    RetryManager.unsubscribe(listener);
    RetryManager.addTask(sampleTask);
    expect(listener).not.toHaveBeenCalled();
  });

  it('should handle multiple listeners', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    RetryManager.subscribe(listener1);
    RetryManager.subscribe(listener2);

    RetryManager.addTask(sampleTask);
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);

    RetryManager.unsubscribe(listener1);
    RetryManager.addTask(anotherTask);
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(2);
  });
});
