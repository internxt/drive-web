import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadManagerFileParams } from 'app/network/UploadManager';
import RetryManager from './RetryManager';

describe('FileRetryManager', () => {
  const sampleFile: UploadManagerFileParams = { taskId: 'task1' } as UploadManagerFileParams;
  const anotherFile: UploadManagerFileParams = { taskId: 'task2' } as UploadManagerFileParams;

  beforeEach(() => {
    RetryManager.clearFiles();
  });

  it('should add a file with failed status', () => {
    RetryManager.addFile(sampleFile);
    const files = RetryManager.getFiles();
    expect(files).toHaveLength(1);
    expect(files[0]).toEqual({ params: sampleFile, status: 'failed' });
  });

  it('should add multiple files with failed status', () => {
    RetryManager.addFiles([sampleFile, anotherFile]);
    const files = RetryManager.getFiles();
    expect(files).toHaveLength(2);
    expect(files).toContainEqual({ params: sampleFile, status: 'failed' });
    expect(files).toContainEqual({ params: anotherFile, status: 'failed' });
  });

  it('should change the status of a file', () => {
    RetryManager.addFile(sampleFile);
    RetryManager.changeStatus('task1', 'uploading');
    const files = RetryManager.getFiles();
    expect(files[0].status).toBe('uploading');
  });

  it('should not change status if taskId does not exist', () => {
    RetryManager.addFile(sampleFile);
    RetryManager.changeStatus('invalidTask', 'uploading');
    const files = RetryManager.getFiles();
    expect(files[0].status).toBe('failed');
  });

  it('should remove a file by taskId', () => {
    RetryManager.addFiles([sampleFile, anotherFile]);
    RetryManager.removeFile('task1');
    const files = RetryManager.getFiles();
    expect(files).toHaveLength(1);
    expect(files[0].params.taskId).toBe('task2');
  });

  it('should clear all files', () => {
    RetryManager.addFiles([sampleFile, anotherFile]);
    RetryManager.clearFiles();
    const files = RetryManager.getFiles();
    expect(files).toHaveLength(0);
  });

  it('should return true if a file is being retried', () => {
    RetryManager.addFile(sampleFile);
    expect(RetryManager.isRetryingFile('task1')).toBe(true);
  });

  it('should return false if a file is not being retried', () => {
    RetryManager.addFile(sampleFile);
    expect(RetryManager.isRetryingFile('nonExistentTask')).toBe(false);
  });

  it('should notify listeners on state change', () => {
    const listener = vi.fn();
    RetryManager.subscribe(listener);
    RetryManager.addFile(sampleFile);
    expect(listener).toHaveBeenCalledTimes(1);

    RetryManager.changeStatus('task1', 'uploading');
    expect(listener).toHaveBeenCalledTimes(2);

    RetryManager.removeFile('task1');
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('should unsubscribe listeners correctly', () => {
    const listener = vi.fn();
    RetryManager.subscribe(listener);
    RetryManager.unsubscribe(listener);
    RetryManager.addFile(sampleFile);
    expect(listener).not.toHaveBeenCalled();
  });

  it('should handle multiple listeners', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    RetryManager.subscribe(listener1);
    RetryManager.subscribe(listener2);

    RetryManager.addFile(sampleFile);
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);

    RetryManager.unsubscribe(listener1);
    RetryManager.addFile(anotherFile);
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(2);
  });
});
